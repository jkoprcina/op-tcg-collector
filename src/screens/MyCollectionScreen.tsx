import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { readSetsCache, fetchSetsAndCache, readCardsCache, fetchCardsAndCache } from '../api/optcg';
import type { Card } from '../types';
import { CardItem } from '../components/CardItem';
import { CardDetailsModal } from '../components/CardDetailsModal';
import { AddToCollectionModal } from '../components/AddToCollectionModal';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useCardFilters } from '../context/CardFilterContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { runLayoutAnimation } from '../utils/animations';
import { ScreenHeader } from '../components';

export type MyCollectionProps = NativeStackScreenProps<RootStackParamList, 'MyCollection'>;

export function MyCollectionScreen({ navigation }: MyCollectionProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { width } = useWindowDimensions();
  const { collected, ready } = useCollectedCards();
  const { isCardVisible, ready: filtersReady } = useCardFilters();
  const [collectedCards, setCollectedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const totalCollected = useMemo(
    () => Object.values(collected).reduce((acc, n) => acc + n, 0),
    [collected]
  );

  useEffect(() => {
    if (!ready || !filtersReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let sets = [] as { id: string; name: string }[];
        const cachedSets = await readSetsCache();
        if (cachedSets?.data?.length) {
          sets = cachedSets.data;
        } else {
          const fresh = await fetchSetsAndCache();
          sets = fresh.data;
        }
        const tasks = sets.map(async (set) => {
          let cards: Card[] = [];
          const cached = await readCardsCache(set.id);
          if (cached?.data?.length) {
            cards = cached.data;
          } else {
            const fresh = await fetchCardsAndCache(set.id);
            cards = fresh.data;
          }
          if (cancelled) return [] as Card[];
          return cards.filter(card => (collected[card.card_image_id] || 0) > 0 && isCardVisible(card));
        });

        const results = await Promise.all(tasks);
        if (!cancelled) setCollectedCards(results.flat());
      } catch (err) {
        if (!cancelled) setError('Failed to load collection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collected, ready, filtersReady, isCardVisible]);

  useEffect(() => {
    runLayoutAnimation();
  }, [collectedCards.length, error]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="My Collection" subtitle="Your collected cards" />
        </View>
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
        <View style={styles.headerWrap}>
          <ScreenHeader title="My Collection" subtitle="Your collected cards" />
        </View>
        <View style={styles.center}> 
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>📦 No cards collected yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.mutedText }]}>Tap a set to start collecting!</Text>
          <TouchableOpacity
            style={[styles.emptyCta, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Sets')}
          >
            <Text style={styles.emptyCtaText}>Browse sets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="My Collection" subtitle="Your collected cards" />
        <Text style={[styles.countText, { color: theme.colors.mutedText }]}>
          {collectedCards.length} cards · {totalCollected} total owned
        </Text>
      </View>
      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
        </View>
      )}
      {(() => {
        const columns = Platform.OS === 'web' && width >= 1024 ? 5 : 2;
        const itemWidth = `${100 / columns}%` as const;
        return (
          <FlatList
            data={collectedCards}
            keyExtractor={(item) => item.card_image_id}
            numColumns={columns}
            key={`columns-${columns}`}
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { width: itemWidth }]}
              >
                <CardItem
                  card={item}
                  disableInlineModals
                  onPress={() => {
                    setSelectedCard(item);
                    setDetailsVisible(true);
                  }}
                  onOpenAdd={() => {
                    setSelectedCard(item);
                    setAddVisible(true);
                  }}
                />
              </View>
            )}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            initialNumToRender={12}
            windowSize={6}
            removeClippedSubviews
            maxToRenderPerBatch={16}
            updateCellsBatchingPeriod={50}
          />
        );
      })()}
      {selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          visible={detailsVisible}
          onClose={() => setDetailsVisible(false)}
        />
      )}
      {selectedCard && (
        <AddToCollectionModal
          card={selectedCard}
          visible={addVisible}
          onClose={() => setAddVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  emptyCta: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '700',
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 8,
  },
  gridItem: {
    alignSelf: 'flex-start',
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
