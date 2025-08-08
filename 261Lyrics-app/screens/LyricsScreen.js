import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function LyricsScreen({ route }) {
    const { letra } = route.params;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{letra.artistName} - {letra.trackName}</Text>
            <Text style={styles.lyrics}>
                {letra.plainLyrics || 'Letra não disponível.'}
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#121212',
        padding: 20,
        flexGrow: 1,
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
        fontSize: 16,
        lineHeight: 24,
        whiteSpace: 'pre-line',
    },
});
