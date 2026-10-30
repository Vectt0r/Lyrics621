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
    Animated,
    Platform,
    ToastAndroid,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';
import { tabBarStyle, colors, spacing, radius } from '../theme';
import { useAppAlert } from '../components/AppAlert';

export default function SetListLyricsScreen({ route, navigation }) {
    const showAlert = useAppAlert();
    const { musicas, indexAtual } = route.params;
    const [indice, setIndice] = useState(indexAtual);
    const [letra, setLetra] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const [fontSize, setFontSize] = useState(16);
    const [scrolling, setScrolling] = useState(false);
    const [speed, setSpeed] = useState(1);
    const scrollPosition = useRef(0);
    const intervalRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    // refs para usar no PanResponder
    const indiceRef = useRef(indice);
    useEffect(() => { indiceRef.current = indice; }, [indice]);

    const isFullscreenRef = useRef(isFullscreen);
    useEffect(() => { isFullscreenRef.current = isFullscreen; }, [isFullscreen]);

    const carregarLetraComFade = async (nomeMusica) => {
        setLoading(true);
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(async () => {
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
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            }
        });
    };

    useEffect(() => {
        if (indice >= 0 && indice < musicas.length) {
            carregarLetraComFade(musicas[indice].name);
        }
    }, [indice]);

    // PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50,
            onPanResponderRelease: (_, gestureState) => {
                const dx = gestureState.dx;

                // Swipe esquerda → próxima música
                if (dx < -50) {
                    setIndice((oldIndice) => Math.min(oldIndice + 1, musicas.length - 1));
                }

                // Swipe direita → anterior ou voltar
                else if (dx > 50) {
                    // Bloqueia voltar se fullscreen + primeira música
                    if (indiceRef.current === 0 && isFullscreenRef.current) {
                        if (Platform.OS === 'android') {
                            ToastAndroid.show('Ação bloqueada em tela cheia', ToastAndroid.SHORT);
                        } else {
                            showAlert('Atenção', 'Ação bloqueada em tela cheia.');
                        }
                        return;
                    }

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

    // Botão voltar físico
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
            tabBarStyle: isFullscreen ? { display: 'none' } : { ...tabBarStyle, display: 'flex' },
        });

        // Desabilita gesto de navegação enquanto fullscreen
        navigation.setOptions?.({ gestureEnabled: !isFullscreen });
        navigation.getParent?.()?.setOptions?.({ gestureEnabled: !isFullscreen });
    }, [isFullscreen, navigation]);

    // Zoom controls
    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 40));
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

    // Navegação entre músicas (botões da barra, visíveis só em fullscreen)
    const temAnterior = indice > 0;
    const temProxima = indice < musicas.length - 1;
    const irParaAnterior = () => {
        if (temAnterior) setIndice(prev => Math.max(prev - 1, 0));
    };
    const irParaProxima = () => {
        if (temProxima) setIndice(prev => Math.min(prev + 1, musicas.length - 1));
    };

    const titulo = musicas[indice]?.name || 'Sem música';

    return (
        <SafeAreaView style={styles.screen} {...panResponder.panHandlers}>
            <Animated.ScrollView
                ref={scrollRef}
                contentContainerStyle={[styles.content, isFullscreen && styles.contentFullscreen]}
                style={{ opacity: fadeAnim }}
                onScroll={(e) => {
                    scrollPosition.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
            >
                <Text style={styles.title}>{titulo}</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <Text style={[styles.lyrics, { fontSize, lineHeight: fontSize * 1.5 }, isFullscreen && styles.lyricsFullscreen]}>
                        {letra}
                    </Text>
                )}
            </Animated.ScrollView>

            {/* Controles fixos */}
            <View style={styles.bottomWrapper}>
                {/* Barra estreita de navegação entre músicas, acima da barra de ações */}
                <View style={styles.navBar}>
                    <TouchableOpacity
                        style={{ marginHorizontal: 16, opacity: temAnterior ? 1 : 0.3 }}
                        onPress={irParaAnterior}
                        disabled={!temAnterior}
                    >
                        <Ionicons name="play-skip-back" size={24} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginHorizontal: 16, opacity: temProxima ? 1 : 0.3 }}
                        onPress={irParaProxima}
                        disabled={!temProxima}
                    >
                        <Ionicons name="play-skip-forward" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.fixedControls}>
                    <View style={styles.row}>
                        <TouchableOpacity style={{ marginHorizontal: 10 }} onPress={() => setScrolling(prev => !prev)}>
                            <Ionicons name={scrolling ? "pause" : "play"} size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ marginHorizontal: 10 }}
                            onPress={() => setSpeed(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.1))}
                        >
                            <Ionicons name="arrow-down" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <Text style={[styles.speedLabel, { marginHorizontal: 10 }]}>Vel {speed.toFixed(1)}x</Text>

                        <TouchableOpacity
                            style={{ marginHorizontal: 10 }}
                            onPress={() => setSpeed(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 5.0))}
                        >
                            <Ionicons name="arrow-up" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginHorizontal: 10 }} onPress={decreaseFont}>
                            <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginHorizontal: 10 }} onPress={increaseFont}>
                            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginHorizontal: 10 }} onPress={toggleFullscreen}>
                            <Ionicons
                                name={isFullscreen ? "contract-outline" : "expand-outline"}
                                size={28}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    contentFullscreen: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: colors.primary,
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: spacing.xxl,
        marginBottom: 20,
        textAlign: 'center',
    },
    lyrics: {
        color: colors.text,
        lineHeight: 28,
    },
    lyricsFullscreen: {
        textAlign: 'center',
    },
    bottomWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        width: '55%',
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
        borderTopLeftRadius: radius.md,
        borderTopRightRadius: radius.md,
    },
    fixedControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginVertical: 5,
    },
    speedLabel: {
        color: colors.primary,
        fontSize: 16,
        marginHorizontal: 5,
    },
});