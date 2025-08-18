// FontSizeContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FontSizeContext = createContext();

export function FontSizeProvider({ children }) {
    const [fontSize, setFontSize] = useState(16);
    const [speed, setSpeed] = useState(1); // nova variável de velocidade

    // Carrega fontSize e speed salvos no AsyncStorage
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedFont = await AsyncStorage.getItem('@font_size');
                const savedSpeed = await AsyncStorage.getItem('@scroll_speed');

                if (savedFont) setFontSize(Number(savedFont));
                if (savedSpeed) setSpeed(Number(savedSpeed));
            } catch (error) {
                console.log('Erro ao carregar configurações:', error);
            }
        };
        loadSettings();
    }, []);

    // Salva fontSize sempre que mudar
    useEffect(() => {
        AsyncStorage.setItem('@font_size', fontSize.toString());
    }, [fontSize]);

    // Salva speed sempre que mudar
    useEffect(() => {
        AsyncStorage.setItem('@scroll_speed', speed.toString());
    }, [speed]);

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize, speed, setSpeed }}>
            {children}
        </FontSizeContext.Provider>
    );
}