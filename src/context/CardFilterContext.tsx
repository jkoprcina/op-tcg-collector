import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';

export const RARITY_OPTIONS = [
  'Common',
  'Uncommon',
  'Rare',
  'Super Rare',
  'Secret Rare',
  'Treasure Rare',
  'Leader',
  'Manga',
  'Alternative Art',
  'SP',
];

export function normalizeRarity(rarity: string | null | undefined): string {
  const s = (rarity || '').trim().toLowerCase();
  
  // Handle short codes from database
  if (s === 'c') return 'Common';
  if (s === 'uc') return 'Uncommon';
  if (s === 'r') return 'Rare';
  if (s === 'sr') return 'Super Rare';
  if (s === 'sec') return 'Secret Rare';
  if (s === 'l' || s === 'leader') return 'Leader';
  if (s === 'tr') return 'Treasure Rare';
  if (s === 'sp') return 'SP';
  if (s === 'pr') return 'Parallel Rare'; // Will be overridden by card_name check
  
  // Fallback for full names
  if (s.includes('common')) return 'Common';
  if (s.includes('uncommon')) return 'Uncommon';
  if (s.includes('rare') && !s.includes('super') && !s.includes('secret')) return 'Rare';
  if (s.includes('super rare')) return 'Super Rare';
  if (s.includes('secret rare')) return 'Secret Rare';
  if (s.includes('leader')) return 'Leader';
  if (s.includes('treasure')) return 'Treasure Rare';
  if (s.includes('sp')) return 'SP';
  
  return 'None';
}

type RarityLike = Pick<Card, 'rarity' | 'card_name' | 'card_set_id' | 'card_image_id'>;

export function isTreasureRareCard(card: RarityLike): boolean {
  const name = (card.card_name || '').toLowerCase();
  const rarityKey = normalizeRarity(card.rarity);

  if (rarityKey === 'Treasure Rare') return true;
  if (name.includes('(tr)') || name.includes('treasure rare')) return true;

  return false;
}

export function isAlternateArtCard(card: RarityLike): boolean {
  const name = (card.card_name || '').toLowerCase();
  const imageId = (card.card_image_id || '').toLowerCase();
  const rarity = (card.rarity || '').toLowerCase();

  // Exclude manga cards
  if (name.includes('(manga)') || name.includes('manga') || /_m\d+$/.test(imageId)) {
    return false;
  }

  // Exclude SP cards
  if (name.includes('(sp)') || name.includes(' sp ') || /_sp\d*$/.test(imageId)) {
    return false;
  }

  // Exclude Treasure Rare cards
  if (isTreasureRareCard(card)) {
    return false;
  }

  // Check card name for "(Parallel)" or "Alt" or "Alternative" suffix
  if (name.includes('(parallel)') || name.includes('parallel') || 
      name.includes('(alt)') || name.includes('alt art') ||
      name.includes('alternative art')) {
    return true;
  }

  // Check rarity field for Alternative Art indicator
  if (rarity.includes('alternative art') || rarity.includes('alt art') || rarity === 'alternative art') {
    return true;
  }

  // Check image ID for _p1, _p2, etc. suffix (Parallel variant indicator)
  if (/_p\d+$/.test(imageId)) {
    return true;
  }

  return false;
}

export function isMangaCard(card: RarityLike): boolean {
  const name = (card.card_name || '').toLowerCase();
  const imageId = (card.card_image_id || '').toLowerCase();

  // Check card name for "(Manga)" suffix
  if (name.includes('(manga)') || name.includes('manga')) {
    return true;
  }

  // Check image ID for _m1, _m2, etc. suffix (Manga variant indicator)
  if (/_m\d+$/.test(imageId)) {
    return true;
  }

  return false;
}

export function isSPCard(card: RarityLike): boolean {
  const name = (card.card_name || '').toLowerCase();
  const imageId = (card.card_image_id || '').toLowerCase();
  const rarity = (card.rarity || '').toLowerCase();

  // Check rarity field first
  if (rarity === 'sp' || rarity.includes('sp')) {
    return true;
  }

  // Check card name for "(SP)" suffix or SP variants
  if (name.includes('(sp)') || name.includes(' sp ') || name.includes(' sp)') || name.endsWith('sp')) {
    return true;
  }

  // Check image ID for _sp, _sp1, _sp2, etc. suffix (SP variant indicator)
  if (/_sp\d*$/.test(imageId)) {
    return true;
  }

  return false;
}

