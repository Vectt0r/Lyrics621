import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetListsScreen({ navigation }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [setListName, setSetListName] = useState('');
    const [setLists, setSetLists] = useState([]);

    useEffect(() => {
        loadSetLists();
    }, []);

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

    // Criar novo setList já com 'musicas' vazio
    const handleSave = () => {
        if (!setListName.trim()) return;

        const newSetList = { id: Date.now().toString(), name: setListName, musicas: [] };
        const updatedSetLists = [...setLists, newSetList];

        setSetLists(updatedSetLists);
        saveSetLists(updatedSetLists);

        setSetListName('');
        setModalVisible(false);
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Excluir SetList',
            'Tem certeza que deseja excluir este SetList?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => {
                        const filtered = setLists.filter(item => item.id !== id);
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
        <View style={styles.container}>
            <Text style={styles.titulo}>SetLists Atuais</Text>

            <ScrollView
                style={styles.results}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {setLists.map((item) => (
                    <View key={item.id} style={styles.resultItem}>
                        <Text style={styles.songTitle}>{item.name}</Text>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.visualizarBtn}
                                onPress={() => visualizarSetList(item)}
                            >
                                <Text style={styles.actionText}>Visualizar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(item.id)}
                            >
                                <Text style={styles.actionText}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.addButtonText}>Adicionar Set List</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Novo Set List</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o nome"
                            placeholderTextColor="#aaa"
                            value={setListName}
                            onChangeText={setSetListName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
    titulo: { fontSize: 25, color: '#fff', marginTop: 60, marginBottom: 20, fontWeight: 'bold' },
    results: { flex: 1 },
    resultItem: {
        backgroundColor: '#1e1e1e',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    songTitle: { color: '#fff', fontSize: 20, marginBottom: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    visualizarBtn: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        marginRight: 5,
        alignItems: 'center',
    },
    deleteBtn: {
        backgroundColor: '#dc3545',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        marginLeft: 5,
        alignItems: 'center',
    },
    actionText: { color: '#070707', fontWeight: 'bold' },
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
        width: '80%',
    },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 20,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelButton: {
        backgroundColor: '#555',
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginRight: 10,
    },
    saveButton: {
        backgroundColor: '#1DB954',
        padding: 10,
        borderRadius: 6,
        flex: 1,
    },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});