import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import LyricsScreen from './screens/LyricsScreen';
import SetListsScreen from './screens/SetListsScreen';
import MusicasScreen from './screens/MusicasScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { FontSizeProvider } from './screens/FontSizeContext';



const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <FontSizeProvider>

            <NavigationContainer>
                <Tab.Navigator
                    screenOptions={{
                        tabBarActiveTintColor: '#00e676',
                        tabBarInactiveTintColor: '#aaa',
                        tabBarStyle: { backgroundColor: '#121212' },
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
                        component={SetListsScreen}
                        options={{
                            headerShown: false,
                            tabBarIcon: ({ color, size }) => (
                                <MaterialIcons name="playlist-play" color={color} size={size} />
                            ),
                        }}
                    />
                    <Tab.Screen
                        name="Musicas"
                        component={MusicasScreen}
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