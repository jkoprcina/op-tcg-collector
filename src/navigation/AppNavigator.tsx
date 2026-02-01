import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetsScreen } from '../screens/SetsScreen';
import { SetDetailScreen } from '../screens/SetDetailScreen';
import { MyCollectionScreen } from '../screens/MyCollectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAuth } from '../context/AuthContext';
import { CollectionsScreen } from '../screens/CollectionsScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import { AddToCollectionScreen } from '../screens/AddToCollectionScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Sets: undefined;
  SetDetail: { setId: string; setName: string };
  MyCollection: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  AddToCollection: { card: import('../types').Card };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
            <Stack.Screen name="Sets" component={SetsScreen} options={{ title: 'Browse Sets' }} />
            <Stack.Screen
              name="SetDetail"
              component={SetDetailScreen}
              options={({ route }) => ({ title: route.params.setName })}
            />
            <Stack.Screen name="MyCollection" component={MyCollectionScreen} options={{ title: 'My Collection' }} />
            <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: 'Collections' }} />
            <Stack.Screen
              name="CollectionDetail"
              component={CollectionDetailScreen}
              options={{ title: 'Collection' }}
            />
            <Stack.Screen
              name="AddToCollection"
              component={AddToCollectionScreen}
              options={{ title: 'Add to Collection' }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
