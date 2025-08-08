import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import LyricsScreen from './screens/LyricsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Busca" component={HomeScreen} />
          <Stack.Screen name="Letra" component={LyricsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}