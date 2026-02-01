import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useCollections } from '../context/CollectionsContext';
import { useToast } from '../components';
import { hapticFeedback } from '../utils/haptics';
import type { RootStackParamList } from '../navigation';
import { Ionicons } from '@expo/vector-icons';

export type CollectionsScreenProps = NativeStackScreenProps<RootStackParamList, 'Collections'>;

export function CollectionsScreen({ navigation }: CollectionsScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collections, createCollection, deleteCollection, renameCollection } = useCollections();
  const [name, setName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const toast = useToast();

  const onCreate = async () => {
    if (!name.trim()) return;
    const col = await createCollection(name.trim());
    setName('');
    await hapticFeedback.success();
    toast.show(`Created "${col.name}"`, 'success');
    navigation.navigate('CollectionDetail', { collectionId: col.id });
  };

  const onDelete = (collectionId: string, collectionName: string) => {
    Alert.alert(`Delete "${collectionName}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCollection(collectionId);
          await hapticFeedback.error();
          toast.show('Collection deleted', 'info');
        },
      },
    ]);
  };

  const onRename = async () => {
    if (!editingId || !editName.trim()) return;
    await renameCollection(editingId, editName.trim());
    setEditVisible(false);
    setEditingId(null);
    setEditName('');
    await hapticFeedback.success();
    toast.show('Collection renamed', 'success');
  };

  const openRenameModal = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
    toast.show('Refreshed', 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Collections</Text>
      <View style={styles.newRow}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="New collection name"
          placeholderTextColor={theme.colors.mutedText}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.colors.primary }]} onPress={onCreate}>
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={collections}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <TouchableOpacity
              style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
            >
              <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
              <Text style={[styles.itemSub, { color: theme.colors.mutedText }]}>{item.cards.length} cards</Text>
            </TouchableOpacity>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => openRenameModal(item.id, item.name)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Ionicons name="pencil" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(item.id, item.name)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Ionicons name="trash" size={16} color="#f44336" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedText }]}>No collections yet</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Rename Modal */}
      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>Rename Collection</Text>
            <TextInput
              style={[styles.dialogInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Collection name"
              placeholderTextColor={theme.colors.mutedText}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Text style={[styles.dialogCancel, { color: theme.colors.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRename}>
                <Text style={[styles.dialogConfirm, { color: theme.colors.primary }]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  newRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    paddingVertical: 16,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  itemWrapper: {
    flex: 1,
    position: 'relative',
  },
  item: {
    flex: 1,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 4,
  },
  itemActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    borderRadius: 12,
    padding: 24,
    width: '80%',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  dialogInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  dialogCancel: {
    fontWeight: '600',
  },
  dialogConfirm: {
    fontWeight: '700',
  },
});
