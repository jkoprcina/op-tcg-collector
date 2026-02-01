import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal } from 'react-native';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { Card } from '../types';
import { useCollections } from '../context/CollectionsContext';
import { hapticFeedback } from '../utils/haptics';
import { useToast } from './Toast';

export type AddToCollectionModalProps = {
  card: Card;
  visible: boolean;
  onClose: () => void;
};

export function AddToCollectionModal({ card, visible, onClose }: AddToCollectionModalProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collections, addCardToCollection, createCollection, getCardCountInCollection } = useCollections();
  const [name, setName] = useState('');
  const toast = useToast();

  const addTo = async (collectionId: string) => {
    const count = getCardCountInCollection(collectionId, card.card_image_id);
    if (count > 0) {
      toast.show(`Already have ${count} copy in this collection`, 'info', 2000);
    }
    await addCardToCollection(collectionId, card);
    await hapticFeedback.success();
    toast.show('Card added!', 'success');
    onClose();
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    const col = await createCollection(name.trim());
    setName('');
    await addCardToCollection(col.id, card);
    await hapticFeedback.success();
    toast.show(`Added to "${col.name}"`, 'success');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add to Collection</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeText, { color: theme.colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardName, { color: theme.colors.text }]}>{card.card_name}</Text>
          <Text style={[styles.cardSub, { color: theme.colors.mutedText }]}>{card.card_set_id}</Text>

          <Text style={[styles.section, { color: theme.colors.text }]}>Existing Collections</Text>
          <FlatList
            data={collections}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => addTo(item.id)}>
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemSub, { color: theme.colors.mutedText }]}>{item.cards.length} cards</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedText }]}>No collections yet</Text>}
          />

          <Text style={[styles.section, { color: theme.colors.text }]}>Create New</Text>
          <View style={styles.newRow}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Collection name"
              placeholderTextColor={theme.colors.mutedText}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.colors.primary }]} onPress={createAndAdd}>
              <Text style={styles.createText}>Create + Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeText: {
    fontWeight: '700',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 13,
    marginBottom: 14,
  },
  section: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  item: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 13,
  },
  empty: {
    marginBottom: 14,
  },
  newRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontWeight: '700',
  },
});
