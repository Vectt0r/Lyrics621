import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import LyricsScreen from './screens/LyricsScreen';
import SetListsScreen from './screens/SetListsScreen';
import MusicScreen from './screens/MusicScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { enableScreens } from 'react-native-screens';
import { FontSizeProvider } from './screens/FontSizeContext';
import { AppAlertProvider } from './components/AppAlert';
import SetListMusicas from './screens/SetListMusicas'; // importe a nova tela
import SetListLyricsScreen from './screens/SetListLyricsScreen'; // importe a nova tela
import { colors, tabBarStyle } from './theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Sem isso, o React Navigation usa fundo branco por padrão no cartão da
// transição, o que causa aquele "flash" branco entre telas no tema escuro.
const stackScreenOptions = {
    ...TransitionPresets.SlideFromRightIOS,
    gestureDirection: 'horizontal',
    gestureEnabled: true,
    headerShown: false,
    cardStyle: { backgroundColor: colors.background },
};

// Stack da aba Home
function HomeStack() {
    return (
        <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
    );
}

function MusicasStack() {
    return (
        <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen name="MusicasMain" component={MusicScreen} />
            <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
    );
}

function SetListsStack() {
    return (
        <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen name="SetListsMain" component={SetListsScreen} />
            <Stack.Screen name="SetListMusicas" component={SetListMusicas} />
            <Stack.Screen name="SetListLyricsScreen" component={SetListLyricsScreen} />
        </Stack.Navigator>
    );
}

enableScreens();

export default function App() {
    return (
        <SafeAreaProvider>
            <FontSizeProvider>
            <AppAlertProvider>
                <StatusBar style="light" />
                <NavigationContainer>
                    <Tab.Navigator
                        screenOptions={{
                            tabBarActiveTintColor: colors.primary,
                            tabBarInactiveTintColor: colors.tabBarInactive,
                            tabBarStyle,
                            tabBarLabelStyle: {
                                fontSize: 12,
                                fontWeight: '600',
                            },
                            sceneContainerStyle: { backgroundColor: colors.background },
                        }}
                    >
                        <Tab.Screen
                            name="Home"
                            component={HomeStack}
                            options={{
                                headerShown: false,
                                tabBarIcon: ({ color, size }) => (
                                    <MaterialIcons name="home" color={color} size={size} />
                                ),
                            }}
                        />
                        <Tab.Screen
                            name="SetLists"
                            component={SetListsStack}
                            options={{
                                headerShown: false,
                                tabBarIcon: ({ color, size }) => (
                                    <MaterialIcons name="playlist-play" color={color} size={size} />
                                ),
                            }}
                        />
                        <Tab.Screen
                            name="Musicas"
                            component={MusicasStack}
                            options={{
                                headerShown: false,
                                tabBarIcon: ({ color, size }) => (
                                    <MaterialIcons name="music-note" color={color} size={size} />
                                ),
                            }}
                        />
                    </Tab.Navigator>
                </NavigationContainer>
            </AppAlertProvider>
            </FontSizeProvider>
        </SafeAreaProvider>
    );
}
