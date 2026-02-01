import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getCollections,
  createCollection as createCollectionSupabase,
  deleteCollection as deleteCollectionSupabase,
  renameCollection as renameCollectionSupabase,
  addCardToCollection as addCardToCollectionSupabase,
  removeCardFromCollection as removeCardFromCollectionSupabase,
  getCollectionCards,
  supabase,
} from '../lib/supabase';
import type { Card } from '../types';
import { useAuth } from './AuthContext';

export type Collection = {
  id: string;
  name: string;
  cards: Card[];
};

type CollectionsContextType = {
  collections: Collection[];
  loading: boolean;
  createCollection: (name: string) => Promise<Collection>;
  addCardToCollection: (collectionId: string, card: Card) => Promise<void>;
  removeCardFromCollection: (collectionId: string, cardImageId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  renameCollection: (collectionId: string, newName: string) => Promise<void>;
  getCollection: (id: string) => Collection | undefined;
  getCardCountInCollection: (collectionId: string, cardImageId: string) => number;
};

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

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
              return {
                id: col.id,
                name: col.name,
                cards: cardsList.map(cc => cc.card_data) as Card[],
              };
            } catch {
              return {
                id: col.id,
                name: col.name,
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
          // Refetch collections on change
          (async () => {
            const collectionsList = await getCollections(user.id);
            const collectionsWithCards: Collection[] = await Promise.all(
              collectionsList.map(async (col) => {
                try {
                  const cardsList = await getCollectionCards(col.id);
                  return {
                    id: col.id,
                    name: col.name,
                    cards: cardsList.map(cc => cc.card_data) as Card[],
                  };
                } catch {
                  return {
                    id: col.id,
                    name: col.name,
                    cards: [],
                  };
                }
              })
            );
            setCollections(collectionsWithCards);
          })();
        }
      )
      .subscribe();

    return () => {
      collectionsChannel.unsubscribe();
    };
  }, [user]);

  const createCollection = async (name: string) => {
    if (!user) throw new Error('Not authenticated');
    const col = await createCollectionSupabase(user.id, name.trim() || 'Untitled');
    const newCollection: Collection = { id: col.id, name: col.name, cards: [] };
    setCollections(prev => [...prev, newCollection]);
    return newCollection;
  };

  const addCardToCollection = async (collectionId: string, card: Card) => {
    await addCardToCollectionSupabase(collectionId, card.card_image_id, card);
    
    // Update local state
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          cards: [...col.cards, card],
        };
      })
    );
  };

  const removeCardFromCollection = async (collectionId: string, cardImageId: string) => {
    await removeCardFromCollectionSupabase(collectionId, cardImageId);
    
    // Update local state
    setCollections(prev =>
      prev.map(col => {
        if (col.id !== collectionId) return col;
        return {
          ...col,
          cards: col.cards.filter(c => c.card_image_id !== cardImageId),
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
    deleteCollection,
    renameCollection,
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
