// Tema global do app — cores, raio e espaçamento compartilhados entre telas.
export const colors = {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceAlt: '#262626',
    overlay: 'rgba(0,0,0,0.75)',
    primary: '#1DB954',
    primaryDark: '#15913f',
    danger: '#dc3545',
    text: '#ffffff',
    textMuted: '#9a9a9a',
    placeholder: '#777777',
    border: '#2e2e2e',
    tabBarBackground: '#181818',
    tabBarInactive: '#6e6e6e',
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 90,
};

// Sem `height`/padding fixos: o BottomTabNavigator calcula a altura certa
// somando a área segura do aparelho (barra de navegação do Android) sozinho,
// desde que a gente não sobrescreva esse cálculo aqui.
export const tabBarStyle = {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
};
