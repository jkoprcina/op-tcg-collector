import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';

const PROJECT_URL = 'https://jkcykikfnbvytkfllmhv.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprY3lraWtmbmJ2eXRrZmxsbWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDgyNDgsImV4cCI6MjA4NDMyNDI0OH0.5WCEWDYU6kfgaQP_N0R-eyl-n9cd7FsfE4ucFy1hP1E';

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
    console.error('Failed to fetch collections:', error);
    return [];
  }

  return data as Collection[];
}

export async function createCollection(userId: string, name: string) {
  const { data, error } = await supabase
    .from('collections')
    .insert([{ user_id: userId, name }])
    .select();

  if (error) {
    console.error('Failed to create collection:', error);
    throw error;
  }

  return (data?.[0] || {}) as Collection;
}

export async function renameCollection(collectionId: string, newName: string) {
  const { error } = await supabase
    .from('collections')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', collectionId);

  if (error) {
    console.error('Failed to rename collection:', error);
    throw error;
  }
}

export async function deleteCollection(collectionId: string) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId);

  if (error) {
    console.error('Failed to delete collection:', error);
    throw error;
  }
}

export async function addCardToCollection(collectionId: string, cardImageId: string, cardData: Record<string, any>) {
  const { error } = await supabase
    .from('collection_cards')
    .insert([{ collection_id: collectionId, card_image_id: cardImageId, card_data: cardData }]);

  if (error) {
    console.error('Failed to add card to collection:', error);
    throw error;
  }
}

export async function removeCardFromCollection(collectionId: string, cardImageId: string) {
  const { error } = await supabase
    .from('collection_cards')
    .delete()
    .eq('collection_id', collectionId)
    .eq('card_image_id', cardImageId);

  if (error) {
    console.error('Failed to remove card from collection:', error);
    throw error;
  }
}

export async function getCollectionCards(collectionId: string) {
  const { data, error } = await supabase
    .from('collection_cards')
    .select('*')
    .eq('collection_id', collectionId);

  if (error) {
    console.error('Failed to fetch collection cards:', error);
    return [];
  }

  return data as CollectionCard[];
}

export async function getCollectedCards(userId: string) {
  const { data, error } = await supabase
    .from('collected_cards')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch collected cards:', error);
    return [];
  }

  return data as CollectedCard[];
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
    const { error } = await supabase
      .from('collected_cards')
      .upsert(
        { user_id: userId, card_image_id: cardImageId, count, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,card_image_id' }
      );

    if (error) throw error;
  }
}

// ===== OPTCG Data Functions (for cached card/set data) =====

export async function getAllSets() {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch sets:', error);
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
    console.error('Failed to fetch set:', error);
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
    console.error('Failed to fetch cards:', error);
    throw error;
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
