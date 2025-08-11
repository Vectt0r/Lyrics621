import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    PanResponder,
    BackHandler,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';

export default function SetListLyricsScreen({ route, navigation }) {
    const { musicas, indexAtual } = route.params;
    const [indice, setIndice] = useState(indexAtual);
    const [letra, setLetra] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Carregar letra da música atual
    const carregarLetra = async (nomeMusica) => {
        setLoading(true);
        try {
            const caminho = FileSystem.documentDirectory + nomeMusica + '.txt';
            const texto = await FileSystem.readAsStringAsync(caminho);
            setLetra(texto);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        } catch (error) {
            setLetra('Erro ao carregar a letra.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (indice >= 0 && indice < musicas.length) {
            carregarLetra(musicas[indice].name);
            console.log('Música atual:', indice, musicas[indice].name);
        }
    }, [indice]);

    // PanResponder para swipe
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50,

            onPanResponderRelease: (_, gestureState) => {
                const dx = gestureState.dx;

                if (dx < -50) {
                    // Swipe esquerda: próxima música
                    setIndice((oldIndice) => {
                        const novoIndice = Math.min(oldIndice + 1, musicas.length - 1);
                        console.log('Swipe esquerda, avançar para:', novoIndice);
                        return novoIndice;
                    });
                } else if (dx > 50) {
                    // Swipe direita: música anterior OU tentar voltar tela só se indice == 0
                    setIndice((oldIndice) => {
                        if (oldIndice > 0) {
                            const novoIndice = Math.max(oldIndice - 1, 0);
                            console.log('Swipe direita, voltar para:', novoIndice);
                            return novoIndice;
                        } else {
                            // Se já estiver no índice 0, permitir voltar tela
                            navigation.goBack();
                            return oldIndice;
                        }
                    });
                }
            },
        })
    ).current;

    // Interceptar botão físico de voltar Android
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (indice > 0) {
                    setIndice((oldIndice) => Math.max(oldIndice - 1, 0));
                    return true; // Bloqueia sair da tela
                }
                return false; // Permite sair da tela
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
            };
        }, [indice])
    );

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <Text style={styles.title}>{musicas[indice]?.name || 'Sem música'}</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 20 }} />
            ) : (
                <ScrollView ref={scrollRef} style={styles.scroll}>
                    <Text style={styles.lyrics}>{letra}</Text>
                </ScrollView>
            )}

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {indice + 1} / {musicas.length}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        color: '#1DB954',
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    lyrics: {
        fontSize: 16,
        color: '#fff',
        lineHeight: 24,
    },
    footer: {
        paddingVertical: 15,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    footerText: {
        color: '#888',
        fontSize: 14,
    },
});
