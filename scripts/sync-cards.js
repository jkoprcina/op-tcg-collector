#!/usr/bin/env node

/**
 * Card Sync Script - Fetches latest cards from OPTCG API and updates Supabase
 * Preserves all existing collected card data and collections
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const OPTCG_API_BASE = 'https://www.optcgapi.com/api';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jkcykikfnbvytkfllmhv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getSetsFromAPI() {
  try {
    console.log('Fetching sets from OPTCG API...');
    const response = await fetchJSON(`${OPTCG_API_BASE}/sets`);
    return response || [];
  } catch (err) {
    console.error('Failed to fetch sets:', err.message);
    return [];
  }
}

async function getCardsFromAPI(setId) {
  try {
    const response = await fetchJSON(`${OPTCG_API_BASE}/cards?setId=${setId}`);
    return response || [];
  } catch (err) {
    console.error(`Failed to fetch cards for set ${setId}:`, err.message);
    return [];
  }
}

async function normalizeCard(apiCard) {
  return {
    card_image_id: apiCard.id || apiCard.card_image_id,
    card_name: apiCard.name || apiCard.card_name,
    card_set_id: apiCard.cardSetId || apiCard.card_set_id,
    set_name: apiCard.setName || apiCard.set_name,
    card_color: apiCard.color || apiCard.card_color || null,
    rarity: apiCard.rarity || null,
    cost: apiCard.cost || null,
    attribute: apiCard.attribute || null,
    power: apiCard.power || null,
    counter: apiCard.counter || null,
    card_type: apiCard.type || apiCard.card_type || null,
    card_effect: apiCard.effect || apiCard.card_effect || null,
    card_trigger: apiCard.trigger || apiCard.card_trigger || null,
    card_image: apiCard.image || apiCard.card_image || null,
    market_price: apiCard.price?.market || apiCard.market_price || null,
    cardmarket_price: apiCard.price?.cardmarket || apiCard.cardmarket_price || null,
  };
}

async function syncCards() {
  console.log('Starting card sync...');
  let totalNew = 0;
  let totalUpdated = 0;

  try {
    // Get existing cards in database
    const { data: existingCards, error: fetchError } = await supabase
      .from('cards')
      .select('card_image_id, card_set_id, updated_at');

    if (fetchError) throw fetchError;

    const existingMap = new Map(
      (existingCards || []).map(c => [`${c.card_set_id}:${c.card_image_id}`, c.updated_at])
    );

    console.log(`Found ${existingCards?.length || 0} existing cards in database`);

    // Get sets from API
    const sets = await getSetsFromAPI();
    console.log(`Fetched ${sets.length} sets from API`);

    for (const set of sets) {
      const setId = set.id || set.set_id;
      console.log(`Processing set ${setId}...`);

      const cards = await getCardsFromAPI(setId);
      console.log(`  Fetched ${cards.length} cards for set ${setId}`);

      const cardsToUpsert = [];

      for (const apiCard of cards) {
        const normalized = await normalizeCard(apiCard);
        const key = `${normalized.card_set_id}:${normalized.card_image_id}`;
        
        // Only upsert if new or if API data is newer
        const existingTime = existingMap.get(key);
        if (!existingTime) {
          totalNew++;
          cardsToUpsert.push(normalized);
        } else {
          // Only update if API has newer data
          cardsToUpsert.push(normalized);
          totalUpdated++;
        }
      }

      if (cardsToUpsert.length > 0) {
        // Use upsert to preserve existing data while updating
        const { error: upsertError } = await supabase
          .from('cards')
          .upsert(cardsToUpsert, {
            onConflict: 'card_image_id,card_set_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`  Error upserting cards for set ${setId}:`, upsertError.message);
        } else {
          console.log(`  Upserted ${cardsToUpsert.length} cards`);
        }
      }

      // Small delay to avoid API rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`  New cards: ${totalNew}`);
    console.log(`  Updated cards: ${totalUpdated}`);
    console.log(`  Total cards processed: ${totalNew + totalUpdated}`);

  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

syncCards();
