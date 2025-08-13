import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator
} from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const logo = require('../images/logo.png');

export default function HomeScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [letras, setLetras] = useState([]);
    const [loading, setLoading] = useState(false); // novo estado

    const buscarLetra = async () => {
        if (!query.trim()) {
            Alert.alert('Aviso', 'Digite algo para buscar.');
            return;
        }

        setLoading(true); // começa carregamento
        try {
            const response = await axios.get(
                `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
            );
            setLetras(response.data);
        } catch (error) {
            console.error('Erro ao buscar letras:', error.message);
            setLetras([]);
        } finally {
            setLoading(false); // termina carregamento
        }
    };

    const baixarLetra = async (item) => {
        const nomeArquivo = `${item.artistName} - ${item.trackName}.txt`;
        const caminho = FileSystem.documentDirectory + nomeArquivo;
        try {
            await FileSystem.writeAsStringAsync(
                caminho,
                item.plainLyrics || 'Letra não disponível.'
            );
            Alert.alert('Sucesso', `Letra salva como:\n${nomeArquivo}`);
        } catch (err) {
            console.error(err);
            Alert.alert('Erro', 'Não foi possível salvar a letra.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <Image source={logo} style={styles.logo} />
                <Text style={styles.titleText}>Lyrics</Text>
            </View>

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

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#00e676" />
                    <Text style={{ color: '#fff', marginTop: 10 }}>Carregando...</Text>
                </View>
            ) : (
                <ScrollView style={styles.results}>
                    {letras.map((item, index) => (
                        <View key={index} style={styles.resultItem}>
                            <Text style={styles.songTitle}>
                                {item.artistName} - {item.trackName}
                            </Text>

                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.visualizarBtn}
                                    onPress={() =>
                                        navigation.navigate('Letra', { letra: item })
                                    }
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 90,
        paddingHorizontal: 15,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 70,
        height: 50,
        marginRight: 10,
    },
    titleText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#1e1e1e',
        color: '#fff',
        padding: 20,
        borderRadius: 5,
        marginBottom: 25,
    },
    button: {
        backgroundColor: '#00e676',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 25,
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
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    visualizarBtn: {
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 20,
        flex: 1,
        marginRight: 5,
        alignItems: 'center',
    },
    baixarBtn: {
        backgroundColor: '#00e676',
        padding: 8,
        borderRadius: 20,
        flex: 1,
        marginLeft: 5,
        alignItems: 'center',
    },
    actionText: {
        color: '#070707',
        fontWeight: 'bold',
    },
});
