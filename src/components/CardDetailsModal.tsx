import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Share } from 'react-native';
import { Image } from 'expo-image';
import type { Card } from '../types';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  card: Card | null;
  visible: boolean;
  onClose: () => void;
};

export function CardDetailsModal({ card, visible, onClose }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { getCount, increment, decrement } = useCollectedCards();

  if (!card) return null;

  const count = getCount(card.card_image_id);

  const shareCard = async () => {
    try {
      await Share.share({
        title: card.card_name,
        message: `${card.card_name} (${card.card_set_id})\n${card.set_name}\n${card.card_image}`,
        url: card.card_image,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
        <ScrollView style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: theme.colors.mutedText }]}>✕ Close</Text>
          </TouchableOpacity>
          {/* Share Button */}
          <TouchableOpacity style={styles.shareBtn} onPress={shareCard}>
            <Text style={[styles.shareBtnText, { color: theme.colors.primary }]}>Share</Text>
          </TouchableOpacity>

          {/* Card Image */}
          <Image
            source={{ uri: card.card_image }}
            style={styles.cardImage}
            contentFit="contain"
            cachePolicy="disk"
          />

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={[styles.cardName, { color: theme.colors.text }]}>{card.card_name}</Text>
            <Text style={[styles.setName, { color: theme.colors.mutedText }]}>{card.set_name}</Text>

            {/* Count Controls */}
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, styles.minusBtn, { backgroundColor: theme.colors.chip }]}
                onPress={() => decrement(card.card_image_id)}
              >
                <Text style={[styles.counterText, { color: theme.colors.text }]}>-</Text>
              </TouchableOpacity>
              <View style={[styles.counterValueBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.counterValue, { color: theme.colors.text }]}>{count}</Text>
                <Text style={[styles.counterLabel, { color: theme.colors.mutedText }]}>Owned</Text>
              </View>
              <TouchableOpacity
                style={[styles.counterBtn, styles.plusBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => increment(card.card_image_id)}
              >
                <Text style={[styles.counterText, { color: theme.colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Card Details Grid */}
            <View style={[styles.detailsGrid, { backgroundColor: theme.colors.chip }]}>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Card ID</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.card_set_id}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Type</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.card_type || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Color</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.card_color || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Rarity</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.rarity}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Cost</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.card_cost || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Power</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.card_power || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Counter</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.counter_amount || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: theme.colors.mutedText }]}>Life</Text>
                <Text style={[styles.value, { color: theme.colors.text }]}>{card.life || 'N/A'}</Text>
              </View>
            </View>

            {/* Card Text */}
            {card.card_text && (
              <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Card Text</Text>
                <Text style={[styles.cardText, { color: theme.colors.text, backgroundColor: theme.colors.chip }]}>{card.card_text}</Text>
              </View>
            )}

            {/* Pricing */}
            <View style={[styles.pricingSection, { backgroundColor: theme.colors.chip }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.colors.mutedText }]}>Market Price:</Text>
                <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                  ${card.market_price?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: theme.colors.mutedText }]}>Inventory Price:</Text>
                <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                  ${card.inventory_price?.toFixed(2) || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shareBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginTop: -8,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardImage: {
    width: '100%',
    height: 420,
    marginBottom: 20,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  cardName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  setName: {
    fontSize: 14,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    borderRadius: 12,
    padding: 14,
  },
  detailItem: {
    width: '50%',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  textSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    borderRadius: 8,
  },
  pricingSection: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  counterBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  minusBtn: {
    marginRight: 10,
  },
  plusBtn: {
    marginLeft: 10,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
  },
  counterValueBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  counterLabel: {
    fontSize: 12,
  },
});
