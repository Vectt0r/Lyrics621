import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const AppAlertContext = createContext(null);

// Substitui o Alert.alert nativo (que é sempre branco/estilo do sistema) por
// uma modal com a mesma cara do resto do app. Mesma assinatura do Alert.alert:
// showAlert(titulo, mensagem, botoes) — botoes: [{ text, style, onPress }].
export function AppAlertProvider({ children }) {
    const [config, setConfig] = useState(null);

    const showAlert = useCallback((title, message = '', buttons = [{ text: 'OK' }]) => {
        setConfig({ title, message, buttons: buttons.length ? buttons : [{ text: 'OK' }] });
    }, []);

    const handlePress = (botao) => {
        setConfig(null);
        botao.onPress && botao.onPress();
    };

    return (
        <AppAlertContext.Provider value={showAlert}>
            {children}
            <Modal
                visible={!!config}
                transparent
                animationType="fade"
                onRequestClose={() => setConfig(null)}
            >
                <View style={styles.overlay}>
                    <View style={styles.content}>
                        {!!config?.title && <Text style={styles.title}>{config.title}</Text>}
                        {!!config?.message && <Text style={styles.message}>{config.message}</Text>}
                        <View style={styles.buttonsRow}>
                            {config?.buttons.map((botao, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.button,
                                        config.buttons.length === 1 && styles.buttonFull,
                                        botao.style === 'destructive' && styles.buttonDestructive,
                                        botao.style === 'cancel' && styles.buttonCancel,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => handlePress(botao)}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            (botao.style === 'destructive' || botao.style === 'cancel') &&
                                                styles.buttonTextClaro,
                                        ]}
                                    >
                                        {botao.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </AppAlertContext.Provider>
    );
}

// Uso: const showAlert = useAppAlert(); showAlert('Título', 'Mensagem', [...]);
export function useAppAlert() {
    return useContext(AppAlertContext);
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: colors.surfaceAlt,
        padding: spacing.lg,
        borderRadius: radius.lg,
        width: '90%',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    title: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.sm,
    },
    message: {
        color: colors.textMuted,
        fontSize: 15,
        lineHeight: 21,
        marginBottom: spacing.lg,
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: radius.sm,
        minWidth: 90,
        alignItems: 'center',
    },
    buttonFull: {
        flex: 1,
    },
    buttonCancel: {
        backgroundColor: colors.surface,
    },
    buttonDestructive: {
        backgroundColor: colors.danger,
    },
    buttonText: {
        color: colors.background,
        fontWeight: 'bold',
    },
    buttonTextClaro: {
        color: colors.text,
    },
});
