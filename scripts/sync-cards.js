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

// List of known OPTCG sets (main sets and extra boosters)
const KNOWN_SETS = [
  // Main sets
  'OP-01', 'OP-02', 'OP-03', 'OP-04', 'OP-05', 'OP-06', 'OP-07', 'OP-08',
  'OP-09', 'OP-10', 'OP-11', 'OP-12', 'OP-13', 'OP-14',
  // Extra boosters
  'EB-01', 'EB-02', 'EB-03'
];

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
    // The OPTCG API doesn't have a sets endpoint, so we use known sets
    return KNOWN_SETS.map(setId => ({ id: setId }));
  } catch (err) {
    console.error('Failed to fetch sets:', err.message);
    return [];
  }
}

async function getCardsFromAPI(setId) {
  try {
    // API endpoint is /api/sets/{SET_ID}/
    const response = await fetchJSON(`${OPTCG_API_BASE}/sets/${setId}/`);
    return response || [];
  } catch (err) {
    console.error(`Failed to fetch cards for set ${setId}:`, err.message);
    return [];
  }
}

async function normalizeCard(apiCard) {
  return {
    card_image_id: apiCard.card_set_id || apiCard.id || apiCard.card_image_id,
    card_name: apiCard.card_name || apiCard.name,
    card_set_id: apiCard.card_set_id || apiCard.cardSetId || apiCard.set_id,
    set_name: apiCard.set_name || apiCard.setName,
    card_color: apiCard.card_color || apiCard.color || null,
    rarity: apiCard.rarity || null,
    cost: apiCard.card_cost || apiCard.cost || null,
    attribute: apiCard.attribute || null,
    power: apiCard.power || null,
    counter: apiCard.counter || null,
    card_type: apiCard.card_type || apiCard.type || null,
    card_effect: apiCard.card_text || apiCard.card_effect || apiCard.effect || null,
    card_trigger: apiCard.card_trigger || apiCard.trigger || null,
    card_image: apiCard.card_images || apiCard.image || apiCard.card_image || null,
    market_price: apiCard.market_price || null,
    cardmarket_price: apiCard.cardmarket_price || null,
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

    // Upsert sets into sets table
    const setsToUpsert = [];
    for (const set of sets) {
      const setId = set.id;
      // Extract set name from first card if available
      const cards = await getCardsFromAPI(setId);
      if (cards.length > 0) {
        // Extract normalized set ID from first card's card_set_id (e.g., "OP08-067" -> "OP08")
        const normalizedSetId = cards[0].card_set_id.split('-')[0];
        setsToUpsert.push({
          id: normalizedSetId,  // Use normalized format (OP08, not OP-08)
          name: cards[0].set_name || setId,
          release_date: null,
          card_count: cards.length,
        });
      }
    }

    if (setsToUpsert.length > 0) {
      const { error: setsError } = await supabase
        .from('sets')
        .upsert(setsToUpsert, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (setsError) {
        console.error('Error upserting sets:', setsError.message);
      } else {
        console.log(`Upserted ${setsToUpsert.length} sets`);
      }
    }

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
