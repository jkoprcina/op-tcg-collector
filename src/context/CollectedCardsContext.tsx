import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, getCollectedCards, updateCardCount } from '../lib/supabase';

export type CollectedState = Record<string, number>;

type Ctx = {
  collected: CollectedState;
  ready: boolean;
  getCount: (id: string) => number;
  isCollected: (id: string) => boolean;
  increment: (id: string, card?: any) => Promise<void>;
  decrement: (id: string) => Promise<void>;
  isSaving: boolean;
  lastError: string | null;
};

const CollectedCardsContext = createContext<Ctx | undefined>(undefined);

export function CollectedCardsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collected, setCollected] = useState<CollectedState>({});
  const [ready, setReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

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
        if (cards) {
          const map: CollectedState = {};
          cards.forEach(c => { map[c.card_image_id] = c.count; });
          setCollected(map);
        }
      } catch (err) {
        console.error('Failed to load collected cards:', err);
      }
      setReady(true);

      const channel = supabase
        .channel('collected_cards_global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collected_cards', filter: `user_id=eq.${user.id}` }, async () => {
          try {
            const cards = await getCollectedCards(user.id);
            if (cards) {
              const map: CollectedState = {};
              cards.forEach(c => { map[c.card_image_id] = c.count; });
              setCollected(map);
            }
          } catch (err) {
            console.error('Failed to sync collected cards:', err);
          }
        })
        .subscribe();
      unsub = () => channel.unsubscribe();
    })();

    return () => { if (unsub) unsub(); };
  }, [user]);

  const increment = useCallback(async (cardId: string, card?: any) => {
    if (!user) {
      setLastError('No user logged in');
      return;
    }
    const current = collected[cardId] || 0;
    const next = current + 1;
    // optimistic update shared across app
    setCollected(prev => ({ ...prev, [cardId]: next }));
    setIsSaving(true);
    setLastError(null);
    try {
      await updateCardCount(user.id, cardId, next);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save card';
      console.error('Failed to increment card:', err);
      setLastError(errorMsg);
      // Revert optimistic update on error
      setCollected(prev => ({ ...prev, [cardId]: current }));
    } finally {
      setIsSaving(false);
    }
  }, [user, collected]);

  const decrement = useCallback(async (cardId: string) => {
    if (!user) {
      setLastError('No user logged in');
      return;
    }
    const current = collected[cardId] || 0;
    const nextCount = Math.max(0, current - 1);
    setCollected(prev => {
      const next = { ...prev };
      if (nextCount === 0) delete next[cardId]; else next[cardId] = nextCount;
      return next;
    });
    setIsSaving(true);
    setLastError(null);
    try {
      await updateCardCount(user.id, cardId, nextCount);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save card';
      console.error('Failed to decrement card:', err);
      setLastError(errorMsg);
      // Revert optimistic update on error
      setCollected(prev => ({ ...prev, [cardId]: current }));
    } finally {
      setIsSaving(false);
    }
  }, [user, collected]);

  const getCount = useMemo(() => (id: string) => collected[id] || 0, [collected]);
  const isCollected = useMemo(() => (id: string) => (collected[id] || 0) > 0, [collected]);

  const value: Ctx = { collected, ready, getCount, isCollected, increment, decrement, isSaving, lastError };
  return (
    <CollectedCardsContext.Provider value={value}>{children}</CollectedCardsContext.Provider>
  );
}

export function useCollectedCardsContext() {
  const ctx = useContext(CollectedCardsContext);
  if (!ctx) throw new Error('useCollectedCardsContext must be used within CollectedCardsProvider');
  return ctx;
}
