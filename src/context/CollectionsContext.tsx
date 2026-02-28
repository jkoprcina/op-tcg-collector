import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import {
  getCollections,
  createCollection as createCollectionSupabase,
  deleteCollection as deleteCollectionSupabase,
  renameCollection as renameCollectionSupabase,
  updateCollectionBinderSize as updateCollectionBinderSizeSupabase,
  addCardToCollection as addCardToCollectionSupabase,
  removeCardFromCollection as removeCardFromCollectionSupabase,
  getCollectionCards,
  getCardsByImageIds,
  updateCollectionCardsPositions as updateCollectionCardsPositionsSupabase,
  supabase,
} from '../lib/supabase';
import type { Card } from '../types';
import { useAuth } from './AuthContext';

export type Collection = {
  id: string;
  name: string;
  binderSize: number;
  cards: Card[];
};

type CollectionsContextType = {
  collections: Collection[];
  loading: boolean;
  createCollection: (name: string) => Promise<Collection>;
  addCardToCollection: (collectionId: string, card: Card) => Promise<void>;
  removeCardFromCollection: (collectionId: string, cardImageId: string, collectionCardId?: string) => Promise<void>;
  removeCardFromCollectionByImageId: (collectionId: string, cardImageId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  renameCollection: (collectionId: string, newName: string) => Promise<void>;
  updateBinderSize: (collectionId: string, binderSize: number) => Promise<void>;
  reorderCollectionCards: (collectionId: string, orderedCards: Card[]) => Promise<void>;
  getCollection: (id: string) => Collection | undefined;
  getCardCountInCollection: (collectionId: string, cardImageId: string) => number;
};

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrateCards = async (cards: Card[]) => {
    const missing = cards
      .filter(c => !c.card_image)
      .map(c => c.card_image_id || c.card_set_id)
      .filter(Boolean) as string[];
    if (missing.length === 0) return cards;

    const dbCards = await getCardsByImageIds(missing);
    if (!dbCards.length) return cards;

    const map = new Map(dbCards.map(c => [c.card_image_id, c]));
    return cards.map(card => {
      if (card.card_image) return card;
      const db = map.get(card.card_image_id || card.card_set_id || '');
      if (!db) return card;
      return {
        ...card,
        card_image_id: card.card_image_id || db.card_image_id,
        card_image: db.card_image ?? card.card_image,
        card_name: card.card_name || db.card_name,
        card_set_id: card.card_set_id || db.card_set_id || '',
        set_name: card.set_name || db.set_name || '',
        rarity: card.rarity || db.rarity || '',
        card_color: card.card_color ?? db.card_color ?? null,
        card_type: card.card_type ?? db.card_type ?? null,
        card_cost: card.card_cost ?? db.cost ?? null,
        card_power: card.card_power ?? db.power ?? null,
        counter_amount: card.counter_amount ?? db.counter ?? null,
        attribute: card.attribute ?? db.attribute ?? null,
          market_price: card.market_price ?? db.market_price ?? null,
          cardmarket_price: card.cardmarket_price ?? db.cardmarket_price ?? null,
      };
    });
  };

  const ensureCardImage = async (card: Card) => {
    const withId = card.card_image_id ? card : { ...card, card_image_id: card.card_set_id };
    if (withId.card_image || !withId.card_image_id) return withId;
    const dbCards = await getCardsByImageIds([withId.card_image_id]);
    const db = dbCards[0];
    if (!db) return withId;
    return {
      ...withId,
      card_image: db.card_image ?? withId.card_image,
      card_name: withId.card_name || db.card_name,
      card_set_id: withId.card_set_id || db.card_set_id || '',
      set_name: withId.set_name || db.set_name || '',
      rarity: withId.rarity || db.rarity || '',
      card_color: withId.card_color ?? db.card_color ?? null,
      card_type: withId.card_type ?? db.card_type ?? null,
      card_cost: withId.card_cost ?? db.cost ?? null,
      card_power: withId.card_power ?? db.power ?? null,
      counter_amount: withId.counter_amount ?? db.counter ?? null,
      attribute: withId.attribute ?? db.attribute ?? null,
      market_price: withId.market_price ?? db.market_price ?? null,
      cardmarket_price: withId.cardmarket_price ?? db.cardmarket_price ?? null,
    };
  };

  // Fetch collections on mount and when user changes
  useEffect(() => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const collectionsList = await getCollections(user.id);
        
        // Fetch cards for each collection
        const collectionsWithCards: Collection[] = await Promise.all(
          collectionsList.map(async (col) => {
            try {
              const cardsList = await getCollectionCards(col.id);
              const rawCards = cardsList.map((cc, index) => ({
                ...(cc.card_data as Card),
                collection_card_id: cc.id,
                binder_position: cc.position ?? index,
              }));
              const hydrated = await hydrateCards(rawCards);
              return {
                id: col.id,
                name: col.name,
                binderSize: col.binder_size || 3,
                cards: hydrated,
              };
            } catch {
              return {
                id: col.id,
                name: col.name,
                binderSize: col.binder_size || 3,
                cards: [],
              };
            }
          })
        );

        setCollections(collectionsWithCards);
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        setLoading(false);
      }
    })();

    // Subscribe to real-time updates
    const collectionsChannel = supabase
      .channel('collections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections', filter: `user_id=eq.${user.id}` },
        () => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          refreshTimerRef.current = setTimeout(() => {
            // Refetch collections on change (debounced)
            (async () => {
              const collectionsList = await getCollections(user.id);
              const collectionsWithCards: Collection[] = await Promise.all(
                collectionsList.map(async (col) => {
                  try {
                    const cardsList = await getCollectionCards(col.id);
                    const rawCards = cardsList.map((cc, index) => ({
                      ...(cc.card_data as Card),
                      collection_card_id: cc.id,
                      binder_position: cc.position ?? index,
                    }));
                    const hydrated = await hydrateCards(rawCards);
                    return {
                      id: col.id,
                      name: col.name,
                      binderSize: col.binder_size || 3,
                      cards: hydrated,
                    };
                  } catch {
                    return {
                      id: col.id,
                      name: col.name,
                      binderSize: col.binder_size || 3,
                      cards: [],
                    };
                  }
                })
              );
              setCollections(collectionsWithCards);
            })();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      collectionsChannel.unsubscribe();
    };
  }, [user]);

  const createCollection = async (name: string) => {
    if (!user) throw new Error('Not authenticated');
    const col = await createCollectionSupabase(user.id, name.trim() || 'Untitled', 3);
    const newCollection: Collection = { id: col.id, name: col.name, binderSize: col.binder_size || 3, cards: [] };
    setCollections(prev => [...prev, newCollection]);
    return newCollection;
  };

  const addCardToCollection = async (collectionId: string, card: Card) => {
    const normalized = await ensureCardImage(card);
    const existing = getCollection(collectionId)?.cards || [];
    const maxPosition = existing.reduce((acc, c) => Math.max(acc, c.binder_position ?? 0), -1);
    const position = maxPosition + 1;
    const inserted = await addCardToCollectionSupabase(collectionId, normalized.card_image_id, normalized, position);
    
    // Update local state
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          cards: [
            ...col.cards,
            {
              ...normalized,
              collection_card_id: inserted?.id,
              binder_position: position,
            },
          ],
        };
      })
    );
  };

  const removeCardFromCollection = async (collectionId: string, cardImageId: string, collectionCardId?: string) => {
    await removeCardFromCollectionSupabase(collectionId, cardImageId, collectionCardId);
    
    // Update local state - remove only ONE instance of the card
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;

        const cardIndex = collectionCardId
          ? col.cards.findIndex(c => c.collection_card_id === collectionCardId)
          : col.cards.findIndex(c => c.card_image_id === cardImageId || c.card_set_id === cardImageId);
        if (cardIndex === -1) return col;

        const newCards = [...col.cards];
        newCards.splice(cardIndex, 1);

        return {
          ...col,
          cards: newCards,
        };
      })
    );
  };

  const removeCardFromCollectionByImageId = async (collectionId: string, cardImageId: string) => {
    // Remove ALL instances of a card from a collection by image ID only
    // This is useful for system collections where we don't have collection_card_id
    const collection = getCollection(collectionId);
    if (!collection) return;

    const cardToRemove = collection.cards.find(c => c.card_image_id === cardImageId || c.card_set_id === cardImageId);
    if (!cardToRemove || !cardToRemove.collection_card_id) return;

    await removeCardFromCollectionSupabase(collectionId, cardImageId, cardToRemove.collection_card_id);

    // Update local state
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          cards: col.cards.filter(c => c.card_image_id !== cardImageId && c.card_set_id !== cardImageId),
        };
      })
    );
  };

  const deleteCollection = async (collectionId: string) => {
    await deleteCollectionSupabase(collectionId);
    setCollections(prev => prev.filter(c => c.id !== collectionId));
  };

  const renameCollection = async (collectionId: string, newName: string) => {
    const trimmed = newName.trim() || 'Untitled';
    await renameCollectionSupabase(collectionId, trimmed);
    setCollections(prev =>
      prev.map(c => {
        if (c.id !== collectionId) return c;
        return { ...c, name: trimmed };
      })
    );
  };

  const updateBinderSize = async (collectionId: string, binderSize: number) => {
    await updateCollectionBinderSizeSupabase(collectionId, binderSize);
    setCollections(prev =>
      prev.map(c => {
        if (c.id !== collectionId) return c;
        return { ...c, binderSize };
      })
    );
  };

  const reorderCollectionCards = async (collectionId: string, orderedCards: Card[]) => {
    const updates = orderedCards
      .map((card, index) => ({ id: card.collection_card_id, position: index }))
      .filter(u => Boolean(u.id)) as { id: string; position: number }[];

    await updateCollectionCardsPositionsSupabase(updates);
    
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          cards: orderedCards.map((card, index) => ({ ...card, binder_position: index })),
        };
      })
    );
  };

  const getCollection = (id: string) => collections.find(c => c.id === id);

  const getCardCountInCollection = (collectionId: string, cardImageId: string) => {
    const coll = getCollection(collectionId);
    if (!coll) return 0;
    return coll.cards.filter(c => c.card_image_id === cardImageId).length;
  };

  const value: CollectionsContextType = {
    collections,
    loading,
    createCollection,
    addCardToCollection,
    removeCardFromCollection,
    removeCardFromCollectionByImageId,
    deleteCollection,
    renameCollection,
    updateBinderSize,
    reorderCollectionCards,
    getCollection,
    getCardCountInCollection,
  };

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections() {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error('useCollections must be used within CollectionsProvider');
  return ctx;
}
