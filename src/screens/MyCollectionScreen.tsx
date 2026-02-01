import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { getSets, getCardsInSet } from '../api/optcg';
import type { Card } from '../types';
import { CardItem } from '../components/CardItem';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

export type MyCollectionProps = NativeStackScreenProps<RootStackParamList, 'MyCollection'>;

export function MyCollectionScreen(_props: MyCollectionProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collected, ready } = useCollectedCards();
  const [collectedCards, setCollectedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sets = await getSets();
        const allCards: Card[] = [];

        for (const set of sets) {
          const cards = await getCardsInSet(set.id);
          if (cancelled) return;
          const filtered = cards.filter(card => (collected[card.card_image_id] || 0) > 0);
          allCards.push(...filtered);
        }

        if (!cancelled) setCollectedCards(allCards);
      } catch (err) {
        if (!cancelled) setError('Failed to load collection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collected, ready]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.header, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>My Collection</Text>
        <View style={styles.skeletonWrap}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.chip }]} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (collectedCards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.header, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>My Collection</Text>
        <View style={styles.center}> 
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>📦 No cards collected yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.mutedText }]}>Tap a set to start collecting!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>My Collection ({collectedCards.length})</Text>
      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
        </View>
      )}
      <FlatList
        data={collectedCards}
        keyExtractor={(item) => item.card_image_id}
        numColumns={2}
        renderItem={({ item }) => <CardItem card={item} />}
        contentContainerStyle={styles.grid}
        initialNumToRender={12}
        windowSize={6}
        removeClippedSubviews
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    padding: 18,
    borderBottomWidth: 1,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  grid: {
    padding: 14,
  },
  skeletonWrap: {
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonCard: {
    width: '46%',
    aspectRatio: 63 / 88,
    margin: 10,
    borderRadius: 12,
  },
  errorBox: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
  },
  errorText: {
  },
});
