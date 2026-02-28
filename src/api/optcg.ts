import type { Card, SetSummary } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSets, getCardsFromDB, type DBCard } from '../lib/supabase';

type CachePayload<T> = {
  updatedAt: string;
  data: T;
};

const CACHE_VERSION = 'v2';
const SETS_CACHE_KEY = `cache_sets_${CACHE_VERSION}`;
const CARDS_CACHE_PREFIX = `cache_cards_${CACHE_VERSION}_`;

async function readCache<T>(key: string): Promise<CachePayload<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload<T>;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<CachePayload<T>> {
  const payload: CachePayload<T> = { data, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
  return payload;
}

// Convert DB card to app Card type
function dbCardToCard(dbCard: DBCard): Card {
  return {
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
  };
}

export async function getSets(): Promise<SetSummary[]> {
  try {
    const sets = await getAllSets();
    return sets.map(set => ({
      id: set.id,
      name: set.name,
    }));
  } catch (err) {
    console.error('Failed to fetch sets from database:', err);
    return [];
  }
}

export async function getCardsInSet(setId: string): Promise<Card[]> {
  try {
    const dbCards = await getCardsFromDB(setId);
    return dbCards.map(dbCardToCard);
  } catch (err) {
    console.error('Failed to fetch cards from database:', err);
    return [];
  }
}

export async function getCardById(cardSetId: string): Promise<Card[]> {
  // This function is not commonly used, keeping it minimal
  return [];
}

export async function readSetsCache(): Promise<CachePayload<SetSummary[]> | null> {
  return readCache<SetSummary[]>(SETS_CACHE_KEY);
}

export async function fetchSetsAndCache(): Promise<CachePayload<SetSummary[]>> {
  const sets = await getSets();
  return writeCache<SetSummary[]>(SETS_CACHE_KEY, sets);
}

export async function readCardsCache(setId: string): Promise<CachePayload<Card[]> | null> {
  return readCache<Card[]>(`${CARDS_CACHE_PREFIX}${setId}`);
}

export async function fetchCardsAndCache(setId: string): Promise<CachePayload<Card[]>> {
  const cards = await getCardsInSet(setId);
  return writeCache<Card[]>(`${CARDS_CACHE_PREFIX}${setId}`, cards);
}
