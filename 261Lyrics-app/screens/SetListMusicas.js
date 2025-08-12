import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export default function SetListMusicas({ route, navigation }) {
    const { setList } = route.params;

    const [modalVisible, setModalVisible] = useState(false);
    const [musicas, setMusicas] = useState(setList.musicas || []);
    const [musicasSalvas, setMusicasSalvas] = useState([]);
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

    useEffect(() => {
        carregarSetLists();
    }, []);

    // Carrega arquivos .txt da pasta do app
    const carregarMusicasSalvas = async () => {
        try {
            const lista = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const arquivosTxt = lista.filter(nome => nome.endsWith('.txt'));
            const nomesSemExt = arquivosTxt.map(nome => nome.replace('.txt', ''));
            setMusicasSalvas(nomesSemExt);
            setSelecionadas([]);
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
            Alert.alert('Nenhuma música selecionada');
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
        Alert.alert(
            'Excluir música',
            'Deseja excluir essa música?',
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

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>SetList - {setList.name}</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {musicas.map((item, index) => {
                    const selecionado = index === indiceSelecionado;
                    return (
                        <View
                            key={index}
                            style={[
                                styles.resultItem,
                                selecionado && { backgroundColor: '#1DB954' },
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
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteMusica(index)}
                            >
                                <Text style={styles.actionText}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={abrirModal}>
                <Text style={styles.addButtonText}>Adicionar Música</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Selecione as Músicas</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {musicasSalvas.length === 0 ? (
                                <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                                    Nenhuma música salva encontrada.
                                </Text>
                            ) : (
                                musicasSalvas.map((nome, i) => {
                                    const isChecked = selecionadas.includes(nome);
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            onPress={() => toggleSelecionada(nome)}
                                            style={styles.checkboxContainer}
                                        >
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    { backgroundColor: isChecked ? '#1DB954' : '#333' },
                                                ]}
                                            />
                                            <Text style={styles.checkboxLabel}>{nome}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSalvarSelecionadas}
                            >
                                <Text style={styles.buttonText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212', padding: 20 },
    titulo: { fontSize: 25, color: '#fff', marginTop: 60, marginBottom: 5, fontWeight: 'bold' },
    resultItem: {
        backgroundColor: '#1e1e1e',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    songTitle: { color: '#fff', fontSize: 16 },
    deleteBtn: {
        backgroundColor: '#dc3545',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    actionText: { color: '#fff', fontWeight: 'bold' },
    addButton: {
        backgroundColor: '#1DB954',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        elevation: 5,
    },
    addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#222',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#1DB954',
    },
    checkboxLabel: { color: '#fff', fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    cancelButton: {
        backgroundColor: '#555',
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginRight: 10,
    },
    saveButton: { backgroundColor: '#1DB954', padding: 10, borderRadius: 6, flex: 1 },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});