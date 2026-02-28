import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, RefreshControl, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useCollections } from '../context/CollectionsContext';
import { useSystemCollections } from '../context/SystemCollectionsContext';
import { ScreenHeader, useToast } from '../components';
import { hapticFeedback } from '../utils/haptics';
import { useCardFilters } from '../context/CardFilterContext';
import type { RootStackParamList } from '../navigation';
import { Ionicons } from '@expo/vector-icons';
import { runLayoutAnimation } from '../utils/animations';
import { isSystemCollection, SYSTEM_COLLECTION_IDS } from '../utils/systemCollections';

export type CollectionsScreenProps = NativeStackScreenProps<RootStackParamList, 'Collections'>;

export function CollectionsScreen({ navigation }: CollectionsScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { collections, createCollection, deleteCollection, renameCollection, loading } = useCollections();
  const { systemCollections, refreshSystemCollections, loading: systemLoading } = useSystemCollections();
  const { isCardVisible } = useCardFilters();
  const [name, setName] = useState('');
  const [searchText, setSearchText] = useState('');
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
    if (isSystemCollection(collectionId)) {
      toast.show('Cannot delete system collections', 'error');
      return;
    }
    Alert.alert(`Delete "${collectionName}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCollection(collectionId);
          await hapticFeedback.error();
          toast.show('Binder deleted', 'info');
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
    toast.show('Binder renamed', 'success');
  };

  const openRenameModal = (id: string, currentName: string) => {
    if (isSystemCollection(id)) {
      toast.show('Cannot rename system collections', 'error');
      return;
    }
    setEditingId(id);
    setEditName(currentName);
    setEditVisible(true);
  };

  const onCreateDefault = async () => {
    const col = await createCollection('My First Binder');
    await hapticFeedback.success();
    toast.show(`Created "${col.name}"`, 'success');
    navigation.navigate('CollectionDetail', { collectionId: col.id });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSystemCollections();
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
    toast.show('Refreshed', 'success');
  };

  useEffect(() => {
    runLayoutAnimation();
  }, [collections.length]);

  const allCollections = useMemo(() => {
    return [...systemCollections, ...collections];
  }, [systemCollections, collections]);

  const filteredCollections = useMemo(() => {
    if (!searchText.trim()) return allCollections;
    const query = searchText.trim().toLowerCase();
    return allCollections.filter(c => c.name.toLowerCase().includes(query));
  }, [allCollections, searchText]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Binders"
        subtitle="Create and organize your collections"
      />
      <View style={styles.newRow}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="New binder name"
          placeholderTextColor={theme.colors.mutedText}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.colors.primary }]} onPress={onCreate}>
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
        placeholder="Search binders"
        placeholderTextColor={theme.colors.mutedText}
        value={searchText}
        onChangeText={setSearchText}
      />

      {loading && collections.length === 0 ? (
        <View style={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[styles.skeletonCard, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border }]}
            />
          ))}
        </View>
      ) : (

        <FlatList
          data={filteredCollections}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          initialNumToRender={6}
          windowSize={5}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          renderItem={({ item }) => {
            const isSystem = 'isSystem' in item && item.isSystem;
            const missingCount = 'missingCount' in item ? item.missingCount : 0;
            const showBadge = item.id === SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS && missingCount > 0;
            
            return (
              <View style={styles.itemWrapper}>
                <TouchableOpacity
                  style={[
                    styles.item, 
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSystem && { borderColor: theme.colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
                >
                  {showBadge && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                      <Text style={styles.badgeText}>{missingCount}</Text>
                    </View>
                  )}
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemSub, { color: theme.colors.mutedText }]}>
                    {isSystem ? `${missingCount} missing` : `${item.cards.filter(c => isCardVisible(c)).length} cards`}
                  </Text>
                </TouchableOpacity>
                {!isSystem && (
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
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyEmoji, { color: theme.colors.text }]}>📚</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {searchText.trim() ? 'No binders found' : 'No binders yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.mutedText }]}>Create one to start organizing</Text>
              {!searchText.trim() && (
                <TouchableOpacity
                  onPress={onCreateDefault}
                  style={[styles.emptyCta, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={styles.emptyCtaText}>Create first binder</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Rename Modal */}
      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>Rename Binder</Text>
            <TextInput
              style={[styles.dialogInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Binder name"
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
  newRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
  },
  createBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 8px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  createText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 16,
  },
  skeletonCard: {
    width: '48%',
    borderRadius: 12,
    height: 110,
    borderWidth: 1,
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
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  itemTitle: {
    fontSize: 16,
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
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
