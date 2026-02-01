import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { getSets, getCardsInSet } from '../api/optcg';
import type { SetSummary } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { useToast } from '../components';

type Props = NativeStackScreenProps<RootStackParamList, 'Sets'>;

export function SetsScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { total: number; collected: number }>>({});
  const [searchText, setSearchText] = useState('');
  const { collected, ready } = useCollectedCards();
  const toast = useToast();

  const filteredSets = useMemo(() => {
    let filtered = searchText.trim()
      ? sets.filter(
          set =>
            set.name.toLowerCase().includes(searchText.toLowerCase()) ||
            set.id.toLowerCase().includes(searchText.toLowerCase())
        )
      : sets;
    
    // Sort by set ID (e.g., OP01, OP02, OP11)
    return [...filtered].sort((a, b) => {
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
  }, [sets, searchText]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSets();
        if (!data || data.length === 0) {
          setError('Failed to load sets.');
        } else {
          setSets(data);
        }
      } catch (err) {
        setError('Network error. Please try again.');
        toast.show('Failed to load sets', 'error');
      }
      setLoading(false);
    })();
  }, []);

  // Compute per-set progress in background
  useEffect(() => {
    if (!ready || sets.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const s of sets) {
        try {
          const cards = await getCardsInSet(s.id);
          if (cancelled) return;
          const total = cards.length;
          const collectedCount = cards.reduce((acc, c) => acc + ((collected[c.card_image_id] || 0) > 0 ? 1 : 0), 0);
          setProgress(prev => ({ ...prev, [s.id]: { total, collected: collectedCount } }));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [ready, sets, collected]);

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
        <Text style={[styles.header, { color: theme.colors.text }]}>Browse Sets</Text>
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
      <Text style={[styles.header, { color: theme.colors.text }]}>Browse Sets</Text>
      
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
        placeholder="Search sets..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor={theme.colors.mutedText}
      />
      
      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.chip }]}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => {
            setLoading(true);
            setError(null);
            getSets().then(d => { setSets(d); setLoading(false); });
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={filteredSets}
        keyExtractor={(item) => item.id}
        renderItem={renderSetItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                const data = await getSets();
                setSets(data);
              } catch {
                toast.show('Failed to refresh sets', 'error');
              }
              setRefreshing(false);
            }}
          />
        }
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
  },
  list: {
    padding: 16,
  },
  setCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  setAcronym: {
    fontSize: 14,
    fontWeight: '900',
    minWidth: 40,
  },
  rightContent: {
    flex: 1,
    gap: 8,
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
    fontSize: 13,
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
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  searchInput: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
