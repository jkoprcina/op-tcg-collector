import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, Alert, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCollections } from '../context/CollectionsContext';
import { CardItem, useToast } from '../components';
import { getTheme } from '../theme';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation';

export type CollectionDetailProps = NativeStackScreenProps<RootStackParamList, 'CollectionDetail'>;

export function CollectionDetailScreen({ route }: CollectionDetailProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collectionId } = route.params;
  const { getCollection, removeCardFromCollection } = useCollections();
  const collection = getCollection(collectionId);
  const [searchText, setSearchText] = useState('');
  const toast = useToast();

  const filteredCards = useMemo(() => {
    if (!collection) return [];
    if (!searchText.trim()) return collection.cards;
    const query = searchText.toLowerCase();
    return collection.cards.filter(card =>
      card.card_name.toLowerCase().includes(query) ||
      card.card_set_id.toLowerCase().includes(query)
    );
  }, [collection, searchText]);

  const exportAsJSON = async () => {
    if (!collection) return;
    const json = JSON.stringify(collection, null, 2);
    try {
      await Share.share({
        title: `${collection.name} Collection`,
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
    const rows = collection.cards.map(c =>
      `"${c.card_name}","${c.card_set_id}","${c.set_name}","${c.card_type || ''}","${c.card_color || ''}","${c.rarity}","${c.card_cost || ''}","${c.card_power || ''}"`
    ).join('\n');
    const csv = header + rows;
    try {
      await Share.share({
        title: `${collection.name} Collection`,
        message: csv,
      });
      await hapticFeedback.success();
    } catch (err) {
      toast.show('Failed to export', 'error');
    }
  };

  const shareList = async () => {
    if (!collection) return;
    const text = `${collection.name} (${collection.cards.length} cards):\n\n` +
      collection.cards.map((c, i) => `${i + 1}. ${c.card_name} (${c.card_set_id})`).join('\n');
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
    Alert.alert(`Remove "${cardName}"?`, 'Remove from this collection?', [
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

  if (!collection) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.empty, { color: theme.colors.mutedText }]}>Collection not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{collection.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareList} style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Export Collection', 'Choose format', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'JSON', onPress: exportAsJSON },
                { text: 'CSV', onPress: exportAsCSV },
              ]);
            }}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
        placeholder="Search cards..."
        value={searchText}
        onChangeText={setSearchText}
        placeholderTextColor={theme.colors.mutedText}
      />

      <Text style={[styles.count, { color: theme.colors.mutedText }]}>
        {filteredCards.length} of {collection.cards.length} cards
      </Text>

      <FlatList
        data={filteredCards}
        keyExtractor={(item, index) => `${item.card_image_id}-${index}`}
        numColumns={2}
        renderItem={({ item }) => <CardItem card={item} />}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedText }]}>No cards match search</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  count: {
    fontSize: 12,
    marginBottom: 8,
  },
  grid: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    marginTop: 16,
  },
});
