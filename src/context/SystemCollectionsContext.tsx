import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Card } from '../types';
import { useCollectedCards } from '../hooks/useCollectedCards';
import { isAlternateArtCard } from '../utils/systemCollections';
import { isMangaCard, isSPCard, getRarityKeyForCard, useCardFilters, isTreasureRareCard } from '../context/CardFilterContext';
import { getAllSets, getCardsFromDB } from '../lib/supabase';
import { SYSTEM_COLLECTION_IDS } from '../utils/systemCollections';

export type SystemCollection = {
  id: string;
  name: string;
  cards: Card[];
  missingCount: number;
  isSystem: true;
};

type SystemCollectionsContextType = {
  systemCollections: SystemCollection[];
  refreshSystemCollections: () => Promise<void>;
  loading: boolean;
};

const SystemCollectionsContext = createContext<SystemCollectionsContextType | undefined>(undefined);

export function SystemCollectionsProvider({ children }: { children: React.ReactNode }) {
  const { collected, ready } = useCollectedCards();
  const { thresholds } = useCardFilters();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all cards from database
  useEffect(() => {
    (async () => {
      if (!ready) return;
      setLoading(true);
      try {
        const sets = await getAllSets();
        const cardPromises = sets.map(set => getCardsFromDB(set.id));
        const cardsArrays = await Promise.all(cardPromises);
        const cards = cardsArrays.flat().map(dbCard => ({
          inventory_price: null,
          market_price: dbCard.market_price ?? null,
          cardmarket_price: dbCard.cardmarket_price ?? null,
          card_image_id: dbCard.card_image_id,
          card_name: dbCard.card_name,
          set_name: dbCard.set_name ?? '',
          set_id: dbCard.card_set_id ? dbCard.card_set_id.split('-')[0] : '',
          rarity: dbCard.rarity ?? '',
          card_set_id: dbCard.card_set_id ?? '',
          card_color: dbCard.card_color ?? null,
          card_type: dbCard.card_type ?? null,
          life: null,
          card_cost: dbCard.cost ?? null,
          card_power: dbCard.power ?? null,
          sub_types: null,
          counter_amount: dbCard.counter ?? null,
          attribute: dbCard.attribute ?? null,
          date_scraped: null,
          card_image: dbCard.card_image ?? '',
          card_text: dbCard.card_effect ?? dbCard.card_trigger ?? null,
        }));
        setAllCards(cards);
      } catch (err) {
        console.error('Failed to load cards for system collections:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);

  const systemCollections = useMemo(() => {
    if (!ready || loading) return [];

    // Missing Alts - all alt cards that aren't collected
    const missingAlts = allCards
      .filter(card => isAlternateArtCard(card))
      .filter(card => !collected[card.card_image_id] || collected[card.card_image_id] === 0)
      .sort((a, b) => {
        // Sort by set ID then card ID
        if (a.card_set_id !== b.card_set_id) {
          return (a.card_set_id || '').localeCompare(b.card_set_id || '');
        }
        return (a.card_image_id || '').localeCompare(b.card_image_id || '');
      });

    // Missing Playsets - all non-alt cards that aren't collected (excluding manga, SP, and Treasure Rare)
    // Note: We check the rarity for THIS specific card instance, not globally
    const missingPlaysets = allCards
      .filter(card => !isAlternateArtCard(card))
      .filter(card => !isMangaCard(card))
      .filter(card => !isSPCard(card))
      .filter(card => !isTreasureRareCard(card))
      .filter(card => {
        const rarityKey = getRarityKeyForCard(card);
        const threshold = thresholds[rarityKey] || 4;
        // For each specific card instance (with its own set), check if it's been collected enough
        return !collected[card.card_image_id] || collected[card.card_image_id] < threshold;
      })
      .sort((a, b) => {
        // Sort by set ID then card ID
        if (a.card_set_id !== b.card_set_id) {
          return (a.card_set_id || '').localeCompare(b.card_set_id || '');
        }
        return (a.card_image_id || '').localeCompare(b.card_image_id || '');
      });

    return [
      {
        id: SYSTEM_COLLECTION_IDS.MISSING_ALTS,
        name: 'Missing Alts',
        cards: missingAlts,
        missingCount: missingAlts.length,
        isSystem: true as const,
      },
      {
        id: SYSTEM_COLLECTION_IDS.MISSING_PLAYSETS,
        name: 'Missing Playsets',
        cards: missingPlaysets,
        missingCount: missingPlaysets.length,
        isSystem: true as const,
      },
    ];
  }, [allCards, collected, ready, loading, thresholds]);

  const refreshSystemCollections = async () => {
    setLoading(true);
    try {
      const sets = await getAllSets();
      const cardPromises = sets.map(set => getCardsFromDB(set.id));
      const cardsArrays = await Promise.all(cardPromises);
      const cards = cardsArrays.flat().map(dbCard => ({
        inventory_price: null,
        market_price: dbCard.market_price ?? null,
        cardmarket_price: dbCard.cardmarket_price ?? null,
        card_image_id: dbCard.card_image_id,
        card_name: dbCard.card_name,
        set_name: dbCard.set_name ?? '',
        set_id: dbCard.card_set_id ? dbCard.card_set_id.split('-')[0] : '',
        rarity: dbCard.rarity ?? '',
        card_set_id: dbCard.card_set_id ?? '',
        card_color: dbCard.card_color ?? null,
        card_type: dbCard.card_type ?? null,
        life: null,
        card_cost: dbCard.cost ?? null,
        card_power: dbCard.power ?? null,
        sub_types: null,
        counter_amount: dbCard.counter ?? null,
        attribute: dbCard.attribute ?? null,
        date_scraped: null,
        card_image: dbCard.card_image ?? '',
        card_text: dbCard.card_effect ?? dbCard.card_trigger ?? null,
      }));
      setAllCards(cards);
    } catch (err) {
      console.error('Failed to refresh system collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const value: SystemCollectionsContextType = {
    systemCollections,
    refreshSystemCollections,
    loading,
  };

  return (
    <SystemCollectionsContext.Provider value={value}>
      {children}
    </SystemCollectionsContext.Provider>
  );
}

export function useSystemCollections() {
  const ctx = useContext(SystemCollectionsContext);
  if (!ctx) throw new Error('useSystemCollections must be used within SystemCollectionsProvider');
  return ctx;
}
