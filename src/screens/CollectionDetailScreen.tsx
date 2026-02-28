import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, Alert, TextInput, Modal, useWindowDimensions, Platform, ScrollView, ActivityIndicator, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCollections } from '../context/CollectionsContext';
import { useSystemCollections } from '../context/SystemCollectionsContext';
import { useToast } from '../components';
import { getTheme } from '../theme';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { isAlternateArtCard, useCardFilters } from '../context/CardFilterContext';
import type { RootStackParamList } from '../navigation';
import type { Card } from '../types';
import { Image } from 'expo-image';
import { readSetsCache, fetchSetsAndCache, readCardsCache, fetchCardsAndCache } from '../api/optcg';
import type { SetSummary } from '../types';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { getCardsByImageIds } from '../lib/supabase';
import { exportBinderAsImage, shareBinderImage } from '../utils/exportBinder';
import { formatPrice } from '../utils/price';
import { isSystemCollection, SYSTEM_COLLECTION_IDS } from '../utils/systemCollections';

export type CollectionDetailProps = NativeStackScreenProps<RootStackParamList, 'CollectionDetail'>;

export function CollectionDetailScreen({ route }: CollectionDetailProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { currency } = useSettings();
  const { width, height } = useWindowDimensions();
  const isSinglePage = Platform.OS !== 'web' || width < 768;
  const { collectionId } = route.params;
  const { collections, getCollection, removeCardFromCollection, addCardToCollection, updateBinderSize, reorderCollectionCards } = useCollections();
  const { systemCollections, refreshSystemCollections } = useSystemCollections();
  const toast = useToast();
  
  // Check if this is a system collection
  const isSystem = isSystemCollection(collectionId);
  const collection = isSystem 
    ? systemCollections.find(c => c.id === collectionId)
    : getCollection(collectionId);
    
  const [binderSize, setBinderSize] = useState<2 | 3 | 4>(3);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [binderModalVisible, setBinderModalVisible] = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [bulkSets, setBulkSets] = useState<SetSummary[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [bulkAltOnly, setBulkAltOnly] = useState(true);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const spreadsRef = useRef<FlatList<{ left: Card[] | null; right: Card[] | null; index: number }>>(null);
  const pagesRef = useRef<FlatList<Card[]>>(null);
  const binderViewRef = useRef<View>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [reorderVisible, setReorderVisible] = useState(false);
  const [reorderData, setReorderData] = useState<Card[]>([]);
  const [selectedReorderIndex, setSelectedReorderIndex] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sortLoading, setSortLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [sortMode, setSortMode] = useState<'binder' | 'set'>('binder'); // Toggle between binder order and set/ID order
  const { getCount } = useCollectedCards();
  const { isCardVisible } = useCardFilters();

  useEffect(() => {
    if (!collection) return;
    if (collection.binderSize === 2 || collection.binderSize === 3 || collection.binderSize === 4) {
      setBinderSize(collection.binderSize);
    }
  }, [collection]);

  const visibleCards = useMemo(() => {
    if (!collection) return [];
    // System collections should show all cards regardless of rarity filters
    let filtered = isSystem ? collection.cards : collection.cards.filter(card => isCardVisible(card));
    
    // Apply sort based on sortMode
    if (sortMode === 'set') {
      filtered = filtered.sort((a, b) => {
        // Parse card_image_id like "OP01-031_p1" into set and number
        const parseCardImageId = (cardImageId: string) => {
          const parts = (cardImageId || '').split('_')[0]; // Remove variant suffix (_p1, _m1, etc)
          const setAndNum = parts.split('-');
          // Extract set from like "OP01" -> "OP01"
          // Extract number from like "031"
          const setMatch = (setAndNum[0] || '').match(/^([A-Z]+)(\d+)$/);
          const set = setMatch ? setMatch[1] + setMatch[2] : (setAndNum[0] || '');
          const num = parseInt(setAndNum[1] || '0', 10);
          return { set, num };
        };
        
        const aParsed = parseCardImageId(a.card_image_id);
        const bParsed = parseCardImageId(b.card_image_id);
        
        // First sort by set (OP01, OP02, etc.)
        const setCompare = aParsed.set.localeCompare(bParsed.set);
        if (setCompare !== 0) return setCompare;
        
        // Then sort by card number (001, 002, etc.)
        return aParsed.num - bParsed.num;
      });
    }
    
    return filtered;
  }, [collection, isCardVisible, sortMode]);

  useEffect(() => {
    const missing = visibleCards
      .filter(card => !card.card_image)
      .map(card => card.card_image_id || card.card_set_id)
      .filter((id): id is string => Boolean(id) && !imageOverrides[id]);

    if (missing.length === 0) return;

    (async () => {
      const dbCards = await getCardsByImageIds(missing);
      if (!dbCards.length) return;
      setImageOverrides(prev => {
        let changed = false;
        const next = { ...prev };
        for (const db of dbCards) {
          if (db.card_image_id && db.card_image) {
            if (!next[db.card_image_id]) {
              next[db.card_image_id] = db.card_image;
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    })();
  }, [visibleCards, imageOverrides]);

  const toggleSelect = (cardId: string) => {
    setSelectedIds(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
  };

  const removeSelected = () => {
    if (!collection || selectedIds.length === 0) return;
    Alert.alert(`Remove ${selectedIds.length} cards?`, 'This will remove them from this binder.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          for (const id of selectedIds) {
            await removeCardFromCollection(collectionId, id);
          }
          toast.show('Cards removed', 'info');
          clearSelection();
        },
      },
    ]);
  };

  const addSelectedToCollection = async (targetCollectionId: string) => {
    if (!collection || selectedIds.length === 0) return;
    const cardsToAdd = collection.cards.filter(c => selectedIds.includes(c.card_image_id));
    for (const card of cardsToAdd) {
      await addCardToCollection(targetCollectionId, card);
    }
    toast.show('Cards added to binder', 'success');
    setAddModalVisible(false);
    clearSelection();
  };

  const parseCsv = (csv: string) => {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    return lines.slice(1).map(line => {
      const matches = line.match(/"([^"]*)"/g);
      const parts = matches ? matches.map(m => m.replace(/"/g, '')) : line.split(',');
      const [card_name, card_set_id, set_name, card_type, card_color, rarity, card_cost, card_power] = parts;
      return {
        card_image_id: card_set_id || card_name,
        card_name: card_name || 'Unknown',
        card_set_id: card_set_id || '',
        set_name: set_name || '',
        card_type: card_type || null,
        card_color: card_color || null,
        rarity: rarity || 'None',
        card_cost: card_cost || null,
        card_power: card_power || null,
        card_image: '',
      } as any;
    });
  };

  const importCards = async () => {
    if (!collection || !importText.trim()) return;
    try {
      let cards: any[] = [];
      if (importText.trim().startsWith('{') || importText.trim().startsWith('[')) {
        const parsed = JSON.parse(importText);
        if (Array.isArray(parsed)) cards = parsed;
        else if (Array.isArray(parsed.cards)) cards = parsed.cards;
      } else {
        cards = parseCsv(importText);
      }

      for (const card of cards) {
        if (!card.card_image_id) continue;
        await addCardToCollection(collectionId, card);
      }
      toast.show('Import complete', 'success');
      setImportVisible(false);
      setImportText('');
    } catch (err) {
      toast.show('Import failed', 'error');
    }
  };

  const exportAsJSON = async () => {
    if (!collection) return;
    const json = JSON.stringify({ ...collection, cards: visibleCards }, null, 2);
    try {
      await Share.share({
        title: `${collection.name} Binder`,
        message: json,
      });
      await hapticFeedback.success();
    } catch (err) {
      toast.show('Failed to export', 'error');
    }
  };

  const exportAsCSV = async () => {
    if (!collection) return;
    const header = 'Card Name,Card ID,Set,Type,Color,Rarity,Cost,Power\n';
    const rows = visibleCards.map(c =>
      `"${c.card_name}","${c.card_set_id}","${c.set_name}","${c.card_type || ''}","${c.card_color || ''}","${c.rarity}","${c.card_cost || ''}","${c.card_power || ''}"`
    ).join('\n');
    const csv = header + rows;
    try {
      await Share.share({
        title: `${collection.name} Binder`,
        message: csv,
      });
      await hapticFeedback.success();
    } catch (err) {
      toast.show('Failed to export', 'error');
    }
  };

  const shareList = async () => {
    if (!collection) return;
    const text = `${collection.name} (${visibleCards.length} cards):\n\n` +
      visibleCards.map((c, i) => `${i + 1}. ${c.card_name} (${c.card_set_id})`).join('\n');
    try {
      await Share.share({
        title: collection.name,
        message: text,
      });
      await hapticFeedback.success();
    } catch (err) {
      toast.show('Failed to share', 'error');
    }
  };

  const onRemoveCard = (cardImageId: string, cardName: string) => {
    Alert.alert(`Remove "${cardName}"?`, 'Remove from this binder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeCardFromCollection(collectionId, cardImageId);
          await hapticFeedback.light();
          toast.show('Card removed', 'info');
        },
      },
    ]);
  };

  const openReorder = () => {
    if (!collection) return;
    setReorderData([...visibleCards]);
    setSelectedReorderIndex(null);
    setReorderVisible(true);
  };

  const saveReorder = async () => {
    setSaveLoading(true);
    try {
      // Filter out any cards without collection_card_id
      const validCards = reorderData.filter(card => card.collection_card_id);
      
      if (validCards.length !== reorderData.length) {
        toast.show(`Warning: ${reorderData.length - validCards.length} cards skipped (missing ID)`, 'warning');
      }
      
      await reorderCollectionCards(collectionId, validCards);
      
      // Close modal first, then show toast
      setReorderVisible(false);
      setSelectedReorderIndex(null);
      setReorderData([]); // Clear reorder data to force refresh
      
      // Show success toast after a brief delay to ensure modal is closed
      setTimeout(() => {
        toast.show('Binder order updated', 'success');
      }, 100);
    } catch (error) {
      console.error('[saveReorder] Error:', error);
      toast.show('Failed to reorder', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReorderCardClick = (index: number) => {
    if (selectedReorderIndex === null) {
      // First click - select the card
      setSelectedReorderIndex(index);
    } else {
      // Second click - move the card to this position
      const newData = [...reorderData];
      const [movedCard] = newData.splice(selectedReorderIndex, 1);
      newData.splice(index, 0, movedCard);
      setReorderData(newData);
      setSelectedReorderIndex(null);
    }
  };

  const loadBulkSets = async () => {
    setBulkLoading(true);
    try {
      const cached = await readSetsCache();
      const sets = cached?.data?.length ? cached.data : (await fetchSetsAndCache()).data;
      setBulkSets(sets);
      if (!selectedSetId && sets.length > 0) {
        setSelectedSetId(sets[0].id);
      }
    } catch {
      toast.show('Failed to load sets', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const openBulkModal = async () => {
    setBulkVisible(true);
    if (bulkSets.length === 0) {
      await loadBulkSets();
    }
  };

  const addBulkCards = async () => {
    if (!selectedSetId) return;
    setBulkLoading(true);
    try {
      const cached = await readCardsCache(selectedSetId);
      const cards = cached?.data?.length ? cached.data : (await fetchCardsAndCache(selectedSetId)).data;
      const filtered = bulkAltOnly ? cards.filter(card => isAlternateArtCard(card)) : cards;
      
      // Sort by card_image_id to maintain set order
      const sorted = [...filtered].sort((a, b) => {
        const aNum = parseInt(a.card_image_id?.split('_')[1] || '0', 10);
        const bNum = parseInt(b.card_image_id?.split('_')[1] || '0', 10);
        return aNum - bNum;
      });

      for (const card of sorted) {
        await addCardToCollection(collectionId, card);
      }

      toast.show(`Added ${sorted.length} cards`, 'success');
      setBulkVisible(false);
    } catch {
      toast.show('Bulk add failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const sortBinderBySetAndId = async () => {
    setSortMode(prev => {
      const newMode = prev === 'binder' ? 'set' : 'binder';
      toast.show(`Sorted by ${newMode === 'set' ? 'Set & ID' : 'Binder Order'}`, 'success');
      return newMode;
    });
  };

  const duplicateCard = async (card: Card) => {
    try {
      await addCardToCollection(collectionId, card);
      toast.show('Card duplicated', 'success');
    } catch {
      toast.show('Failed to duplicate card', 'error');
    }
  };

  const exportBinderImage = async () => {
    if (!collection || visibleCards.length === 0) {
      toast.show('No cards to export', 'error');
      return;
    }

    setExportLoading(true);
    try {
      const imagePath = await exportBinderAsImage(binderViewRef.current, collection.name);
      await shareBinderImage(imagePath, collection.name);
      toast.show('Binder exported and shared!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      toast.show('Failed to export binder', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const pageCapacity = binderSize * binderSize;
  const spreadWidth = width;
  const spineWidth = 8;
  const spreadGap = 8;
  const pageWidth = Math.max(140, (spreadWidth - spineWidth - spreadGap) / 2);
  const pageHeight = isSinglePage ? Math.max(320, height - 320) : undefined;

  const pages = useMemo(() => {
    if (!visibleCards.length) return [] as Array<Card[] | null>;
    const list: Array<Card[] | null> = [];
    for (let i = 0; i < visibleCards.length; i += pageCapacity) {
      list.push(visibleCards.slice(i, i + pageCapacity));
    }

    if (list.length > 1 && list.length % 2 === 1) {
      list.splice(1, 0, null);
    }

    return list;
  }, [visibleCards, pageCapacity]);

  const spreads = useMemo(() => {
    if (pages.length === 0) {
      return [{ left: null as Card[] | null, right: null as Card[] | null, index: 0 }];
    }

    const list: { left: Card[] | null; right: Card[] | null; index: number }[] = [];
    list.push({ left: null, right: pages[0] || null, index: 0 });
    let pageIndex = 1;
    let spreadIndex = 1;
    while (pageIndex < pages.length) {
      list.push({
        left: pages[pageIndex] || null,
        right: pages[pageIndex + 1] || null,
        index: spreadIndex,
      });
      pageIndex += 2;
      spreadIndex += 1;
    }
    return list;
  }, [pages]);

  const singlePages = useMemo(() => pages.filter((page): page is Card[] => Array.isArray(page)), [pages]);

  useEffect(() => {
    if (currentSpreadIndex >= spreads.length) {
      setCurrentSpreadIndex(Math.max(0, spreads.length - 1));
    }
  }, [currentSpreadIndex, spreads.length]);

  useEffect(() => {
    if (currentPageIndex >= singlePages.length) {
      setCurrentPageIndex(Math.max(0, singlePages.length - 1));
    }
  }, [currentPageIndex, singlePages.length]);

  const formatCardPrice = (card: Card) => {
    const price = card.market_price ?? card.inventory_price;
    return formatPrice(price, currency, '—');
  };

  const goToSpread = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(spreads.length - 1, nextIndex));
    setCurrentSpreadIndex(clamped);
    spreadsRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  const goToPage = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(singlePages.length - 1, nextIndex));
    setCurrentPageIndex(clamped);
    pagesRef.current?.scrollToIndex({ index: clamped, animated: true });
  };

  // Swipe gesture handler for binder navigation
  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only capture swipes in the card area, not in header/buttons area
        // Header is typically around 60-80 pixels from top
        return evt.nativeEvent.pageY > 100;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only set responder if we have horizontal movement
        return evt.nativeEvent.pageY > 100 && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        const threshold = 50; // Minimum swipe distance in pixels
        
        if (isSinglePage) {
          // Single page mode: swipe left = next, right = prev
          if (dx < -threshold) {
            goToPage(currentPageIndex + 1);
          } else if (dx > threshold) {
            goToPage(currentPageIndex - 1);
          }
        } else {
          // Spread mode (two pages): swipe left = next, right = prev
          if (dx < -threshold) {
            goToSpread(currentSpreadIndex + 1);
          } else if (dx > threshold) {
            goToSpread(currentSpreadIndex - 1);
          }
        }
      },
    })
  ).current;

  const onUpdateBinderSize = async (size: 2 | 3 | 4) => {
    setBinderSize(size);
    setBinderModalVisible(false);
    try {
      await updateBinderSize(collectionId, size);
    } catch {
      toast.show('Failed to update binder layout', 'error');
    }
  };

  if (!collection) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.empty, { color: theme.colors.mutedText }]}>Binder not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={{ flex: 1 }} {...swipeResponder.panHandlers} ref={binderViewRef} collapsable={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{collection.name}</Text>
          <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={openReorder}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="swap-vertical-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openBulkModal}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="layers-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBinderModalVisible(true)}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="grid-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportBinderImage}
            disabled={exportLoading}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: exportLoading ? 0.6 : 1 }]}
            title="Export as image"
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectMode(prev => !prev)}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name={selectMode ? 'checkmark-done-outline' : 'checkbox-outline'} size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              sortBinderBySetAndId();
            }}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            title="Sort binder"
          >
            <Ionicons name={sortMode === 'set' ? 'arrow-down-outline' : 'arrow-up-outline'} size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          {selectMode && (
            <TouchableOpacity
              onPress={() => setAddModalVisible(true)}
              style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {selectMode && (
            <TouchableOpacity
              onPress={removeSelected}
              style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Ionicons name="trash-outline" size={22} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {visibleCards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No cards in binder</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.mutedText }]}>Add cards to get started</Text>
        </View>
      ) : isSinglePage ? (
        <FlatList
          ref={pagesRef}
          data={singlePages}
          keyExtractor={(_, index) => `page-${index}`}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.binderList}
          getItemLayout={(_, index) => ({ length: spreadWidth, offset: spreadWidth * index, index })}
          renderItem={({ item }) => (
            <View style={[styles.spread, { width: spreadWidth }]}>
              <View
                style={[
                  styles.page,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, width: spreadWidth, height: pageHeight },
                ]}
              >
                <View style={styles.pageGrid}>
                  {[...item, ...Array(Math.max(0, pageCapacity - item.length)).fill(null)].map((card, index) => (
                    <View
                      key={`single-${index}`}
                      style={[styles.cardSlot, { width: `${100 / binderSize}%`, height: pageHeight ? pageHeight / binderSize : undefined }]}
                    >
                      {card ? (
                        <View style={styles.cardFrame}>
                          <TouchableOpacity
                            style={styles.cardTouchable}
                            activeOpacity={0.9}
                            onPress={() => {
                              if (selectMode) {
                                toggleSelect(card.card_image_id);
                              }
                            }}
                          >
                            <Image
                              source={{ uri: imageOverrides[card.card_image_id || card.card_set_id || ''] || card.card_image }}
                              style={styles.cardImage}
                              contentFit="cover"
                              cachePolicy="disk"
                            />
                            {getCount(card.card_image_id) === 0 && <View style={styles.grayOverlay} />}
                            {collectionId === SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS ? (() => {
                              const count = getCount(card.card_image_id);
                              return count < 4 && (
                                <View style={[styles.playsetBadge, { backgroundColor: '#ff9800' }]}>
                                  <Text style={styles.playsetBadgeText}>{4 - count}</Text>
                                </View>
                              );
                            })() : (
                              <TouchableOpacity
                                style={[styles.addOverlayBtn, { backgroundColor: theme.colors.success, top: 6, right: 6, left: 'auto' }]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  duplicateCard(card);
                                }}
                              >
                                <Ionicons name="add-outline" size={18} color="#fff" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.addOverlayBtn, { backgroundColor: theme.colors.error }]}
                              onPress={(e) => {
                                e.stopPropagation();
                                const cardId = card.card_image_id || card.card_set_id;
                                if (!cardId) {
                                  toast.show('Unable to remove card', 'error');
                                  return;
                                }
                                Alert.alert(
                                  'Remove Card',
                                  `Remove "${card.card_name}" from this binder?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Remove',
                                      style: 'destructive',
                                      onPress: async () => {
                                        await removeCardFromCollection(collectionId, cardId, card.collection_card_id);
                                        toast.show('Card removed', 'info');
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            {selectMode && (
                              <View
                                style={[
                                  styles.selectBadge,
                                  {
                                    backgroundColor: selectedIds.includes(card.card_image_id)
                                      ? theme.colors.primary
                                      : theme.colors.surface,
                                    borderColor: theme.colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: selectedIds.includes(card.card_image_id) ? '#fff' : theme.colors.mutedText,
                                    fontSize: 12,
                                    fontWeight: '700',
                                  }}
                                >
                                  {selectedIds.includes(card.card_image_id) ? '✓' : ''}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <Text style={[styles.priceText, { color: theme.colors.mutedText }]}>{formatCardPrice(card)}</Text>
                        </View>
                      ) : (
                        <View style={[styles.emptySlot, { borderColor: theme.colors.border }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          ref={spreadsRef}
          data={spreads}
          keyExtractor={(item) => `spread-${item.index}`}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.binderList}
          getItemLayout={(_, index) => ({ length: spreadWidth, offset: spreadWidth * index, index })}
          renderItem={({ item }) => (
            <View style={[styles.spread, { width: spreadWidth }]}>
              <View
                style={[
                  styles.page,
                  item.left ? null : styles.pageEmpty,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, width: pageWidth },
                ]}
              >
                {item.left && (
                  <View style={styles.pageGrid}>
                    {[...item.left, ...Array(Math.max(0, pageCapacity - item.left.length)).fill(null)].map(
                      (card, index) => (
                        <View
                          key={`left-${index}`}
                          style={[styles.cardSlot, { width: `${100 / binderSize}%` }]}
                        >
                          {card ? (
                            <View style={styles.cardFrame}>
                              <TouchableOpacity
                                style={styles.cardTouchable}
                                activeOpacity={0.9}
                                onPress={() => {
                                  if (selectMode) {
                                    toggleSelect(card.card_image_id);
                                  }
                                }}
                              >
                                <Image
                                  source={{ uri: imageOverrides[card.card_image_id || card.card_set_id || ''] || card.card_image }}
                                  style={styles.cardImage}
                                  contentFit="cover"
                                  cachePolicy="disk"
                                />
                                {getCount(card.card_image_id) === 0 && <View style={styles.grayOverlay} />}
                                <TouchableOpacity
                                  style={[styles.addOverlayBtn, { backgroundColor: theme.colors.success, top: 6, right: 6, left: 'auto' }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    duplicateCard(card);
                                  }}
                                >
                                  <Ionicons name="add-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.addOverlayBtn, { backgroundColor: theme.colors.error }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    const cardId = card.card_image_id || card.card_set_id;
                                    if (!cardId) {
                                      toast.show('Unable to remove card', 'error');
                                      return;
                                    }
                                    Alert.alert(
                                      'Remove Card',
                                      `Remove "${card.card_name}" from this binder?`,
                                      [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: 'Remove',
                                          style: 'destructive',
                                          onPress: async () => {
                                            await removeCardFromCollection(collectionId, cardId, card.collection_card_id);
                                            toast.show('Card removed', 'info');
                                          },
                                        },
                                      ]
                                    );
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                                {selectMode && (
                                  <View
                                    style={[
                                      styles.selectBadge,
                                      {
                                        backgroundColor: selectedIds.includes(card.card_image_id)
                                          ? theme.colors.primary
                                          : theme.colors.surface,
                                        borderColor: theme.colors.border,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        color: selectedIds.includes(card.card_image_id) ? '#fff' : theme.colors.mutedText,
                                        fontSize: 12,
                                        fontWeight: '700',
                                      }}
                                    >
                                      {selectedIds.includes(card.card_image_id) ? '✓' : ''}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                              <Text style={[styles.priceText, { color: theme.colors.mutedText }]}>{formatCardPrice(card)}</Text>
                            </View>
                          ) : (
                            <View style={[styles.emptySlot, { borderColor: theme.colors.border }]} />
                          )}
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
              <View style={[styles.spine, { backgroundColor: theme.colors.border }]} />
              <View
                style={[
                  styles.page,
                  item.right ? null : styles.pageEmpty,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, width: pageWidth },
                ]}
              >
                {item.right && (
                  <View style={styles.pageGrid}>
                    {[...item.right, ...Array(Math.max(0, pageCapacity - item.right.length)).fill(null)].map(
                      (card, index) => (
                        <View
                          key={`right-${index}`}
                          style={[styles.cardSlot, { width: `${100 / binderSize}%` }]}
                        >
                          {card ? (
                            <View style={styles.cardFrame}>
                              <TouchableOpacity
                                style={styles.cardTouchable}
                                activeOpacity={0.9}
                                onPress={() => {
                                  if (selectMode) {
                                    toggleSelect(card.card_image_id);
                                  }
                                }}
                              >
                                <Image
                                  source={{ uri: imageOverrides[card.card_image_id || card.card_set_id || ''] || card.card_image }}
                                  style={styles.cardImage}
                                  contentFit="cover"
                                  cachePolicy="disk"
                                />
                                {getCount(card.card_image_id) === 0 && <View style={styles.grayOverlay} />}
                                {collectionId === SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS ? (() => {
                                  const count = getCount(card.card_image_id);
                                  return count < 4 && (
                                    <View style={[styles.playsetBadge, { backgroundColor: '#ff9800' }]}>
                                      <Text style={styles.playsetBadgeText}>{4 - count}</Text>
                                    </View>
                                  );
                                })() : (
                                  <TouchableOpacity
                                    style={[styles.addOverlayBtn, { backgroundColor: theme.colors.success, top: 6, right: 6, left: 'auto' }]}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      duplicateCard(card);
                                    }}
                                  >
                                    <Ionicons name="add-outline" size={18} color="#fff" />
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={[styles.addOverlayBtn, { backgroundColor: theme.colors.error }]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    const cardId = card.card_image_id || card.card_set_id;
                                    if (!cardId) {
                                      toast.show('Unable to remove card', 'error');
                                      return;
                                    }
                                    Alert.alert(
                                      'Remove Card',
                                      `Remove "${card.card_name}" from this binder?`,
                                      [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: 'Remove',
                                          style: 'destructive',
                                          onPress: async () => {
                                            await removeCardFromCollection(collectionId, cardId, card.collection_card_id);
                                            toast.show('Card removed', 'info');
                                          },
                                        },
                                      ]
                                    );
                                  }}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                                {selectMode && (
                                  <View
                                    style={[
                                      styles.selectBadge,
                                      {
                                        backgroundColor: selectedIds.includes(card.card_image_id)
                                          ? theme.colors.primary
                                          : theme.colors.surface,
                                        borderColor: theme.colors.border,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        color: selectedIds.includes(card.card_image_id) ? '#fff' : theme.colors.mutedText,
                                        fontSize: 12,
                                        fontWeight: '700',
                                      }}
                                    >
                                      {selectedIds.includes(card.card_image_id) ? '✓' : ''}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                              <Text style={[styles.priceText, { color: theme.colors.mutedText }]}>{formatCardPrice(card)}</Text>
                            </View>
                          ) : (
                            <View style={[styles.emptySlot, { borderColor: theme.colors.border }]} />
                          )}
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Add to Collection Modal */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add to binder</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {collections.filter(c => c.id !== collectionId).map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => addSelectedToCollection(c.id)}
                  style={[styles.modalRow, { borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.modalRowText, { color: theme.colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Binder Size Modal */}
      <Modal visible={binderModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Binder layout</Text>
            {[2, 3, 4].map(size => (
              <TouchableOpacity
                key={`size-${size}`}
                onPress={() => onUpdateBinderSize(size as 2 | 3 | 4)}
                style={[styles.modalRow, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.modalRowText, { color: theme.colors.text }]}>
                  {size}x{size}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setBinderModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={importVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Import Cards</Text>
            <TextInput
              style={[styles.importInput, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Paste CSV or JSON here"
              placeholderTextColor={theme.colors.mutedText}
              value={importText}
              onChangeText={setImportText}
              multiline
            />
            <View style={styles.importActions}>
              <TouchableOpacity onPress={() => setImportVisible(false)}>
                <Text style={[styles.modalCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={importCards}>
                <Text style={[styles.modalConfirm, { color: theme.colors.primary }]}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal visible={bulkVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Bulk add cards</Text>

            <Text style={[styles.modalLabel, { color: theme.colors.mutedText }]}>Set</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {bulkSets.map(set => (
                <TouchableOpacity
                  key={set.id}
                  onPress={() => setSelectedSetId(set.id)}
                  style={[styles.modalRow, { borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.modalRowText, { color: theme.colors.text }]}>
                    {set.id} · {set.name}
                  </Text>
                  {selectedSetId === set.id && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setBulkAltOnly(prev => !prev)}
              style={[styles.toggleRow, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.modalRowText, { color: theme.colors.text }]}>Alt art only</Text>
              <Ionicons name={bulkAltOnly ? 'checkbox-outline' : 'square-outline'} size={18} color={theme.colors.primary} />
            </TouchableOpacity>

            <View style={styles.importActions}>
              <TouchableOpacity onPress={() => setBulkVisible(false)}>
                <Text style={[styles.modalCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addBulkCards} disabled={bulkLoading}>
                <Text style={[styles.modalConfirm, { color: theme.colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reorder Modal */}
      <Modal visible={reorderVisible} animationType="slide">
        <SafeAreaView style={[styles.reorderContainer, { backgroundColor: theme.colors.background }]}>
          <FlatList
            data={reorderData}
            keyExtractor={(item, index) => `${item.collection_card_id || item.card_image_id}-${index}`}
            numColumns={binderSize}
            key={binderSize}
            ListHeaderComponent={
              <View style={[styles.reorderHeader, { backgroundColor: theme.colors.background }]}>
                <TouchableOpacity 
                  onPress={() => {
                    setReorderVisible(false);
                    setSelectedReorderIndex(null);
                    setReorderData([]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.reorderCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.reorderTitle, { color: theme.colors.text }]}>Reorder binder</Text>
                <TouchableOpacity 
                  onPress={() => {
                    saveReorder();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={[styles.reorderSave, { color: theme.colors.primary }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            }
            stickyHeaderIndices={[0]}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handleReorderCardClick(index)}
                style={[
                  styles.reorderItem,
                  { borderColor: theme.colors.border },
                  selectedReorderIndex === index && { borderColor: theme.colors.primary, borderWidth: 3 }
                ]}
              >
                <Image
                  source={{ uri: imageOverrides[item.card_image_id || item.card_set_id || ''] || item.card_image }}
                  style={styles.reorderImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                {selectedReorderIndex === index && (
                  <View style={[styles.reorderSelectedBadge, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="move-outline" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.reorderGrid}
          />
        </SafeAreaView>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  count: {
    fontSize: 12,
    marginBottom: 8,
  },
  binderList: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  spread: {
    flexDirection: 'row',
    gap: 8,
  },
  spine: {
    width: 8,
    borderRadius: 2,
    marginVertical: 10,
  },
  page: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  pageEmpty: {
    opacity: 0.35,
  },
  pageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: '100%',
  },
  cardSlot: {
    padding: 4,
  },
  cardFrame: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  cardTouchable: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 63 / 88,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
  },
  addOverlayBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptySlot: {
    borderWidth: 1,
    borderRadius: 8,
    aspectRatio: 63 / 88,
    backgroundColor: 'transparent',
  },
  selectBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  pagerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 24,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    borderRadius: 16,
    padding: 18,
    maxHeight: '80%',
  },
  modalList: {
    maxHeight: 320,
  },
  modalListContent: {
    paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  modalRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancel: {
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  modalConfirm: {
    fontWeight: '700',
  },
  importInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 120,
    padding: 10,
    marginBottom: 12,
  },
  importActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reorderContainer: {
    flex: 1,
    paddingTop: 12,
  },
  reorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 12,
    zIndex: 1000,
    elevation: 5,
  },
  reorderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reorderCancel: {
    fontWeight: '600',
    fontSize: 16,
    padding: 8,
  },
  reorderSave: {
    fontWeight: '700',
    fontSize: 16,
    padding: 8,
  },
  reorderGrid: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  reorderItem: {
    flex: 1,
    margin: 6,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reorderImage: {
    width: '100%',
    aspectRatio: 63 / 88,
  },
  reorderSelectedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  playsetBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  playsetBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
