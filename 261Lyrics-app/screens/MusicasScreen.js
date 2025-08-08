import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function MusicasScreen() {
    const [arquivos, setArquivos] = useState([]);
    const navigation = useNavigation();

    const carregarArquivos = async () => {
        try {
            const lista = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const arquivosTxt = lista.filter(nome => nome.endsWith('.txt'));

            console.log("📂 Pasta do app:", FileSystem.documentDirectory);
            console.log("📄 Arquivos encontrados:", arquivosTxt);

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

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Músicas Salvas</Text>
            <ScrollView>
                {arquivos.map((nome, index) => (
                    <TouchableOpacity key={index} onPress={() => abrirLetra(nome)} style={styles.item}>
                        <Text style={styles.nomeMusica}>{nome.replace('.txt', '')}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20
    },
    titulo: {
        fontSize: 20,
        color: '#fff',
        marginBottom: 10
    },
    item: {
        paddingVertical: 10,
        borderBottomColor: '#444',
        borderBottomWidth: 1
    },
    nomeMusica: {
        color: '#00e676',
        fontSize: 16
    }
});