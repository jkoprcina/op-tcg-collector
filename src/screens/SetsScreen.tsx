import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo, useRef } from 'react';
import { readSetsCache, fetchSetsAndCache, readCardsCache, fetchCardsAndCache } from '../api/optcg';
import type { SetSummary, Card } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { ScreenHeader, useToast } from '../components';
import { useCardFilters } from '../context/CardFilterContext';
import { runLayoutAnimation } from '../utils/animations';

type Props = NativeStackScreenProps<RootStackParamList, 'Sets'>;

export function SetsScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { total: number; collected: number }>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList<SetSummary>>(null);
  const { collected, ready } = useCollectedCards();
  const toast = useToast();
  const { isCardVisible, ready: filtersReady } = useCardFilters();

  const filteredSets = useMemo(() => {
    // Sort by set ID (e.g., OP01, OP02, OP11)
    return [...sets].sort((a, b) => {
      const rx = /^([A-Z]+)(\d+)$/;
      const ma = a.id.match(rx);
      const mb = b.id.match(rx);
      if (ma && mb) {
        const seriesA = ma[1];
        const seriesB = mb[1];
        if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
        return parseInt(ma[2], 10) - parseInt(mb[2], 10);
      }
      return a.id.localeCompare(b.id);
    });
  }, [sets]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await readSetsCache();
        if (cached?.data?.length) {
          setSets(cached.data);
          setLastUpdated(cached.updatedAt);
        }

        const fresh = await fetchSetsAndCache();
        if (!fresh.data || fresh.data.length === 0) {
          setError('Failed to load sets.');
        } else {
          setSets(fresh.data);
          setLastUpdated(fresh.updatedAt);
        }
      } catch (err) {
        setError('Network error. Please try again.');
        toast.show('Failed to load sets', 'error');
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    runLayoutAnimation();
  }, [filteredSets.length, error]);

  // Compute per-set progress in background
  useEffect(() => {
    if (!ready || !filtersReady || sets.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const s of sets) {
        try {
          let cards = [] as Card[];
          const cached = await readCardsCache(s.id);
          if (cached?.data?.length) {
            cards = cached.data;
          } else {
            const fresh = await fetchCardsAndCache(s.id);
            cards = fresh.data;
          }
          if (cancelled) return;
          const filtered = cards.filter(c => isCardVisible(c));
          const total = filtered.length;
          const collectedCount = filtered.reduce((acc, c) => acc + ((collected[c.card_image_id] || 0) > 0 ? 1 : 0), 0);
          setProgress(prev => ({ ...prev, [s.id]: { total, collected: collectedCount } }));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [ready, filtersReady, sets, collected, isCardVisible]);

  const renderSetItem = ({ item }: { item: SetSummary }) => {
    const prog = progress[item.id];
    return (
      <TouchableOpacity
        style={[styles.setCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate('SetDetail', { setId: item.id, setName: item.name })}
      >
        {/* Left: Acronym */}
        <Text style={[styles.setAcronym, { color: theme.colors.accent }]}>{item.id}</Text>
        
        {/* Right content */}
        <View style={styles.rightContent}>
          {/* Top: Set name and card count */}
          <View style={styles.topRow}>
            <Text style={[styles.setName, { color: theme.colors.text }]} numberOfLines={2}>{item.name}</Text>
            {prog && (
              <Text style={[styles.cardCount, { color: theme.colors.mutedText }]}>
                {prog.collected}/{prog.total}
              </Text>
            )}
          </View>
          
          {/* Bottom: Progress bar */}
          {prog && prog.total > 0 && (
            <View style={[styles.progressBar, { backgroundColor: theme.colors.chip }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((prog.collected / prog.total) * 100)}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Browse Sets" subtitle="Explore all TCG sets" />
        <View style={styles.list}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.skeletonTitle, { backgroundColor: theme.colors.chip }]} />
              <View style={[styles.skeletonSub, { backgroundColor: theme.colors.chip }]} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => {
            setLoading(true);
            setError(null);
            fetchSetsAndCache().then(fresh => {
              setSets(fresh.data);
              setLastUpdated(fresh.updatedAt);
              setLoading(false);
            });
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={filteredSets}
        keyExtractor={(item) => item.id}
        renderItem={renderSetItem}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        windowSize={6}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS !== 'web'}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 500 && !showScrollTop) setShowScrollTop(true);
          if (y <= 500 && showScrollTop) setShowScrollTop(false);
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={[styles.stickyHeader, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          >
            <ScreenHeader title="Browse Sets" subtitle="Explore all TCG sets" />
            {lastUpdated && (
              <Text style={[styles.updatedText, { color: theme.colors.mutedText }]}>Last updated {new Date(lastUpdated).toLocaleString()}</Text>
            )}
          </View>
        }
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyEmoji, { color: theme.colors.text }]}>🗂️</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No sets found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.mutedText }]}>Try adjusting your search</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                const fresh = await fetchSetsAndCache();
                setSets(fresh.data);
                setLastUpdated(fresh.updatedAt);
              } catch {
                toast.show('Failed to refresh sets', 'error');
              }
              setRefreshing(false);
            }}
          />
        }
      />
      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollTopFab, { backgroundColor: theme.colors.primary }]}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      )}
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
  },
  list: {
    padding: 16,
  },
  scrollTopFab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 16px rgba(0,0,0,0.22)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      },
    }),
  },
  stickyHeader: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  setCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0,
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  setAcronym: {
    fontSize: 14,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'center',
  },
  rightContent: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  setName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  cardCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  setId: {
    fontSize: 14,
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 24,
  },
  updatedText: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 24,
  },
  searchInput: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
  },
  loadingText: {
    fontSize: 16,
  },
  skeletonCard: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  skeletonTitle: {
    height: 18,
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonSub: {
    height: 14,
    borderRadius: 6,
    width: '40%',
  },
  errorBox: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
});
