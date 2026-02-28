import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme';
import { useFavorites } from '../context/FavoritesContext';
import { CardItem } from '../components/CardItem';
import { CardDetailsModal } from '../components/CardDetailsModal';
import { AddToCollectionModal } from '../components/AddToCollectionModal';
import type { Card } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { runLayoutAnimation } from '../utils/animations';
import { ScreenHeader } from '../components';

export type WishlistScreenProps = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

export function WishlistScreen({ navigation }: WishlistScreenProps) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { width } = useWindowDimensions();
  const { favorites } = useFavorites();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const favoriteCards = useMemo(() => Object.values(favorites).map(f => f.card), [favorites]);
  const alerts = useMemo(() => Object.values(favorites).filter(f => f.priceDelta !== null), [favorites]);

  useEffect(() => {
    runLayoutAnimation();
  }, [favoriteCards.length, alerts.length]);

  if (favoriteCards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💖</Text>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No favorites yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.mutedText }]}>Tap the heart on a card to save it</Text>
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
      <ScreenHeader
        title="Wishlist"
        subtitle="Track favorites and price drops"
        style={styles.header}
      />
      {alerts.length > 0 && (
        <View style={[styles.alertBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Price Alerts</Text>
          {alerts.slice(0, 3).map(a => (
            <Text key={a.card.card_image_id} style={[styles.alertItem, { color: theme.colors.mutedText }]}>
              {a.card.card_name}: {a.priceDelta && a.priceDelta > 0 ? '▲' : '▼'} {Math.abs(a.priceDelta || 0)}
            </Text>
          ))}
        </View>
      )}
      {(() => {
        const columns = Platform.OS === 'web' && width >= 1024 ? 5 : 2;
        const itemWidth = `${100 / columns}%` as const;
        return (
          <FlatList
            data={favoriteCards}
            keyExtractor={(item) => item.card_image_id}
            numColumns={columns}
            key={`columns-${columns}`}
            initialNumToRender={8}
            windowSize={6}
            maxToRenderPerBatch={12}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS !== 'web'}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  alertBox: {
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  alertItem: {
    fontSize: 12,
    marginBottom: 2,
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
});
