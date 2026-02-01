import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useCollections } from '../context/CollectionsContext';
import { useCollectedCards } from '../hooks/useCollectedCards';
import type { RootStackParamList } from '../navigation';

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>ONE PIECE</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Card Collector</Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => navigation.navigate('Sets')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="grid" size={32} color="#fff" />
            </View>
            <Text style={styles.buttonText}>Browse Sets</Text>
            <Text style={styles.buttonSubtext}>Explore all TCG sets</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => navigation.navigate('Collections')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="albums" size={32} color="#fff" />
            </View>
            <Text style={styles.buttonText}>My Collections</Text>
            <Text style={styles.buttonSubtext}>Manage your cards</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="cog" size={32} color="#fff" />
            </View>
            <Text style={styles.buttonText}>Settings</Text>
            <Text style={styles.buttonSubtext}>Manage preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 60,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  mainButton: {
    backgroundColor: '#2C3930',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonIcon: {
    marginBottom: 12,
    opacity: 0.95,
  },
  buttonText: {
    color: '#DCD7C9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: '#A27B5C',
    fontSize: 14,
    fontWeight: '500',
  },
});