export function getRarityKeyForCard(card: RarityLike): string {
  // Check Manga first (takes precedence)
  if (isMangaCard(card)) return 'Manga';
  
  // Then check for SP cards
  if (isSPCard(card)) return 'SP';

  // Treasure Rare should not be treated as Alternative Art
  const baseRarity = normalizeRarity(card.rarity);
  if (isTreasureRareCard(card)) return 'Treasure Rare';
  
  // Then check for Alternative Art/Parallel
  if (isAlternateArtCard(card)) return 'Alternative Art';
  
  // Finally normalize the rarity code
  return baseRarity;
}

const STORAGE_KEY = 'card_type_filters';
const THRESHOLDS_KEY = 'collection_thresholds';

type CardFilterState = Record<string, boolean>;

type CardFilterContextType = {
  enabledRarities: CardFilterState;
  thresholds: Record<string, number>;
  ready: boolean;
  setRarityEnabled: (rarity: string, enabled: boolean) => void;
  toggleRarity: (rarity: string) => void;
  setAll: (enabled: boolean) => void;
  updateThresholds: (next: Record<string, number>) => void;
  isRarityEnabled: (rarity: string | null | undefined) => boolean;
  isCardVisible: (card: RarityLike) => boolean;
};

const defaultState: CardFilterState = RARITY_OPTIONS.reduce((acc, r) => {
  acc[r] = true;
  return acc;
}, {} as CardFilterState);

const defaultThresholds: Record<string, number> = RARITY_OPTIONS.reduce((acc, r) => {
  acc[r] = 1;
  return acc;
}, {} as Record<string, number>);

const CardFilterContext = createContext<CardFilterContextType | undefined>(undefined);

export function CardFilterProvider({ children }: { children: React.ReactNode }) {
  const [enabledRarities, setEnabledRarities] = useState<CardFilterState>(defaultState);
  const [thresholds, setThresholds] = useState<Record<string, number>>(defaultThresholds);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CardFilterState;
          setEnabledRarities({ ...defaultState, ...parsed });
        } else {
          setEnabledRarities(defaultState);
        }
      } catch {
        setEnabledRarities(defaultState);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THRESHOLDS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, number>;
          setThresholds({ ...defaultThresholds, ...parsed });
        } else {
          setThresholds(defaultThresholds);
        }
      } catch {
        setThresholds(defaultThresholds);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enabledRarities)).catch(() => {});
  }, [enabledRarities, ready]);

  const setRarityEnabled = (rarity: string, enabled: boolean) => {
    setEnabledRarities(prev => ({ ...prev, [rarity]: enabled }));
  };

  const toggleRarity = (rarity: string) => {
    setEnabledRarities(prev => ({ ...prev, [rarity]: !prev[rarity] }));
  };

  const setAll = (enabled: boolean) => {
    const next: CardFilterState = {};
    RARITY_OPTIONS.forEach(r => {
      next[r] = enabled;
    });
    setEnabledRarities(next);
  };

  const updateThresholds = (next: Record<string, number>) => {
    setThresholds(next);
    AsyncStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const isRarityEnabled = useMemo(
    () => (rarity: string | null | undefined) => {
      const key = normalizeRarity(rarity);
      return enabledRarities[key] !== false;
    },
    [enabledRarities]
  );

  const isCardVisible = useMemo(
    () => (card: RarityLike) => {
      const key = getRarityKeyForCard(card);
      return enabledRarities[key] !== false;
    },
    [enabledRarities]
  );

  const value: CardFilterContextType = useMemo(() => ({
    enabledRarities,
    thresholds,
    ready,
    setRarityEnabled,
    toggleRarity,
    setAll,
    updateThresholds,
    isRarityEnabled,
    isCardVisible,
  }), [enabledRarities, thresholds, ready, isRarityEnabled, isCardVisible]);

  return <CardFilterContext.Provider value={value}>{children}</CardFilterContext.Provider>;
}

export function useCardFilters() {
  const ctx = useContext(CardFilterContext);
  if (!ctx) throw new Error('useCardFilters must be used within CardFilterProvider');
  return ctx;
}
