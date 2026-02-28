import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';

const STORAGE_KEY = 'favorite_cards';

export type FavoriteEntry = {
  card: Card;
  lastPrice: number | null;
  priceDelta: number | null;
  updatedAt: string;
};

type FavoritesContextType = {
  favorites: Record<string, FavoriteEntry>;
  isFavorite: (cardId: string) => boolean;
  toggleFavorite: (card: Card) => void;
  updateFavoritePrice: (card: Card) => void;
  removeFavorite: (cardId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Record<string, FavoriteEntry>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setFavorites(JSON.parse(raw));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
  }, [favorites]);

  const isFavorite = (cardId: string) => !!favorites[cardId];

  const toggleFavorite = (card: Card) => {
    setFavorites(prev => {
      if (prev[card.card_image_id]) {
        const next = { ...prev };
        delete next[card.card_image_id];
        return next;
      }
      const price = card.market_price ?? null;
      return {
        ...prev,
        [card.card_image_id]: {
          card,
          lastPrice: price,
          priceDelta: null,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const removeFavorite = (cardId: string) => {
    setFavorites(prev => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const updateFavoritePrice = (card: Card) => {
    setFavorites(prev => {
      const existing = prev[card.card_image_id];
      if (!existing) return prev;
      const current = card.market_price ?? null;
      if (current === null || existing.lastPrice === null || current === existing.lastPrice) {
        return {
          ...prev,
          [card.card_image_id]: {
            ...existing,
            card,
            updatedAt: new Date().toISOString(),
          },
        };
      }
      const delta = Number((current - existing.lastPrice).toFixed(2));
      return {
        ...prev,
        [card.card_image_id]: {
          card,
          lastPrice: current,
          priceDelta: delta,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const value: FavoritesContextType = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, updateFavoritePrice, removeFavorite }),
    [favorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
