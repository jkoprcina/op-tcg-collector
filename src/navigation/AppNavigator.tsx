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
import { WishlistScreen } from '../screens/WishlistScreen';

export type RootStackParamList = {
  login: undefined;
  register: undefined;
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
  Wishlist: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        {!user ? (
          <>
            <Stack.Screen name="login" component={LoginScreen} />
            <Stack.Screen name="register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Sets" component={SetsScreen} />
            <Stack.Screen
              name="SetDetail"
              component={SetDetailScreen}
            />
            <Stack.Screen name="MyCollection" component={MyCollectionScreen} />
            <Stack.Screen name="Collections" component={CollectionsScreen} />
            <Stack.Screen
              name="CollectionDetail"
              component={CollectionDetailScreen}
            />
            <Stack.Screen
              name="AddToCollection"
              component={AddToCollectionScreen}
            />
            <Stack.Screen name="Wishlist" component={WishlistScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
