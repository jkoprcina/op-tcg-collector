import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';

const PROJECT_URL = 'https://jkcykikfnbvytkfllmhv.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprY3lraWtmbmJ2eXRrZmxsbWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDgyNDgsImV4cCI6MjA4NDMyNDI0OH0.5WCEWDYU6kfgaQP_N0R-eyl-n9cd7FsfE4ucFy1hP1E';
export const SUPABASE_AUTH_STORAGE_KEY = 'sb-jkcykikfnbvytkfllmhv-auth-token';

export const supabase = createClient(PROJECT_URL, ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export type Collection = {
  id: string;
  user_id: string;
  name: string;
  binder_size: number | null;
  created_at: string;
  updated_at: string;
};

export type CollectedCard = {
  id: string;
  user_id: string;
  card_image_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};

export type CollectionCard = {
  id: string;
  collection_id: string;
  card_image_id: string;
  card_data: Record<string, any>;
  position?: number | null;
  created_at: string;
};

export type Set = {
  id: string;
  name: string;
  release_date: string | null;
  card_count: number;
  created_at: string;
  updated_at: string;
};

export type DBCard = {
  card_image_id: string;
  card_name: string;
  card_set_id: string | null;
  set_name: string | null;
  card_color: string | null;
  rarity: string | null;
  cost: string | null;
  attribute: string | null;
  power: string | null;
  counter: string | null;
  card_type: string | null;
  card_effect: string | null;
  card_trigger: string | null;
  card_image: string | null;
  market_price: number | null;
  cardmarket_price: number | null;
  created_at: string;
  updated_at: string;
};

// Helper functions
export async function getCollections(userId: string) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data as Collection[];
}

export async function createCollection(userId: string, name: string, binderSize: number = 3) {
  const { data, error } = await supabase
    .from('collections')
    .insert([{ user_id: userId, name, binder_size: binderSize }])
    .select();

  if (error) {
    throw error;
  }

  return (data?.[0] || {}) as Collection;
}

export async function updateCollectionBinderSize(collectionId: string, binderSize: number) {
  const { error } = await supabase
    .from('collections')
    .update({ binder_size: binderSize, updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  if (error) {
    throw error;
  }
}

export async function renameCollection(collectionId: string, newName: string) {
  const { error } = await supabase
    .from('collections')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  if (error) {
    throw error;
  }
}

export async function deleteCollection(collectionId: string) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (error) {
    throw error;
  }
}

export async function addCardToCollection(collectionId: string, cardImageId: string, cardData: Record<string, any>, position?: number) {
  const { data, error } = await supabase
    .from('collection_cards')
    .insert([{ collection_id: collectionId, card_image_id: cardImageId, card_data: cardData, position: position ?? null }])
    .select();

  if (error) {
    throw error;
  }

  return (data?.[0] || null) as CollectionCard | null;
}

export async function removeCardFromCollection(collectionId: string, cardImageId: string, collectionCardId?: string) {
  if (collectionCardId) {
    const { error } = await supabase
      .from('collection_cards')
      .delete()
      .eq('id', collectionCardId)
      .eq('collection_id', collectionId);

    if (error) {
      throw error;
    }
    return;
  }

  // Get one row to delete (in case there are duplicates)
  const { data: cardToDelete, error: selectError } = await supabase
    .from('collection_cards')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('card_image_id', cardImageId)
    .limit(1)
    .single();

  if (selectError || !cardToDelete) {
    return;
  }

  // Delete that specific row by ID
  const { error } = await supabase
    .from('collection_cards')
    .delete()
    .eq('id', cardToDelete.id);

  if (error) {
    throw error;
  }
}

export async function getCollectionCards(collectionId: string) {
  const { data, error } = await supabase
    .from('collection_cards')
    .select('*')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data as CollectionCard[];
}

export async function updateCollectionCardsPositions(updates: { id: string; position: number }[]) {
  if (updates.length === 0) return;
  
  // Batch updates: Use Promise.all for parallel execution (more efficient than sequential)
  // Each update is still individual to respect RLS policies
  const updatePromises = updates.map(update =>
    supabase
      .from('collection_cards')
      .update({ position: update.position })
      .eq('id', update.id)
  );
  
  const results = await Promise.all(updatePromises);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    throw errors[0].error;
  }
}

export async function getCollectedCards(userId: string): Promise<CollectedCard[] | null> {
  const pageSize = 1000;
  let from = 0;
  const all: CollectedCard[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('collected_cards')
      .select('*')
      .eq('user_id', userId)
      .order('card_image_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch collected cards:', error);
      return null;
    }

    const batch = (data as CollectedCard[]) || [];
    all.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function updateCardCount(userId: string, cardImageId: string, count: number) {
  if (count <= 0) {
    // Delete if count is 0 or less
    const { error } = await supabase
      .from('collected_cards')
      .delete()
      .eq('user_id', userId)
      .eq('card_image_id', cardImageId);

    if (error) throw error;
  } else {
    // Upsert
    const { data, error } = await supabase
      .from('collected_cards')
      .upsert(
        { user_id: userId, card_image_id: cardImageId, count, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,card_image_id' }
      )
      .select('count')
      .single();

    if (error) throw error;
    if (!data) throw new Error('No row returned from collected_cards upsert');
  }
}

// ===== OPTCG Data Functions (for cached card/set data) =====

export async function getAllSets() {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Set[];
}

export async function getSetById(setId: string) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('id', setId)
    .single();

  if (error) {
    throw error;
  }

  return data as Set;
}

export async function getCardsFromDB(setId: string) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_set_id', setId)
    .order('card_set_id', { ascending: true });

  if (error) {
    throw error;
  }

  return data as DBCard[];
}

export async function getCardsByImageIds(imageIds: string[]) {
  if (imageIds.length === 0) return [] as DBCard[];
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .in('card_image_id', imageIds);

  if (error) {
    console.error('Failed to fetch cards by image IDs:', error);
    return [];
  }

  return data as DBCard[];
}

export async function searchCards(query: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .ilike('card_name', `%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Failed to search cards:', error);
    throw error;
  }

  return data as DBCard[];
}
