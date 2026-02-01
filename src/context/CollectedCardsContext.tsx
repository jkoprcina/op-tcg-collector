import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase, getCollectedCards, updateCardCount } from '../lib/supabase';

export type CollectedState = Record<string, number>;

type Ctx = {
  collected: CollectedState;
  ready: boolean;
  getCount: (id: string) => number;
  isCollected: (id: string) => boolean;
  increment: (id: string) => Promise<void>;
  decrement: (id: string) => Promise<void>;
};

const CollectedCardsContext = createContext<Ctx | undefined>(undefined);

export function CollectedCardsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collected, setCollected] = useState<CollectedState>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setCollected({});
      setReady(true);
      return;
    }

    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const cards = await getCollectedCards(user.id);
        const map: CollectedState = {};
        cards.forEach(c => { map[c.card_image_id] = c.count; });
        setCollected(map);
      } catch (err) {
        console.error('Failed to load collected cards:', err);
      }
      setReady(true);

      const channel = supabase
        .channel('collected_cards_global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collected_cards', filter: `user_id=eq.${user.id}` }, async () => {
          try {
            const cards = await getCollectedCards(user.id);
            const map: CollectedState = {};
            cards.forEach(c => { map[c.card_image_id] = c.count; });
            setCollected(map);
          } catch (err) {
            console.error('Failed to sync collected cards:', err);
          }
        })
        .subscribe();
      unsub = () => channel.unsubscribe();
    })();

    return () => { if (unsub) unsub(); };
  }, [user]);

  const increment = async (cardId: string) => {
    if (!user) return;
    const current = collected[cardId] || 0;
    const next = current + 1;
    // optimistic update shared across app
    setCollected(prev => ({ ...prev, [cardId]: next }));
    try {
      await updateCardCount(user.id, cardId, next);
    } catch (err) {
      console.error('Failed to increment card:', err);
      setCollected(prev => ({ ...prev, [cardId]: current }));
    }
  };

  const decrement = async (cardId: string) => {
    if (!user) return;
    const current = collected[cardId] || 0;
    const nextCount = Math.max(0, current - 1);
    setCollected(prev => {
      const next = { ...prev };
      if (nextCount === 0) delete next[cardId]; else next[cardId] = nextCount;
      return next;
    });
    try {
      await updateCardCount(user.id, cardId, nextCount);
    } catch (err) {
      console.error('Failed to decrement card:', err);
      setCollected(prev => ({ ...prev, [cardId]: current }));
    }
  };

  const getCount = useMemo(() => (id: string) => collected[id] || 0, [collected]);
  const isCollected = useMemo(() => (id: string) => (collected[id] || 0) > 0, [collected]);

  const value: Ctx = { collected, ready, getCount, isCollected, increment, decrement };
  return (
    <CollectedCardsContext.Provider value={value}>{children}</CollectedCardsContext.Provider>
  );
}

export function useCollectedCardsContext(): Ctx {
  const ctx = useContext(CollectedCardsContext);
  if (!ctx) throw new Error('useCollectedCardsContext must be used within CollectedCardsProvider');
  return ctx;
}
