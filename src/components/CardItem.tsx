import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, GestureResponderEvent, Platform, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Card } from '../types';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { AddToCollectionModal, useToast } from './index';
import { hapticFeedback } from '../utils/haptics';
import { useFavorites } from '../context/FavoritesContext';
import { getRarityKeyForCard, useCardFilters } from '../context/CardFilterContext';
import { formatPrice } from '../utils/price';

type Props = {
  card: Card;
  onPress?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  showPrice?: boolean;
  onOpenAdd?: () => void;
  disableInlineModals?: boolean;
  showPlaysetBadge?: boolean;
};

function CardItemComponent({ card, onPress, selectable, selected, onSelect, showPrice, onOpenAdd, disableInlineModals, showPlaysetBadge = false }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { currency } = useSettings();
  const { getCount, increment, decrement, lastError, isSaving } = useCollectedCards();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { thresholds } = useCardFilters();
  const [imageLoaded, setImageLoaded] = useState(false);
  const toast = useToast();
  const count = getCount(card.card_image_id);

  // Show error toast when save fails
  useEffect(() => {
    if (lastError) {
      toast.show(`Failed to save card: ${lastError}`, 'error', 4000);
    }
  }, [lastError, toast]);

  // Check if collected based on threshold
  const rarityKey = getRarityKeyForCard(card);
  const threshold = thresholds[rarityKey] || 1;
  const collected = count >= threshold;
  
  // Display USD price from TCGPlayer
  const price = card.market_price ?? card.inventory_price;
  const priceText = formatPrice(price, currency, '—');

  const openAddToCollection = (e: GestureResponderEvent) => {
    e.stopPropagation();
    hapticFeedback.light();
    if (onOpenAdd) {
      onOpenAdd();
      return;
    }
    setAddVisible(true);
  };

  const openImageViewer = () => {
    setImageViewerVisible(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <>
      <View
        style={[
          styles.cardWrapper,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={openImageViewer} style={styles.imageContainer}>
          <Image
            source={{ uri: card.card_image }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="disk"
            onLoad={handleImageLoad}
          />
          {!imageLoaded && <View style={[styles.imagePlaceholder, styles.cardImage]} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]} 
          onPress={openAddToCollection} 
          activeOpacity={0.85}
        >
          <Ionicons name="heart" size={16} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.countText, { color: theme.colors.text }]}>{count}</Text>
        </View>
        {showPlaysetBadge && count > 0 && count < 4 && (
          <View style={[styles.playsetBadge, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.playsetText}>+{4 - count}</Text>
          </View>
        )}
        {selectable && (
          <View style={[styles.selectBadge, { borderColor: theme.colors.border, backgroundColor: selected ? theme.colors.primary : theme.colors.surface }]}
          >
            <Text style={[styles.selectText, { color: selected ? '#fff' : theme.colors.mutedText }]}>{selected ? '✓' : ''}</Text>
          </View>
        )}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.minusBtn]}
            onPress={async e => {
              e.stopPropagation();
              await hapticFeedback.light();
              decrement(card.card_image_id);
            }}
          >
            <Text style={styles.controlText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.plusBtn]}
            onPress={async e => {
              e.stopPropagation();
              await hapticFeedback.light();
              increment(card.card_image_id, card);
              await hapticFeedback.success();
            }}
          >
            <Text style={styles.controlText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.priceBar, { backgroundColor: 'rgba(0, 0, 0, 0.75)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Text style={[styles.priceBarText, { color: '#ffffff' }]}>{priceText}</Text>
        </View>
      </View>

      {!disableInlineModals && (
        <AddToCollectionModal
          card={card}
          visible={addVisible}
          onClose={() => setAddVisible(false)}
        />
      )}
      
      <Modal visible={imageViewerVisible} transparent animationType="fade">
        <View style={[styles.imageViewerBackdrop, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <Text style={styles.imageViewerCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.imageViewerContainer}>
            <Image
              source={{ uri: card.card_image }}
              style={styles.imageViewerImage}
              contentFit="contain"
              cachePolicy="disk"
            />
          </View>
          <View style={[styles.imageViewerInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.imageViewerName, { color: theme.colors.text }]}>{card.card_name}</Text>
            <Text style={[styles.imageViewerId, { color: theme.colors.mutedText }]}>{card.card_set_id}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 63 / 88,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 63 / 88,
  },
  cardImageGrayed: {
    opacity: 0.4,
  },
  grayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
  },
  imagePlaceholder: {
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playsetBadge: {
    position: 'absolute',
    top: 42,
    right: 10,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  playsetText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  selectBadge: {
    position: 'absolute',
    top: 10,
    left: 48,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  selectText: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  minusBtn: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.3)',
  },
  plusBtn: {},
  controlText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  priceBar: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
    zIndex: 5,
    borderRadius: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  priceBarText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  imageViewerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },
  imageViewerCloseText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  imageViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageViewerImage: {
    width: 300,
    height: 450,
    borderRadius: 12,
  },
  imageViewerInfo: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  imageViewerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  imageViewerId: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export const CardItem = React.memo(CardItemComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if card data changed or essential props changed
  return (
    prevProps.card.card_image_id === nextProps.card.card_image_id &&
    prevProps.selected === nextProps.selected &&
    prevProps.showPrice === nextProps.showPrice &&
    prevProps.selectable === nextProps.selectable
  );
});
