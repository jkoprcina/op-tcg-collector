import type { Card, SetSummary } from '../types';
import { getAllSets, getCardsFromDB, type DBCard } from '../lib/supabase';

// Convert DB card to app Card type
function dbCardToCard(dbCard: DBCard): Card {
  return {
    card_image_id: dbCard.card_image_id,
    card_name: dbCard.card_name,
    card_set_id: dbCard.card_set_id || '',
    set_name: dbCard.set_name || '',
    card_color: dbCard.card_color || '',
    rarity: dbCard.rarity || '',
    cost: dbCard.cost || '',
    attribute: dbCard.attribute || '',
    power: dbCard.power || '',
    counter: dbCard.counter || '',
    card_type: dbCard.card_type || '',
    card_effect: dbCard.card_effect || '',
    card_trigger: dbCard.card_trigger || '',
    card_image: dbCard.card_image || '',
    market_price: dbCard.market_price || 0,
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
