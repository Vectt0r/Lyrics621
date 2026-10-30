import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { useAppAlert } from '../components/AppAlert';

const CHAVE_PASTA_BACKUP = '@backup_folder_uri';

export default function MusicScreen() {
    const showAlert = useAppAlert();
    const [arquivos, setArquivos] = useState([]);
    const [busca, setBusca] = useState('');
    const [processando, setProcessando] = useState(false);
    const [pastaBackupUri, setPastaBackupUri] = useState(null);
    const [modalRestaurarVisible, setModalRestaurarVisible] = useState(false);
    const [backupsDisponiveis, setBackupsDisponiveis] = useState([]);
    const [modalNomeBackupVisible, setModalNomeBackupVisible] = useState(false);
    const [nomeBackupInput, setNomeBackupInput] = useState('');
    const [modalImportarVisible, setModalImportarVisible] = useState(false);
    const [tituloImportado, setTituloImportado] = useState('');
    const [arquivoImportadoUri, setArquivoImportadoUri] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        AsyncStorage.getItem(CHAVE_PASTA_BACKUP).then(uri => {
            if (uri) setPastaBackupUri(uri);
        });
    }, []);

    const carregarArquivos = async () => {
        try {
            const lista = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const arquivosTxt = lista.filter(nome => nome.endsWith('.txt'));

            setArquivos(arquivosTxt);
        } catch (err) {
            console.error('Erro ao listar arquivos:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            carregarArquivos();
        }, [])
    );

    const abrirLetra = (nomeArquivo) => {
        navigation.navigate('Letra', { nomeArquivo });
    };

    const confirmarExcluir = (nomeArquivo) => {
        showAlert(
            'Excluir música',
            `Tem certeza que deseja excluir "${nomeArquivo.replace('.txt', '')}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => excluirArquivo(nomeArquivo) }
            ],
            { cancelable: true }
        );
    };

    const excluirArquivo = async (nomeArquivo) => {
        try {
            const caminho = FileSystem.documentDirectory + nomeArquivo;
            await FileSystem.deleteAsync(caminho);

            // Remove a música de todos os SetLists que a contêm — senão ela
            // continuaria aparecendo lá mesmo depois de apagada daqui.
            const nome = nomeArquivo.replace('.txt', '');
            const setlistsJson = await AsyncStorage.getItem('@setlists');
            if (setlistsJson != null) {
                const setlists = JSON.parse(setlistsJson);
                const setlistsAtualizados = setlists.map(s => ({
                    ...s,
                    musicas: (s.musicas || []).filter(m => m.name !== nome),
                }));
                await AsyncStorage.setItem('@setlists', JSON.stringify(setlistsAtualizados));
            }

            carregarArquivos();
        } catch (err) {
            console.error('Erro ao excluir arquivo:', err);
        }
    };

    const arquivosFiltrados = arquivos.filter(nome =>
        nome.toLowerCase().includes(busca.trim().toLowerCase())
    );

    // Abre o seletor de arquivos pra importar uma letra de um .txt já
    // existente no aparelho (ex: recebido por WhatsApp ou baixado manualmente).
    const escolherArquivoImportar = async () => {
        let resultado;
        try {
            resultado = await DocumentPicker.getDocumentAsync({
                type: ['text/plain', '*/*'],
                copyToCacheDirectory: true,
            });
        } catch (err) {
            console.error('Erro ao selecionar arquivo:', err);
            return;
        }
        if (resultado.canceled || !resultado.assets?.length) return;

        const arquivo = resultado.assets[0];
        setArquivoImportadoUri(arquivo.uri);
        // Sugere o título a partir do nome do arquivo escolhido, sem a extensão.
        setTituloImportado((arquivo.name || '').replace(/\.[^/.]+$/, ''));
        setModalImportarVisible(true);
    };

    // Salva o conteúdo do arquivo escolhido como uma nova música, usando o
    // título que o usuário confirmar (ou editar) na modal.
    const confirmarImportacao = async () => {
        const titulo = sanitizeNomeBackup(tituloImportado);
        if (!titulo) {
            showAlert('Atenção', 'Digite um título para a música.');
            return;
        }

        const nomeArquivo = `${titulo}.txt`;
        const caminho = FileSystem.documentDirectory + nomeArquivo;

        try {
            const info = await FileSystem.getInfoAsync(caminho);
            if (info.exists) {
                showAlert('Música já existe', `Já existe uma música salva com o título "${titulo}". Escolha outro título.`);
                return;
            }

            setModalImportarVisible(false);
            setProcessando(true);
            const conteudo = await FileSystem.readAsStringAsync(arquivoImportadoUri);
            await FileSystem.writeAsStringAsync(caminho, conteudo);
            await carregarArquivos();
            showAlert('Música importada', `"${titulo}" foi salva com sucesso.`);
        } catch (err) {
            console.error('Erro ao importar música:', err);
            showAlert('Erro', 'Não foi possível importar esse arquivo.');
        } finally {
            setProcessando(false);
            setArquivoImportadoUri(null);
            setTituloImportado('');
        }
    };

    // Abre o seletor de pastas do Android e guarda a escolha, pra usar nos
    // próximos backups sem perguntar de novo (até uma reinstalação do app).
    const escolherPastaBackup = async () => {
        try {
            const permissao = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissao.granted) return null;
            await AsyncStorage.setItem(CHAVE_PASTA_BACKUP, permissao.directoryUri);
            setPastaBackupUri(permissao.directoryUri);
            return permissao.directoryUri;
        } catch (err) {
            console.error('Erro ao escolher pasta de backup:', err);
            showAlert('Erro', 'Não foi possível selecionar a pasta.');
            return null;
        }
    };

    const sanitizeNomeBackup = (texto) => (texto || '').trim().replace(/[\\/:*?"<>|]/g, '-');

    // Confirmação padrão para trocar a pasta usada no backup/restauração.
    const confirmarTrocaPastaBackup = () => {
        showAlert(
            'Pasta de backup e restauração',
            'Escolher uma pasta diferente para salvar e buscar backups?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Escolher pasta', onPress: escolherPastaBackup },
            ]
        );
    };

    // Abre a modal pra o usuário dar um nome (opcional) ao backup antes de salvar.
    const fazerBackup = async () => {
        let pasta = pastaBackupUri;
        if (!pasta) {
            pasta = await escolherPastaBackup();
            if (!pasta) return; // usuário cancelou a escolha da pasta
        }
        setNomeBackupInput('');
        setModalNomeBackupVisible(true);
    };

    // Empacota todas as letras baixadas + os SetLists num único JSON e salva
    // na pasta escolhida pelo usuário, fora do sandbox do app — assim os
    // arquivos sobrevivem a uma reinstalação. O timestamp continua sendo a
    // parte que identifica o arquivo (garante nome único e a ordenação por
    // mais recente); o nome digitado pelo usuário é só um rótulo anexado.
    const confirmarBackup = async () => {
        setModalNomeBackupVisible(false);
        let pasta = pastaBackupUri;
        if (!pasta) {
            pasta = await escolherPastaBackup();
            if (!pasta) return;
        }

        const rotulo = sanitizeNomeBackup(nomeBackupInput);

        setProcessando(true);
        try {
            const lista = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const arquivosTxt = lista.filter(nome => nome.endsWith('.txt'));

            const musicas = {};
            for (const nome of arquivosTxt) {
                musicas[nome] = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + nome);
            }

            const setlistsJson = await AsyncStorage.getItem('@setlists');
            const setlists = setlistsJson != null ? JSON.parse(setlistsJson) : [];

            const backup = {
                app: '261Lyrics-app',
                versao: 1,
                criadoEm: new Date().toISOString(),
                musicas,
                setlists,
            };

            const nomeArquivo = rotulo
                ? `261lyrics-backup-${Date.now()}-${rotulo}.json`
                : `261lyrics-backup-${Date.now()}.json`;
            let arquivoUri;
            try {
                arquivoUri = await FileSystem.StorageAccessFramework.createFileAsync(pasta, nomeArquivo, 'application/json');
            } catch (err) {
                // A permissão da pasta pode ter sido revogada (ex: pasta apagada) — pede de novo.
                pasta = await escolherPastaBackup();
                if (!pasta) return;
                arquivoUri = await FileSystem.StorageAccessFramework.createFileAsync(pasta, nomeArquivo, 'application/json');
            }
            await FileSystem.writeAsStringAsync(arquivoUri, JSON.stringify(backup));

            showAlert('Backup salvo', `Arquivo "${nomeArquivo}" salvo na pasta escolhida.`);
        } catch (err) {
            console.error('Erro ao criar backup:', err);
            showAlert('Erro', 'Não foi possível criar o backup.');
        } finally {
            setProcessando(false);
        }
    };

    // Monta um nome amigável pro backup a partir do timestamp + rótulo opcional
    // embutidos no nome do arquivo (ex: "261lyrics-backup-123-Ensaio.json").
    const formatarNomeBackup = (nomeArquivo) => {
        const match = nomeArquivo.match(/^261lyrics-backup-(\d+)(?:-(.+))?\.json$/i);
        if (!match) return nomeArquivo;
        const [, timestampStr, rotulo] = match;
        const data = new Date(Number(timestampStr));
        const dataFormatada = isNaN(data.getTime())
            ? ''
            : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (rotulo && dataFormatada) return `${rotulo} (${dataFormatada})`;
        return rotulo || dataFormatada || nomeArquivo;
    };

    // Lista os arquivos .json de backup dentro de uma pasta SAF.
    const listarBackupsNaPasta = async (pasta) => {
        const arquivos = await FileSystem.StorageAccessFramework.readDirectoryAsync(pasta);
        return arquivos
            .map(uri => {
                const decodificado = decodeURIComponent(uri);
                const nome = decodificado.split('/').pop() || decodificado;
                return { uri, nome, nomeExibicao: formatarNomeBackup(nome) };
            })
            .filter(a => a.nome.toLowerCase().endsWith('.json'))
            .sort((a, b) => b.nome.localeCompare(a.nome)); // nome tem timestamp: mais recente primeiro
    };

    // Abre a lista de backups disponíveis na mesma pasta usada pelo Backup,
    // sem precisar escolher a pasta de novo toda vez.
    const restaurarBackup = async () => {
        let pasta = pastaBackupUri;
        if (!pasta) {
            pasta = await escolherPastaBackup();
            if (!pasta) return;
        }

        let backups;
        try {
            backups = await listarBackupsNaPasta(pasta);
        } catch (err) {
            console.error('Erro ao listar pasta de backup:', err);
            // Permissão pode ter sido revogada (ex: pasta apagada) — pede de novo.
            pasta = await escolherPastaBackup();
            if (!pasta) return;
            try {
                backups = await listarBackupsNaPasta(pasta);
            } catch (err2) {
                showAlert('Erro', 'Não foi possível acessar a pasta de backup.');
                return;
            }
        }

        if (backups.length === 0) {
            showAlert('Nenhum backup encontrado', 'Não há arquivos de backup (.json) na pasta escolhida.');
            return;
        }

        setBackupsDisponiveis(backups);
        setModalRestaurarVisible(true);
    };

    // Escolhe um arquivo de backup fora da pasta padrão (ex: recebido por WhatsApp).
    const escolherOutroArquivoBackup = async () => {
        setModalRestaurarVisible(false);
        let resultado;
        try {
            resultado = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });
        } catch (err) {
            console.error('Erro ao selecionar arquivo:', err);
            return;
        }
        if (resultado.canceled || !resultado.assets?.length) return;
        processarRestauracao(resultado.assets[0].uri);
    };

    // Lê um JSON de backup e mescla com o que já existe no app (nunca
    // sobrescreve músicas ou setlists já salvos, só completa o que falta).
    const processarRestauracao = async (uri) => {
        setModalRestaurarVisible(false);
        setProcessando(true);
        try {
            const conteudo = await FileSystem.readAsStringAsync(uri);
            const backup = JSON.parse(conteudo);

            if (!backup || typeof backup.musicas !== 'object') {
                showAlert('Erro', 'Esse arquivo não é um backup válido do 261Lyrics.');
                return;
            }

            const existentes = new Set(
                (await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)).filter(n => n.endsWith('.txt'))
            );
            let musicasRestauradas = 0;
            for (const [nome, texto] of Object.entries(backup.musicas)) {
                if (!existentes.has(nome)) {
                    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + nome, texto);
                    musicasRestauradas++;
                }
            }

            let setlistsNovos = 0;
            let setlistsAtualizados = 0;
            if (Array.isArray(backup.setlists)) {
                const atuaisJson = await AsyncStorage.getItem('@setlists');
                const atuais = atuaisJson != null ? JSON.parse(atuaisJson) : [];
                const porId = new Map(atuais.map(s => [s.id, s]));

                for (const setlistBackup of backup.setlists) {
                    const existente = porId.get(setlistBackup.id);
                    if (!existente) {
                        porId.set(setlistBackup.id, setlistBackup);
                        setlistsNovos++;
                        continue;
                    }
                    // SetList já existe (ex: restaurado vazio pelo backup automático
                    // do Android) — mescla as músicas em vez de pular.
                    const musicasExistentes = existente.musicas || [];
                    const nomesExistentes = new Set(musicasExistentes.map(m => m.name));
                    const musicasNovas = (setlistBackup.musicas || []).filter(m => !nomesExistentes.has(m.name));
                    if (musicasNovas.length > 0) {
                        existente.musicas = [...musicasExistentes, ...musicasNovas];
                        setlistsAtualizados++;
                    }
                }

                await AsyncStorage.setItem('@setlists', JSON.stringify(Array.from(porId.values())));
            }

            await carregarArquivos();
            showAlert(
                'Restauração concluída',
                `${musicasRestauradas} música(s), ${setlistsNovos} setlist(s) novo(s) e ` +
                `${setlistsAtualizados} setlist(s) com músicas restauradas.\n` +
                'Músicas e SetLists que já existiam não foram duplicados.'
            );
        } catch (err) {
            console.error('Erro ao restaurar backup:', err);
            showAlert('Erro', 'Não foi possível ler esse arquivo de backup.');
        } finally {
            setProcessando(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.titulo}>Músicas Salvas</Text>
                <View style={styles.headerActions}>
                    {processando ? (
                        <ActivityIndicator size="small" color={colors.primary} style={styles.headerIconBtn} />
                    ) : (
                        <>
                            <TouchableOpacity
                                onPress={fazerBackup}
                                onLongPress={confirmarTrocaPastaBackup}
                                style={styles.headerIconBtn}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="upload-file" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={restaurarBackup}
                                onLongPress={confirmarTrocaPastaBackup}
                                style={styles.headerIconBtn}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="file-download" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={escolherArquivoImportar}
                                style={styles.headerIconBtn}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="note-add" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
            <View style={styles.buscaWrapper}>
                <MaterialIcons name="search" size={20} color={colors.placeholder} style={styles.buscaIcon} />
                <TextInput
                    style={styles.busca}
                    placeholder="Buscar música salva"
                    placeholderTextColor={colors.placeholder}
                    value={busca}
                    onChangeText={setBusca}
                />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                {arquivosFiltrados.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="library-music" size={40} color={colors.placeholder} />
                        <Text style={styles.semResultados}>
                            {arquivos.length === 0
                                ? 'Nenhuma música salva ainda.'
                                : 'Nenhuma música encontrada para essa busca.'}
                        </Text>
                    </View>
                ) : (
                    arquivosFiltrados.map((nome, index) => (
                        <View key={index} style={styles.itemRow}>
                            <TouchableOpacity style={styles.item} activeOpacity={0.8} onPress={() => abrirLetra(nome)}>
                                <Text style={styles.nomeMusica}>{nome.replace('.txt', '')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmarExcluir(nome)} style={styles.deleteButton}>
                                <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal
                visible={modalRestaurarVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setModalRestaurarVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons name="file-download" size={22} color={colors.primary} />
                            <Text style={styles.modalTitle}>Escolher Backup</Text>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {backupsDisponiveis.map((item) => (
                                <TouchableOpacity
                                    key={item.uri}
                                    style={styles.backupItem}
                                    activeOpacity={0.8}
                                    onPress={() => processarRestauracao(item.uri)}
                                >
                                    <MaterialIcons name="description" size={20} color={colors.placeholder} />
                                    <Text style={styles.backupItemText} numberOfLines={1}>{item.nomeExibicao}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.outroArquivoBtn}
                            activeOpacity={0.8}
                            onPress={escolherOutroArquivoBackup}
                        >
                            <Text style={styles.outroArquivoText}>Selecionar outro arquivo...</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelarModalBtn}
                            activeOpacity={0.8}
                            onPress={() => setModalRestaurarVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={modalNomeBackupVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setModalNomeBackupVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons name="upload-file" size={22} color={colors.primary} />
                            <Text style={styles.modalTitle}>Novo Backup</Text>
                        </View>
                        <TextInput
                            style={styles.nomeInput}
                            placeholder="Nome do backup (opcional)"
                            placeholderTextColor={colors.placeholder}
                            value={nomeBackupInput}
                            onChangeText={setNomeBackupInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                activeOpacity={0.8}
                                onPress={() => setModalNomeBackupVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                activeOpacity={0.8}
                                onPress={confirmarBackup}
                            >
                                <Text style={styles.saveButtonText}>Salvar backup</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={modalImportarVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setModalImportarVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons name="note-add" size={22} color={colors.primary} />
                            <Text style={styles.modalTitle}>Importar Música</Text>
                        </View>
                        <TextInput
                            style={styles.nomeInput}
                            placeholder="Título da música"
                            placeholderTextColor={colors.placeholder}
                            value={tituloImportado}
                            onChangeText={setTituloImportado}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                activeOpacity={0.8}
                                onPress={() => setModalImportarVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                activeOpacity={0.8}
                                onPress={confirmarImportacao}
                            >
                                <Text style={styles.saveButtonText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xxl,
        marginBottom: spacing.md,
    },
    titulo: {
        fontSize: 25,
        color: colors.text,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconBtn: {
        marginLeft: spacing.md,
        padding: 4,
    },
    buscaWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    buscaIcon: {
        marginRight: spacing.sm,
    },
    busca: {
        flex: 1,
        color: colors.text,
        paddingVertical: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    item: {
        flex: 1,
    },
    nomeMusica: {
        color: colors.text,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    semResultados: {
        color: colors.placeholder,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    deleteButton: {
        paddingHorizontal: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.surfaceAlt,
        padding: spacing.lg,
        borderRadius: radius.lg,
        width: '90%',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.md,
    },
    modalTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    backupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backupItemText: {
        color: colors.text,
        fontSize: 15,
        flex: 1,
    },
    outroArquivoBtn: {
        marginTop: spacing.md,
        paddingVertical: 10,
        alignItems: 'center',
    },
    outroArquivoText: {
        color: colors.primary,
        fontWeight: '600',
    },
    cancelarModalBtn: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: radius.sm,
        marginTop: spacing.sm,
    },
    buttonText: {
        color: colors.text,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    nomeInput: {
        backgroundColor: colors.surface,
        color: colors.text,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        marginBottom: spacing.md,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: radius.sm,
        flex: 1,
        marginRight: 10,
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: radius.sm,
        flex: 1,
    },
    saveButtonText: {
        color: colors.background,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
