import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme';
import { useAppAlert } from '../components/AppAlert';

const formatMusicCount = (n) => `${n} música${n === 1 ? '' : 's'}`;

export default function SetListsScreen({ navigation }) {
    const showAlert = useAppAlert();
    const [modalVisible, setModalVisible] = useState(false);
    const [setListName, setSetListName] = useState('');
    const [editingSetList, setEditingSetList] = useState(null);
    const [setLists, setSetLists] = useState([]);

    // useFocusEffect (não useEffect com []) pra recarregar sempre que a aba
    // ganha foco — ex: depois de restaurar um backup em Músicas Salvas.
    useFocusEffect(
        useCallback(() => {
            loadSetLists();
        }, [])
    );

    const loadSetLists = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('@setlists');
            if (jsonValue != null) {
                setSetLists(JSON.parse(jsonValue));
            }
        } catch (e) {
            console.error('Erro ao carregar SetLists', e);
        }
    };

    const saveSetLists = async (newSetLists) => {
        try {
            await AsyncStorage.setItem('@setlists', JSON.stringify(newSetLists));
        } catch (e) {
            console.error('Erro ao salvar SetLists', e);
        }
    };

    const abrirModalCriar = () => {
        setEditingSetList(null);
        setSetListName('');
        setModalVisible(true);
    };

    const abrirModalEditar = (item) => {
        setEditingSetList(item);
        setSetListName(item.name);
        setModalVisible(true);
    };

    const fecharModal = () => {
        setModalVisible(false);
        setEditingSetList(null);
    };

    // Cria um novo SetList (musicas vazio) ou, se estiver editando, só
    // renomeia o SetList existente sem mexer nas músicas dele.
    const handleSave = () => {
        const nome = setListName.trim();
        if (!nome) return;

        let updatedSetLists;
        if (editingSetList) {
            updatedSetLists = setLists.map(s =>
                s.id === editingSetList.id ? { ...s, name: nome } : s
            );
        } else {
            const newSetList = { id: Date.now().toString(), name: nome, musicas: [] };
            updatedSetLists = [...setLists, newSetList];
        }

        setSetLists(updatedSetLists);
        saveSetLists(updatedSetLists);

        setSetListName('');
        setEditingSetList(null);
        setModalVisible(false);
    };

    const handleDelete = (setList) => {
        showAlert(
            'Excluir SetList',
            `Tem certeza que deseja excluir o SetList "${setList.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        const filtered = setLists.filter(item => item.id !== setList.id);
                        setSetLists(filtered);
                        saveSetLists(filtered);
                    }
                }
            ],
            { cancelable: true }
        );
    };

    // Passa o setList com musicas garantido
    const visualizarSetList = (item) => {
        const setListComMusicas = { ...item, musicas: item.musicas || [] };
        navigation.navigate('SetListMusicas', { setList: setListComMusicas });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.titulo}>SetLists Atuais</Text>

            <ScrollView
                style={styles.results}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {setLists.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="playlist-play" size={40} color={colors.placeholder} />
                        <Text style={styles.semResultados}>Nenhum SetList criado ainda.</Text>
                    </View>
                ) : (
                    setLists.map((item) => (
                        <View key={item.id} style={styles.resultItem}>
                            <View style={styles.setListHeaderRow}>
                                <View style={styles.setListNameRow}>
                                    <Text style={styles.songTitle} numberOfLines={1}>{item.name}</Text>
                                    <TouchableOpacity
                                        style={styles.editIconBtn}
                                        activeOpacity={0.7}
                                        onPress={() => abrirModalEditar(item)}
                                    >
                                        <MaterialIcons name="edit" size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.musicCount}>
                                    {formatMusicCount((item.musicas || []).length)}
                                </Text>
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.visualizarBtn}
                                    activeOpacity={0.8}
                                    onPress={() => visualizarSetList(item)}
                                >
                                    <Text style={styles.actionText}>Visualizar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    activeOpacity={0.8}
                                    onPress={() => handleDelete(item)}
                                >
                                    <Text style={styles.actionText}>Excluir</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={abrirModalCriar}>
                <MaterialIcons name="add" size={20} color={colors.background} />
                <Text style={styles.addButtonText}>Adicionar SetList</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent
                onRequestClose={fecharModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialIcons name={editingSetList ? 'edit' : 'playlist-add'} size={22} color={colors.primary} />
                            <Text style={styles.modalTitle}>{editingSetList ? 'Editar SetList' : 'Novo SetList'}</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o nome"
                            placeholderTextColor={colors.placeholder}
                            value={setListName}
                            onChangeText={setSetListName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={fecharModal}>
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSave}>
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
    titulo: { fontSize: 25, color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.md, fontWeight: 'bold' },
    results: { flex: 1 },
    emptyState: { alignItems: 'center', marginTop: spacing.xl },
    semResultados: { color: colors.placeholder, textAlign: 'center', marginTop: spacing.sm },
    resultItem: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
    },
    songTitle: { color: colors.text, fontSize: 20, marginBottom: spacing.sm, flexShrink: 1 },
    setListHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    setListNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.sm,
        gap: 6,
    },
    editIconBtn: {
        padding: 4,
        marginBottom: spacing.sm,
    },
    musicCount: {
        color: colors.placeholder,
        fontSize: 13,
        marginBottom: spacing.sm,
    },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    visualizarBtn: {
        backgroundColor: colors.surfaceAlt,
        padding: 10,
        borderRadius: radius.pill,
        flex: 1,
        marginRight: 5,
        alignItems: 'center',
    },
    deleteBtn: {
        backgroundColor: colors.danger,
        padding: 10,
        borderRadius: radius.pill,
        flex: 1,
        marginLeft: 5,
        alignItems: 'center',
    },
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
    input: {
        backgroundColor: colors.surface,
        color: colors.text,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        marginBottom: spacing.md,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
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
    buttonText: { color: colors.text, fontWeight: 'bold', textAlign: 'center' },
    saveButtonText: { color: colors.background, fontWeight: 'bold', textAlign: 'center' },
});