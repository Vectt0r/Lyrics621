import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    PanResponder,
    BackHandler,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';

export default function SetListLyricsScreen({ route, navigation }) {
    const { musicas, indexAtual } = route.params;
    const [indice, setIndice] = useState(indexAtual);
    const [letra, setLetra] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Fonte zoom só letra
    const [fontSize, setFontSize] = useState(16);

    // Auto scroll
    const [scrolling, setScrolling] = useState(false);
    const [speed, setSpeed] = useState(1);
    const scrollPosition = useRef(0);
    const intervalRef = useRef(null);

    // Fullscreen
    const [isFullscreen, setIsFullscreen] = useState(false);

    const carregarLetra = async (nomeMusica) => {
        setLoading(true);
        try {
            const caminho = FileSystem.documentDirectory + nomeMusica + '.txt';
            const texto = await FileSystem.readAsStringAsync(caminho);
            setLetra(texto);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            scrollPosition.current = 0;
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
        }
    }, [indice]);

    // Swipe
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50,
            onPanResponderRelease: (_, gestureState) => {
                const dx = gestureState.dx;
                if (dx < -50) {
                    setIndice((oldIndice) => Math.min(oldIndice + 1, musicas.length - 1));
                } else if (dx > 50) {
                    setIndice((oldIndice) => {
                        if (oldIndice > 0) return Math.max(oldIndice - 1, 0);
                        else {
                            navigation.goBack();
                            return oldIndice;
                        }
                    });
                }
            },
        })
    ).current;

    // Botão voltar Android
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (indice > 0) {
                    setIndice((oldIndice) => Math.max(oldIndice - 1, 0));
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [indice])
    );

    // Auto scroll
    useEffect(() => {
        if (scrolling) {
            intervalRef.current = setInterval(() => {
                scrollPosition.current += speed * 1.5;
                scrollRef.current?.scrollTo({ y: scrollPosition.current, animated: false });
            }, 50);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [scrolling, speed]);

    // Fullscreen toggle
    const toggleFullscreen = async () => {
        if (isFullscreen) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            await NavigationBar.setVisibilityAsync("visible");
            await NavigationBar.setBehaviorAsync("default");
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            await NavigationBar.setVisibilityAsync("hidden");
            await NavigationBar.setBehaviorAsync("immersive");
        }
        setIsFullscreen(!isFullscreen);
    };

    useEffect(() => {
        navigation.getParent()?.setOptions({
            tabBarStyle: isFullscreen ? { display: 'none' } : { display: 'flex' },
        });
    }, [isFullscreen, navigation]);

    // Zoom controls
    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 40));
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

    return (
        <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
            {/* Título fixo sem zoom */}
            <Text style={styles.title}>{musicas[indice]?.name || 'Sem música'}</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 20 }} />
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    onScroll={(e) => {
                        scrollPosition.current = e.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={16}
                >
                    <Text style={[styles.lyrics, { fontSize, lineHeight: fontSize * 1.5 }]}>
                        {letra}
                    </Text>
                </ScrollView>
            )}

            {/* Controles */}
            <View style={styles.controls}>
                <TouchableOpacity onPress={() => setScrolling(prev => !prev)} style={styles.controlBtn}>
                    <Ionicons name={scrolling ? "pause" : "play"} size={28} color="#1DB954" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSpeed(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.1))} style={styles.controlBtn}>
                    <Ionicons name="arrow-down" size={28} color="#1DB954" />
                </TouchableOpacity>

                <Text style={styles.speedLabel}>Vel {speed.toFixed(1)}x</Text>

                <TouchableOpacity onPress={() => setSpeed(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 5.0))} style={styles.controlBtn}>
                    <Ionicons name="arrow-up" size={28} color="#1DB954" />
                </TouchableOpacity>

                <TouchableOpacity onPress={decreaseFont} style={styles.controlBtn}>
                    <Ionicons name="remove-circle-outline" size={28} color="#1DB954" />
                </TouchableOpacity>

                <TouchableOpacity onPress={increaseFont} style={styles.controlBtn}>
                    <Ionicons name="add-circle-outline" size={28} color="#1DB954" />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleFullscreen} style={styles.controlBtn}>
                    <Ionicons
                        name={isFullscreen ? "contract-outline" : "expand-outline"}
                        size={28}
                        color="#1DB954"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {indice + 1} / {musicas.length}
                </Text>
            </View>
        </SafeAreaView>
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
        marginBottom: 10,
    },
    lyrics: {
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
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#1f1f1f',
        borderTopWidth: 1,
        borderTopColor: '#333',
        alignItems: 'center',
    },
    controlBtn: {
        paddingHorizontal: 5,
    },
    speedLabel: {
        color: '#1DB954',
        fontSize: 16,
        marginHorizontal: 8,
        minWidth: 60,
        textAlign: 'center',
    },
});
