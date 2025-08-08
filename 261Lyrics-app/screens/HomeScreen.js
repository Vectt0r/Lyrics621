import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

export default function HomeScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [letras, setLetras] = useState([]);

    const buscarLetra = async () => {
        try {
            const response = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
            setLetras(response.data);
        } catch (error) {
            console.error('Erro ao buscar letras:', error.message);
            setLetras([]);
        }
    };

    const baixarLetra = async (item) => {
        const nomeArquivo = `${item.artistName} - ${item.trackName}.txt`;
        const caminho = FileSystem.documentDirectory + nomeArquivo;
        try {
            await FileSystem.writeAsStringAsync(caminho, item.plainLyrics || 'Letra não disponível.');
            Alert.alert('Sucesso', `Letra salva como:\n${nomeArquivo}`);
        } catch (err) {
            console.error(err);
            Alert.alert('Erro', 'Não foi possível salvar a letra.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>LRC Lyrics Search</Text>

            <TextInput
                style={styles.input}
                placeholder="Digite artista, música ou ambos"
                placeholderTextColor="#aaa"
                value={query}
                onChangeText={setQuery}
            />

            <TouchableOpacity style={styles.button} onPress={buscarLetra}>
                <Text style={styles.buttonText}>Buscar</Text>
            </TouchableOpacity>

            <ScrollView style={styles.results}>
                {letras.map((item, index) => (
                    <View key={index} style={styles.resultItem}>
                        <Text style={styles.songTitle}>{item.artistName} - {item.trackName}</Text>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.visualizarBtn}
                                onPress={() => navigation.navigate('Letra', { letra: item })}
                            >
                                <Text style={styles.actionText}>Visualizar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.baixarBtn}
                                onPress={() => baixarLetra(item)}
                            >
                                <Text style={styles.actionText}>Baixar</Text>
                            </TouchableOpacity>
                        </View>
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
        paddingTop: 50,
        paddingHorizontal: 15,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        alignSelf: 'center',
    },
    input: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#00bfa5',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#121212',
        fontWeight: 'bold',
        fontSize: 16,
    },
    results: {
        flex: 1,
    },
    resultItem: {
        backgroundColor: '#1e1e1e',
        marginBottom: 10,
        borderRadius: 5,
        padding: 10,
    },
    songTitle: {
        color: '#00e676',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visualizarBtn: {
        backgroundColor: '#0288d1',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        marginRight: 5,
        alignItems: 'center',
    },
    baixarBtn: {
        backgroundColor: '#43a047',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        marginLeft: 5,
        alignItems: 'center',
    },
    actionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
