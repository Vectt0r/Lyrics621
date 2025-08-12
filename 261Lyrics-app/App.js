import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import LyricsScreen from './screens/LyricsScreen';
import SetListsScreen from './screens/SetListsScreen';
import MusicScreen from './screens/MusicScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSizeProvider } from './screens/FontSizeContext';
import SetListMusicas from './screens/SetListMusicas'; // importe a nova tela
import SetListLyricsScreen from './screens/SetListLyricsScreen'; // importe a nova tela

import {Easing} from "react-native";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack da aba Home
function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                ...TransitionPresets.SlideFromRightIOS,
                gestureDirection: 'horizontal',
                gestureEnabled: true,
                headerShown: false,
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
    );
}

function MusicasStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                ...TransitionPresets.SlideFromRightIOS,
                gestureDirection: 'horizontal',
                gestureEnabled: true,
                headerShown: false,
            }}
        >
            <Stack.Screen name="MusicasMain" component={MusicScreen} />
            <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
    );
}

function SetListsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                ...TransitionPresets.SlideFromRightIOS,
                gestureDirection: 'horizontal',
                gestureEnabled: true,
                headerShown: false,
            }}
        >
            <Stack.Screen name="SetListsMain" component={SetListsScreen} />
            <Stack.Screen name="SetListMusicas" component={SetListMusicas} />
            <Stack.Screen name="SetListLyricsScreen" component={SetListLyricsScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <FontSizeProvider>
            <NavigationContainer>
                <Tab.Navigator
                    screenOptions={{
                        tabBarActiveTintColor: '#000000',
                        tabBarInactiveTintColor: '#bab9b9',
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
        </FontSizeProvider>
    );
}
