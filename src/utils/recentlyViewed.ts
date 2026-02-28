import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '../types';

const RECENTLY_VIEWED_KEY = 'recently_viewed_cards';
const MAX_RECENT = 10;

export async function getRecentlyViewedCards(): Promise<Card[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Card[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function trackRecentlyViewedCard(card: Card): Promise<void> {
  try {
    if (!card?.card_image_id) return;
    const current = await getRecentlyViewedCards();
    const filtered = current.filter(c => c.card_image_id !== card.card_image_id);
    const next = [card, ...filtered].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {}
}
