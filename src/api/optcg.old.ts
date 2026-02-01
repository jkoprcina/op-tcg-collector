import type { Card, SetSummary } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://www.optcgapi.com/api';

// API Response Types
interface APISetResponse {
  set_id: string;
  set_name: string;
}

interface APICardsResponse extends Array<Card> {}

interface APICacheEntry<T> {
  timestamp: number;
  data: T;
}

// In-memory cache
const setCache = new Map<string, Card[]>();
const setsListCache = new Map<string, SetSummary[]>();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, backoffMs = 500) {
  try {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoffMs));
      return fetchWithRetry(url, options, retries - 1, backoffMs * 2);
    }
    throw err;
  }
}

async function getJSONCache<T>(key: string): Promise<{ data: T | null; stale: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (!raw) return { data: null, stale: true };
    const parsed = JSON.parse(raw) as APICacheEntry<T>;
    const stale = Date.now() - (parsed.timestamp || 0) > TTL_MS;
    return { data: parsed.data, stale };
  } catch {
    return { data: null, stale: true };
  }
}

async function setJSONCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `cache:${key}`,
      JSON.stringify({ timestamp: Date.now(), data } as APICacheEntry<T>)
    );
  } catch {}
}

export async function getSets(): Promise<SetSummary[]> {
  // Check in-memory cache
  if (setsListCache.has('all')) return setsListCache.get('all') || [];

  // Check persistent cache
  const cached = await getJSONCache<SetSummary[]>('sets:all');
  if (cached.data) {
    // Revalidate in background if stale
    if (cached.stale) {
      fetchWithRetry(`${BASE_URL}/allSets/`).then(async r => {
        const data = (await r.json()) as APISetResponse[];
        const sets: SetSummary[] = data.map(set => ({ id: set.set_id, name: set.set_name }));
        setsListCache.set('all', sets);
        await setJSONCache('sets:all', sets);
      }).catch(() => {});
    }
    return cached.data;
  }

  try {
    const resp = await fetchWithRetry(`${BASE_URL}/allSets/`);
    if (!resp.ok) return [];
    const data = (await resp.json()) as APISetResponse[];
    
    // API returns array of sets with set_id and set_name
    const sets: SetSummary[] = data.map(set => ({
      id: set.set_id,
      name: set.set_name,
    }));
    
    console.log('Fetched sets:', sets);
    setsListCache.set('all', sets);
    await setJSONCache('sets:all', sets);
    return sets;
  } catch (err) {
    console.error('Failed to fetch sets:', err);
    return [];
  }
}

export async function getCardsInSet(setId: string): Promise<Card[]> {
  // Check in-memory cache first
  if (setCache.has(setId)) return setCache.get(setId) || [];

  // Check persistent cache
  const cached = await getJSONCache<Card[]>(`set:${setId}`);
  if (cached.data) {
    if (cached.stale) {
      fetchWithRetry(`${BASE_URL}/sets/${setId}/`).then(async r => {
        const data = (await r.json()) as APICardsResponse | { value: APICardsResponse };
        const cards: Card[] = Array.isArray(data) ? data : (data.value || []);
        setCache.set(setId, cards);
        await setJSONCache(`set:${setId}`, cards);
      }).catch(() => {});
    }
    return cached.data;
  }

  try {
    const resp = await fetchWithRetry(`${BASE_URL}/sets/${setId}/`);
    if (!resp.ok) {
      console.warn(`Failed to fetch cards for set ${setId}, status: ${resp.status}`);
      return [];
    }
    const data = (await resp.json()) as APICardsResponse | { value: APICardsResponse };
    
    const cards: Card[] = Array.isArray(data) ? data : (data.value || []);
    
    console.log(`Fetched ${cards.length} cards for set ${setId}`);
    
    // Cache the results
    setCache.set(setId, cards);
    await setJSONCache(`set:${setId}`, cards);
    return cards;
  } catch (err) {
    console.error(`Failed to fetch cards for set ${setId}:`, err);
    return [];
  }
}

export async function getCardById(cardSetId: string): Promise<Card[]> {
  // Example: OP01-001
  const url = `${BASE_URL}/sets/card/${cardSetId}/`;
  try {
    const resp = await fetchWithRetry(url);
    if (!resp.ok) return [];
    const data = (await resp.json()) as APICardsResponse;
    return data;
  } catch (err) {
    console.error('Failed to fetch card:', err);
    return [];
  }
}
