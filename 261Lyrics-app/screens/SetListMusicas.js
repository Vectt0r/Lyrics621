import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetListMusicas({ route, navigation }) {
    const { setList } = route.params;

    const [modalVisible, setModalVisible] = useState(false);
    const [musicaNome, setMusicaNome] = useState('');
    const [musicas, setMusicas] = useState(setList.musicas || []);

    // Salvar músicas no AsyncStorage e atualizar setList
    const saveMusicas = async (novasMusicas) => {
        try {
            const jsonValue = await AsyncStorage.getItem('@setlists');
            let allSetLists = jsonValue ? JSON.parse(jsonValue) : [];

            // Atualizar o setList atual com novas músicas
            allSetLists = allSetLists.map((item) =>
                item.id === setList.id ? { ...item, musicas: novasMusicas } : item
            );

            await AsyncStorage.setItem('@setlists', JSON.stringify(allSetLists));
        } catch (e) {
            console.error('Erro ao salvar músicas', e);
        }
    };

    const handleSave = () => {
        if (!musicaNome.trim()) return;

        const novasMusicas = [...musicas, { name: musicaNome }];
        setMusicas(novasMusicas);
        saveMusicas(novasMusicas);
        setMusicaNome('');
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
                        setMusicas(novasMusicas);
                        saveMusicas(novasMusicas);
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>SetList - {setList.name}</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {musicas.map((item, index) => (
                    <View key={index} style={styles.resultItem}>
                        <Text style={styles.songTitle}>{item.name}</Text>

                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteMusica(index)}
                        >
                            <Text style={styles.actionText}>Excluir</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
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
                        <Text style={styles.modalTitle}>Nova Música</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o nome da música"
                            placeholderTextColor="#aaa"
                            value={musicaNome}
                            onChangeText={setMusicaNome}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
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
    // Estilos iguais ao que você já usou, só adicionar deleteBtn:

    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },
    titulo: {
        fontSize: 25,
        color: '#fff',
        marginTop: 60,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    resultItem: {
        backgroundColor: '#1e1e1e',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    songTitle: {
        color: '#fff',
        fontSize: 16,
    },
    deleteBtn: {
        backgroundColor: '#dc3545',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    actionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
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
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
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
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
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
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
