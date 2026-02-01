import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCollections } from '../context/CollectionsContext';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../navigation';

export type AddToCollectionProps = NativeStackScreenProps<RootStackParamList, 'AddToCollection'>;

export function AddToCollectionScreen({ route, navigation }: AddToCollectionProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { card } = route.params;
  const { collections, createCollection, addCardToCollection } = useCollections();
  const [name, setName] = useState('');

  const addTo = async (collectionId: string) => {
    await addCardToCollection(collectionId, card);
    Alert.alert('Added', `Added to ${collections.find(c => c.id === collectionId)?.name || 'collection'}`);
    navigation.goBack();
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    const col = await createCollection(name.trim());
    setName('');
    await addCardToCollection(col.id, card);
    Alert.alert('Created', `Created ${col.name} and added card`);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Add to Collection</Text>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{card.card_name}</Text>
      <Text style={[styles.cardSub, { color: theme.colors.mutedText }]}>{card.card_set_id}</Text>

      <Text style={[styles.section, { color: theme.colors.text }]}>Existing Collections</Text>
      <FlatList
        data={collections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} 
            onPress={() => addTo(item.id)}
          >
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
        <TouchableOpacity 
          style={[styles.createBtn, { backgroundColor: theme.colors.primary }]} 
          onPress={createAndAdd}
        >
          <Text style={styles.createText}>Create + Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 10,
  },
  item: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
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
