import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useCollections } from '../context/CollectionsContext';
import { useCollectedCards } from '../hooks/useCollectedCards';
import type { RootStackParamList } from '../navigation';

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collections } = useCollections();
  const { collected } = useCollectedCards();

  const totalCollected = useMemo(
    () => Object.values(collected).reduce((acc, n) => acc + n, 0),
    [collected]
  );
  const binderCount = collections.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>ONE PIECE</Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Card Collector</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{binderCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.mutedText }]}>Binders</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{totalCollected}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.mutedText }]}>Collected</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Sets')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="grid" size={32} color="#fff" />
            </View>
            <Text style={styles.buttonText}>Browse Sets</Text>
            <Text style={[styles.buttonSubtext, { color: theme.colors.mutedText }]}>Explore all TCG sets</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Collections')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="albums" size={32} color="#fff" />
            </View>
            <Text style={styles.buttonText}>My Binders</Text>
            <Text style={[styles.buttonSubtext, { color: theme.colors.mutedText }]}>Manage your cards</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Ionicons name="cog" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Settings</Text>
            <Text style={[styles.buttonSubtext, { color: theme.colors.mutedText }]}>Manage preferences</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 0,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  recentList: {
    paddingBottom: 18,
  },
  recentCard: {
    width: 120,
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  recentImage: {
    width: '100%',
    aspectRatio: 63 / 88,
    borderRadius: 8,
    marginBottom: 6,
  },
  recentName: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  recentEmpty: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  recentEmptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 420,
    gap: 20,
  },
  mainButton: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 16px rgba(0,0,0,0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonIcon: {
    marginBottom: 12,
    opacity: 0.95,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
    fontWeight: '600',
  },
});
