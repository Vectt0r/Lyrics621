// FontSizeContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FontSizeContext = createContext();

export function FontSizeProvider({ children }) {
    const [fontSize, setFontSize] = useState(16);

    // Carrega a fonte salva no AsyncStorage quando o app inicia
    useEffect(() => {
        AsyncStorage.getItem('@font_size').then(savedSize => {
            if (savedSize) setFontSize(Number(savedSize));
        });
    }, []);

    // Salva no AsyncStorage sempre que o fontSize mudar
    useEffect(() => {
        AsyncStorage.setItem('@font_size', fontSize.toString());
    }, [fontSize]);

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </FontSizeContext.Provider>
    );
}
