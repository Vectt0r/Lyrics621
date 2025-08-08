import React, { useRef, useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSizeContext } from './FontSizeContext';

export default function LyricsScreen({ route }) {
    const { letra } = route.params;
    const { fontSize, setFontSize } = useContext(FontSizeContext);
    const [scrolling, setScrolling] = useState(false);
    const [speed, setSpeed] = useState(1);
    const scrollRef = useRef(null);
    const scrollPosition = useRef(0);
    const intervalRef = useRef(null);

    // Ajusta o tamanho da fonte globalmente
    const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 40));
    const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

    // Auto scroll
    useEffect(() => {
        if (scrolling) {
            intervalRef.current = setInterval(() => {
                scrollPosition.current += speed * 1.5;
                scrollRef.current?.scrollTo({
                    y: scrollPosition.current,
                    animated: false,
                });
            }, 50);
        } else {
            clearInterval(intervalRef.current);
        }

        return () => clearInterval(intervalRef.current);
    }, [scrolling, speed]);

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.content}
                onScroll={(e) => {
                    scrollPosition.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
            >
                <Text style={styles.title}>{letra.artistName} - {letra.trackName}</Text>
                <Text style={[styles.lyrics, { fontSize }]}>
                    {letra.plainLyrics || 'Letra não disponível.'}
                </Text>
            </ScrollView>

            {/* Controles */}
            <View style={styles.fixedControls}>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={() => setScrolling(prev => !prev)}
                    >
                        <Ionicons name={scrolling ? "pause" : "play"} size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={() =>
                            setSpeed(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, 0.1))
                        }
                    >
                        <Ionicons name="arrow-down" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <Text style={[styles.speedLabel, { marginHorizontal: 10 }]}>
                        Vel {speed.toFixed(1)}x
                    </Text>

                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={() =>
                            setSpeed(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, 5.0))
                        }
                    >
                        <Ionicons name="arrow-up" size={28} color="#00e676" />
                    </TouchableOpacity>

                    {/* Botões para controlar a fonte global */}
                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={decreaseFont}
                    >
                        <Ionicons name="remove-circle-outline" size={28} color="#00e676" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginHorizontal: 10 }}
                        onPress={increaseFont}
                    >
                        <Ionicons name="add-circle-outline" size={28} color="#00e676" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#121212',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        color: '#00e676',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    lyrics: {
        color: '#fff',
        lineHeight: 28,
    },
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

    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginVertical: 5,
    },
    speedLabel: {
        color: '#00e676',
        fontSize: 16,
        marginHorizontal: 5,
    },
});
