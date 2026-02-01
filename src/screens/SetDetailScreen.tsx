import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { getCardsInSet } from '../api/optcg';
import type { Card } from '../types';
import { CardItem, useToast } from '../components';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SetDetail'>;

type SortType = 'id' | 'name' | 'rarity' | 'price-asc' | 'price-desc';

const COLORS = [
  'Red',
  'Blue',
  'Green',
  'Black',
  'Purple',
  'Yellow',
];

const STORAGE_KEY = 'collection_thresholds';

type FilterState = {
  selectedColor: string | null;
  sortType: SortType;
  showCollected: boolean;
};

export function SetDetailScreen({ route }: Props) {
  const { setId, setName } = route.params;
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('id');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [showCollected, setShowCollected] = useState(true);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const { getCount, collected } = useCollectedCards();
  const toast = useToast();

  // Load thresholds on mount and when screen gains focus
  const loadThresholds = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setThresholds(JSON.parse(raw));
      } else {
        // Default: 1 card needed
        setThresholds({});
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadThresholds();
  }, [loadThresholds]);

  useFocusEffect(
    useCallback(() => {
      loadThresholds();
    }, [loadThresholds])
  );

  // Load saved filters for this set
  useEffect(() => {
    (async () => {
      try {
        const key = `set_filters_${setId}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const saved: FilterState = JSON.parse(raw);
          setSelectedColor(saved.selectedColor);
          setSortType(saved.sortType);
          setShowCollected(saved.showCollected);
        }
      } catch {}
    })();
  }, [setId]);

  // Save filters whenever they change
  useEffect(() => {
    (async () => {
      try {
        const key = `set_filters_${setId}`;
        const state: FilterState = {
          selectedColor,
          sortType,
          showCollected,
        };
        await AsyncStorage.setItem(key, JSON.stringify(state));
      } catch {}
    })();
  }, [setId, selectedColor, sortType, showCollected]);

  const loadCards = async () => {
    try {
      const data = await getCardsInSet(setId);
      setCards(data);
    } catch (err) {
      toast.show('Failed to load cards', 'error');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCards();
      setLoading(false);
    })();
  }, [setId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCards();
    setRefreshing(false);
    toast.show('Cards refreshed', 'success');
  };

  // Debounce search input
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText), 200);
    return () => clearTimeout(h);
  }, [searchText]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    // Normalize rarity from API values to Settings keys
    // Alternative Art takes precedence if present
    const normalizeRarity = (r: string | null | undefined): string => {
      const s = (r || '').trim().toLowerCase();
      
      // Check for Alternative Art first (takes precedence)
      if (s.includes('alt') || s.includes('alternative art') || s === 'aa') {
        return 'Alternative Art';
      }
      
      // Then check other rarities
      if (s === 'c' || s === 'common') return 'Common';
      if (s === 'uc' || s === 'uncommon') return 'Uncommon';
      if (s === 'r' || s === 'rare') return 'Rare';
      if (s === 'sr' || s === 'super rare') return 'Super Rare';
      if (s === 'sec' || s === 'secret rare') return 'Secret Rare';
      if (s === 'l' || s === 'leader') return 'Leader';
      if (s === 'sp' || s === 'special') return 'Special';
      return 'None';
    };

    // Robust comparator for codes like OP01-001, OP11-090 etc.
    const compareCardIds = (codeA: string | null | undefined, codeB: string | null | undefined): number => {
      const a = (codeA || '').toUpperCase();
      const b = (codeB || '').toUpperCase();
      const rx = /^([A-Z]+)(\d+)-(\d+)([A-Z]*)$/;
      const ma = a.match(rx);
      const mb = b.match(rx);
      if (ma && mb) {
        const seriesA = ma[1];
        const seriesB = mb[1];
        if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
        const setNumA = parseInt(ma[2], 10);
        const setNumB = parseInt(mb[2], 10);
        if (setNumA !== setNumB) return setNumA - setNumB;
        const cardNumA = parseInt(ma[3], 10);
        const cardNumB = parseInt(mb[3], 10);
        if (cardNumA !== cardNumB) return cardNumA - cardNumB;
        // Optional suffix compare (e.g., alt variants)
        return (ma[4] || '').localeCompare(mb[4] || '');
      }
      // Fallback to lexicographic
      return a.localeCompare(b);
    };

    let filtered = cards.filter(card => {
      const matchesSearch = card.card_name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());

      const colorTokens = (card.card_color || '')
        .toLowerCase()
        .split(/[\s,\/]+/)
        .filter(Boolean);
      const matchesColor =
        !selectedColor || colorTokens.includes(selectedColor.toLowerCase());

      // Check if card is collected based on normalized threshold
      const cardCount = collected[card.card_image_id] || 0;
      const rarityKey = normalizeRarity(card.rarity);
      const threshold = thresholds[rarityKey] ?? 1;
      const isCardCollected = cardCount >= threshold;

      // When showCollected is FALSE, hide collected cards
      const matchesCollected = showCollected || !isCardCollected;

      return matchesSearch && matchesColor && matchesCollected;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortType) {
        case 'id':
          return compareCardIds(a.card_image_id, b.card_image_id);
        case 'rarity':
          return normalizeRarity(a.rarity).localeCompare(normalizeRarity(b.rarity));
        case 'price-asc':
          return (a.market_price || 0) - (b.market_price || 0);
        case 'price-desc':
          return (b.market_price || 0) - (a.market_price || 0);
        case 'name':
        default:
          return a.card_name.localeCompare(b.card_name);
      }
    });

    return sorted;
  }, [cards, debouncedSearch, selectedColor, sortType, showCollected, thresholds, collected]);

  const renderCard = useCallback(({ item }: { item: Card }) => (
    <CardItem card={item} />
  ), []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Fetching cards for {setName}...</Text>
        <Text style={[styles.subtext, { color: theme.colors.mutedText }]}>(This may take a moment)</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.text }]}>No cards available for {setName}.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Results count */}
      <Text style={[styles.resultCount, { color: theme.colors.mutedText, backgroundColor: theme.colors.surface }]}>
        {filteredCards.length} of {cards.length} cards
      </Text>

      {/* Cards Grid */}
      <FlatList
        data={filteredCards}
        keyExtractor={item => item.card_image_id}
        numColumns={2}
        renderItem={renderCard}
        contentContainerStyle={styles.grid}
        extraData={collected}
        initialNumToRender={12}
        windowSize={6}
        removeClippedSubviews={false}
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Floating Filters Button */}
      <TouchableOpacity
        style={styles.filtersFab}
        onPress={() => setFiltersVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="options-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Filters Modal (Modern sheet) */}
      <Modal visible={filtersVisible} transparent animationType="fade">
        <View style={styles.filtersBackdrop}>
          <View style={[styles.filtersSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>Filters & Sort</Text>
              <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                <Text style={[styles.closeText, { color: theme.colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Search card names..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={theme.colors.mutedText}
            />

            {/* Color Filter */}
            <Text style={[styles.sectionLabel, { color: theme.colors.mutedText }]}>Color</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[
                  styles.colorBtn,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.chip },
                  !selectedColor && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedColor(null)}
              >
                <Text style={[styles.colorBtnText, { color: !selectedColor ? '#fff' : theme.colors.text }]}>All</Text>
              </TouchableOpacity>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorBtn,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.chip },
                    selectedColor === color && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() =>
                    setSelectedColor(selectedColor === color ? null : color)
                  }
                >
                  <Text style={[styles.colorBtnText, { color: selectedColor === color ? '#fff' : theme.colors.text }]}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Options */}
            <Text style={[styles.sectionLabel, { color: theme.colors.mutedText }]}>Sort</Text>
            <View style={styles.chipsRow}>
              {(['id', 'name', 'rarity', 'price-asc', 'price-desc'] as const).map(
                sort => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.sortBtn,
                      { backgroundColor: theme.colors.chip, borderColor: theme.colors.border },
                      sortType === sort && { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
                    ]}
                    onPress={() => setSortType(sort)}
                  >
                    <Text style={[styles.sortBtnText, { color: sortType === sort ? '#fff' : theme.colors.text }]}>
                      {sort === 'id' && 'Card ID'}
                      {sort === 'name' && 'Name'}
                      {sort === 'rarity' && 'Rarity'}
                      {sort === 'price-asc' && 'Price ↑'}
                      {sort === 'price-desc' && 'Price ↓'}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Show Collected Toggle */}
            <Text style={[styles.sectionLabel, { color: theme.colors.mutedText }]}>Display Options</Text>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                { backgroundColor: theme.colors.chip, borderColor: theme.colors.border },
                showCollected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => setShowCollected(!showCollected)}
            >
              <Ionicons
                name={showCollected ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={showCollected ? '#fff' : theme.colors.mutedText}
              />
              <Text style={[styles.toggleBtnText, { color: showCollected ? '#fff' : theme.colors.text }]}>
                Show Collected Cards
              </Text>
            </TouchableOpacity>

            {/* Reset */}
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: theme.colors.chip }]}
              onPress={() => {
                setSearchText('');
                setSelectedColor(null);
                setSortType('id');
                setShowCollected(true);
              }}
            >
              <Text style={[styles.resetBtnText, { color: theme.colors.text }]}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  filterSection: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  colorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  colorBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sortSection: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultCount: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    padding: 14,
  },
  filtersFab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2C3930',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  filtersFabIcon: {
    fontSize: 24,
    color: '#fff',
  },
  filtersBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtersSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  resetBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
