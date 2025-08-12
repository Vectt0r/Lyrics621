import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

export default function MusicScreen() {
    const [arquivos, setArquivos] = useState([]);
    const navigation = useNavigation();

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
        Alert.alert(
            'Excluir música',
            `Deseja excluir a música "${nomeArquivo.replace('.txt', '')}"?`,
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
            carregarArquivos();
        } catch (err) {
            console.error('Erro ao excluir arquivo:', err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Músicas Salvas</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {arquivos.map((nome, index) => (
                    <View key={index} style={styles.itemRow}>
                        <TouchableOpacity style={styles.item} onPress={() => abrirLetra(nome)}>
                            <Text style={styles.nomeMusica}>{nome.replace('.txt', '')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmarExcluir(nome)} style={styles.deleteButton}>
                            <MaterialIcons name="delete" size={28} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },
    titulo: {
        fontSize: 25,
        color: '#fff',
        marginTop: 60,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomColor: '#444',
        borderBottomWidth: 1,
        paddingVertical: 10,
    },
    item: {
        flex: 1,
    },
    nomeMusica: {
        color: '#00e676',
        fontSize: 20,
    },
    deleteButton: {
        paddingHorizontal: 10,
    },
});
