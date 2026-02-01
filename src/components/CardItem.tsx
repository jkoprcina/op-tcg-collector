import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { CardDetailsModal } from './CardDetailsModal';
import { getTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useToast } from './Toast';
import { AddToCollectionModal } from './AddToCollectionModal';
import { hapticFeedback } from '../utils/haptics';

const STORAGE_KEY = 'collection_thresholds';

type Props = {
  card: Card;
};

function CardItemComponent({ card }: Props) {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const { getCount, increment, decrement } = useCollectedCards();
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const count = getCount(card.card_image_id);

  // Load thresholds
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setThresholds(JSON.parse(raw));
        } else {
          setThresholds({});
        }
      } catch {}
    })();
  }, []);

  // Check if collected based on threshold
  const rarity = card.rarity || 'None';
  const threshold = thresholds[rarity] || 1;
  const collected = count >= threshold;

  const openAddToCollection = (e: GestureResponderEvent) => {
    e.stopPropagation();
    setAddVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.cardWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setDetailsVisible(true)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: card.card_image }}
          style={[styles.cardImage, !collected && styles.cardImageGrayed]}
          contentFit="cover"
          cachePolicy="disk"
        />
        {!collected && <View style={styles.grayOverlay} />}
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]} 
          onPress={openAddToCollection} 
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.countText, { color: theme.colors.text }]}>{count}</Text>
        </View>
        {collected && (
          <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
            <Text style={styles.badgeText}>★</Text>
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
              increment(card.card_image_id);
              await hapticFeedback.success();
            }}
          >
            <Text style={styles.controlText}>+</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <CardDetailsModal
        card={card}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
      />
      <AddToCollectionModal
        card={card}
        visible={addVisible}
        onClose={() => setAddVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    margin: 14,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
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
  badge: {
    position: 'absolute',
    top: 38,
    right: 10,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
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
  },
  minusBtn: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.3)',
  },
  plusBtn: {},
  controlText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
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
});

export const CardItem = React.memo(CardItemComponent);
