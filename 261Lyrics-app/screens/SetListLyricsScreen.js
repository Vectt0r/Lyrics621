// SetListLyricsScreen.js
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Animated,
    ActivityIndicator,
    TouchableOpacity,
    PanResponder,
    BackHandler,
    Platform,
    ToastAndroid,
    Alert
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { FontSizeContext } from './FontSizeContext';
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
    const intervalRef = useRef(null);
    const scrollPosition = useRef(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const { fontSize, setFontSize, speed, setSpeed } = useContext(FontSizeContext);
    const [scrolling, setScrolling] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const indiceRef = useRef(indice);
    useEffect(() => { indiceRef.current = indice; }, [indice]);

    const isFullscreenRef = useRef(isFullscreen);
    useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

    // Carregar letra com fade
    const carregarLetraComFade = async (nomeMusica) => {
        setLoading(true);
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
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
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            }
        });
    };

    useEffect(() => {
        if (indice >= 0 && indice < musicas.length) {
            carregarLetraComFade(musicas[indice].name);
        }
    }, [indice]);

    // PanResponder para swipe
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50,
            onPanResponderRelease: (_, gestureState) => {
                const dx = gestureState.dx;
                if (dx < -50) setIndice(old => Math.min(old + 1, musicas.length - 1));
                else if (dx > 50) {
                    if (indiceRef.current === 0 && isFullscreenRef.current) {
                        if (Platform.OS === 'android') ToastAndroid.show('Ação bloqueada em tela cheia', ToastAndroid.SHORT);
                        else Alert.alert('', 'Ação bloqueada em tela cheia');
                        return;
                    }
                    setIndice(old => old > 0 ? Math.max(old - 1, 0) : old);
                    if (indiceRef.current === 0) navigation.goBack();
                }
            },
        })
    ).current;

    // Botão voltar físico
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (indice > 0) {
                    setIndice(old => Math.max(old - 1, 0));
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
        } else clearInterval(intervalRef.current);

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
        navigation.setOptions?.({ gestureEnabled: !isFullscreen });
        navigation.getParent?.()?.setOptions?.({ gestureEnabled: !isFullscreen });
    }, [isFullscreen, navigation]);

    // Zoom controls
    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 40));
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

    const titulo = musicas[indice]?.name || 'Sem música';

    return (
        <SafeAreaView style={styles.screen} {...panResponder.panHandlers}>
            <Animated.ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.content}
                style={{ opacity: fadeAnim }}
                onScroll={(e) => scrollPosition.current = e.nativeEvent.contentOffset.y}
                scrollEventThrottle={16}
            >
                <Text style={styles.title}>{titulo}</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#00e676" style={{ marginTop: 20 }} />
                ) : (
                    <Text style={[styles.lyrics, { fontSize, lineHeight: fontSize * 1.5 }]}>{letra}</Text>
                )}
            </Animated.ScrollView>

            {/* Controles fixos */}
            <View style={styles.fixedControls}>
                <View style={styles.row}>
                    <TouchableOpacity onPress={() => setScrolling(prev => !prev)} style={{ marginHorizontal: 10 }}>
                        <Ionicons name={scrolling ? "pause" : "play"} size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={() => setSpeed(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.1))}
                    >
                        <Ionicons name="arrow-down" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <Text style={[styles.speedLabel, { marginHorizontal: 10 }]}>Vel {speed.toFixed(1)}x</Text>

                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={() => setSpeed(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 5.0))}
                    >
                        <Ionicons name="arrow-up" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={decreaseFont} style={{ marginHorizontal: 10 }}>
                        <Ionicons name="remove-circle-outline" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={increaseFont} style={{ marginHorizontal: 10 }}>
                        <Ionicons name="add-circle-outline" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleFullscreen} style={{ marginHorizontal: 10 }}>
                        <Ionicons name={isFullscreen ? "contract-outline" : "expand-outline"} size={28} color="#00e676" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#121212' },
    content: { padding: 20, paddingBottom: 100 },
    title: { color: '#00e676', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    lyrics: { color: '#fff', lineHeight: 28 },
    fixedControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: '#1f1f1f',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 5 },
    speedLabel: { color: '#00e676', fontSize: 16, marginHorizontal: 5 },
});
