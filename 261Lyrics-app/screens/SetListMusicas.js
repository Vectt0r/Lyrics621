import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {MaterialIcons} from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme';
import { useAppAlert } from '../components/AppAlert';

const formatMusicCount = (n) => `${n} música${n === 1 ? '' : 's'}`;

export default function SetListMusicas({ route, navigation }) {
    const showAlert = useAppAlert();
    const { setList } = route.params;

    const [modalVisible, setModalVisible] = useState(false);
    const [musicas, setMusicas] = useState(setList.musicas || []);
    const [musicasSalvas, setMusicasSalvas] = useState([]);
    const [buscaMusica, setBuscaMusica] = useState('');
    const [selecionadas, setSelecionadas] = useState([]);
    const [todosSetLists, setTodosSetLists] = useState([]);
    const [indiceSelecionado, setIndiceSelecionado] = useState(null);

    // Carrega todos os setlists do AsyncStorage
    const carregarSetLists = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('@setlists');
            const dados = jsonValue != null ? JSON.parse(jsonValue) : [];
            setTodosSetLists(dados);

            // Atualiza o setList atual, caso esteja salvo
            const atual = dados.find(s => s.id === setList.id);
            if (atual) setMusicas(atual.musicas || []);
        } catch (e) {
            console.error('Erro ao carregar setlists', e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            carregarSetLists();
        }, [])
    );

    // Carrega arquivos .txt da pasta do app, exceto as que já estão neste SetList
    const carregarMusicasSalvas = async () => {
        try {
            const lista = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const arquivosTxt = lista.filter(nome => nome.endsWith('.txt'));
            const nomesSemExt = arquivosTxt.map(nome => nome.replace('.txt', ''));
            const jaNoSetList = new Set(musicas.map(m => m.name));
            setMusicasSalvas(nomesSemExt.filter(nome => !jaNoSetList.has(nome)));
            setSelecionadas([]);
            setBuscaMusica('');
        } catch (e) {
            console.error('Erro ao listar arquivos:', e);
        }
    };

    // Salvar todos os setlists no AsyncStorage
    const salvarSetLists = async (novosSetLists) => {
        try {
            await AsyncStorage.setItem('@setlists', JSON.stringify(novosSetLists));
            setTodosSetLists(novosSetLists);
        } catch (e) {
            console.error('Erro ao salvar setlists', e);
        }
    };

    // Atualiza o setList atual e salva
    const atualizarSetList = (novasMusicas) => {
        const novosSetLists = todosSetLists.map(s =>
            s.id === setList.id ? { ...s, musicas: novasMusicas } : s
        );
        setMusicas(novasMusicas);
        salvarSetLists(novosSetLists);
    };

    const abrirModal = () => {
        carregarMusicasSalvas();
        setModalVisible(true);
    };

    const toggleSelecionada = (nome) => {
        if (selecionadas.includes(nome)) {
            setSelecionadas(selecionadas.filter(m => m !== nome));
        } else {
            setSelecionadas([...selecionadas, nome]);
        }
    };

    const handleSalvarSelecionadas = () => {
        if (selecionadas.length === 0) {
            showAlert('Atenção', 'Selecione ao menos uma música para adicionar.');
            return;
        }

        const novasMusicas = [
            ...musicas,
            ...selecionadas
                .filter(m => !musicas.some(musica => musica.name === m))
                .map(m => ({ name: m })),
        ];

        atualizarSetList(novasMusicas);
        setModalVisible(false);
    };

    const handleDeleteMusica = (index) => {
        showAlert(
            'Excluir música',
            `Tem certeza que deseja excluir "${musicas[index]?.name}" deste SetList?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        const novasMusicas = musicas.filter((_, i) => i !== index);
                        atualizarSetList(novasMusicas);
                        if (indiceSelecionado === index) setIndiceSelecionado(null);
                    },
                },
            ],
            { cancelable: true }
        );
    };

    // Troca posições na lista
    const trocarPosicoes = (i1, i2) => {
        const novaLista = [...musicas];
        const temp = novaLista[i1];
        novaLista[i1] = novaLista[i2];
        novaLista[i2] = temp;
        atualizarSetList(novaLista);
    };

    // Long press para selecionar ou trocar itens
    const onLongPressMusica = (index) => {
        if (indiceSelecionado === null) {
            // Seleciona primeiro item para troca
            setIndiceSelecionado(index);
        } else if (indiceSelecionado === index) {
            // Clicou longo no mesmo item -> cancela seleção
            setIndiceSelecionado(null);
        } else {
            // Segundo item selecionado, troca e limpa seleção
            trocarPosicoes(indiceSelecionado, index);
            setIndiceSelecionado(null);
        }
    };

    // Press curto: navega se não houver item selecionado para troca
    const onPressMusica = (index) => {
        if (indiceSelecionado === null) {
            navigation.navigate('SetListLyricsScreen', {
                musicas,
                indexAtual: index,
            });
        } else {
            // Se estiver com seleção ativa, ignorar o clique curto para evitar navegação
        }
    };

    const musicasSalvasFiltradas = musicasSalvas.filter(nome =>
        nome.toLowerCase().includes(buscaMusica.trim().toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tituloRow}>
                <Text style={styles.titulo} numberOfLines={1}>{setList.name}</Text>
                <Text style={styles.tituloMusicCount}>{formatMusicCount(musicas.length)}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {musicas.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="queue-music" size={40} color={colors.placeholder} />
                        <Text style={styles.semResultados}>Nenhuma música nesse SetList ainda.</Text>
                    </View>
                ) : (
                    musicas.map((item, index) => {
                        const selecionado = index === indiceSelecionado;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.resultItem,
                                    selecionado && { backgroundColor: colors.primary },
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => onPressMusica(index)}
                                    onLongPress={() => onLongPressMusica(index)}
                                    delayLongPress={250}
                                    style={{ flex: 1 }}
                                >
                                    <Text style={styles.songTitle}>{item.name}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteMusica(index)}
                                >
                                    <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={abrirModal}>
                <MaterialIcons name="add" size={20} color={colors.background} />
                <Text style={styles.addButtonText}>Adicionar Música</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons name="library-music" size={22} color={colors.primary} />
                            <Text style={styles.modalTitle}>Selecione as Músicas</Text>
                        </View>
                        <View style={styles.buscaWrapper}>
                            <MaterialIcons name="search" size={20} color={colors.placeholder} style={styles.buscaIcon} />
                            <TextInput
                                style={styles.buscaInput}
                                placeholder="Buscar música"
                                placeholderTextColor={colors.placeholder}
                                value={buscaMusica}
                                onChangeText={setBuscaMusica}
                            />
                        </View>
                        <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
                            {musicasSalvasFiltradas.length === 0 ? (
                                <Text style={styles.semResultadosModal}>
                                    {musicasSalvas.length === 0
                                        ? 'Nenhuma música salva encontrada.'
                                        : 'Nenhuma música encontrada para essa busca.'}
                                </Text>
                            ) : (
                                musicasSalvasFiltradas.map((nome, i) => {
                                    const isChecked = selecionadas.includes(nome);
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            onPress={() => toggleSelecionada(nome)}
                                            style={styles.checkboxContainer}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    isChecked && styles.checkboxChecked,
                                                ]}
                                            >
                                                {isChecked && (
                                                    <MaterialIcons name="check" size={16} color={colors.background} />
                                                )}
                                            </View>
                                            <Text style={styles.checkboxLabel}>{nome}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                activeOpacity={0.8}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                activeOpacity={0.8}
                                onPress={handleSalvarSelecionadas}
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
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    tituloRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xxl,
        marginBottom: spacing.sm,
    },
    titulo: { fontSize: 25, color: colors.text, fontWeight: 'bold', flexShrink: 1 },
    tituloMusicCount: { color: colors.placeholder, fontSize: 14, marginLeft: spacing.sm },
    emptyState: { alignItems: 'center', marginTop: spacing.xl },
    semResultados: { color: colors.placeholder, textAlign: 'center', marginTop: spacing.sm },
    resultItem: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    songTitle: { color: colors.text, fontSize: 16 },
    actionText: { color: colors.text, fontWeight: 'bold' },
    addButton: {
        backgroundColor: colors.primary,
        padding: 15,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    addButtonText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
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
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    buscaWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    buscaIcon: { marginRight: spacing.sm },
    buscaInput: {
        flex: 1,
        color: colors.text,
        paddingVertical: 10,
    },
    semResultadosModal: { color: colors.placeholder, textAlign: 'center', marginTop: 20 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: radius.sm / 2,
        marginRight: 12,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
    },
    checkboxLabel: { color: colors.text, fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    cancelButton: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: radius.sm,
        flex: 1,
        marginRight: 10,
    },
    deleteButton: {
        paddingHorizontal: 10,
    },
    saveButton: { backgroundColor: colors.primary, padding: 12, borderRadius: radius.sm, flex: 1 },
    buttonText: { color: colors.text, fontWeight: 'bold', textAlign: 'center' },
    saveButtonText: { color: colors.background, fontWeight: 'bold', textAlign: 'center' },
});