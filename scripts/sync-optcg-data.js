#!/usr/bin/env node
/**
 * OPTCG Data Sync Script
 * 
 * Fetches all sets and cards from the OPTCG API and syncs them to Supabase.
 * Run this manually or schedule it to run nightly via cron/GitHub Actions.
 * 
 * Usage:
 *   npm run sync-cards
 * 
 * Or directly:
 *   node scripts/sync-optcg-data.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jkcykikfnbvytkfllmhv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Set this in your environment

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable not set');
  console.error('Get your service role key from Supabase Dashboard > Settings > API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const API_BASE = 'https://www.optcgapi.com/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Retry ${i + 1}/${retries} failed for ${url}:`, err.message);
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

async function syncSets() {
  // Preflight: ensure tables exist and schema cache is fresh
  const tablesOk = await ensureTables();
  if (!tablesOk) {
    throw new Error("Supabase tables not found in schema cache. Please run supabase-migration.sql and retry.");
  }

  console.log('Fetching sets from OPTCG API...');
  const setsData = await fetchWithRetry(`${API_BASE}/allSets/`);
  
  console.log(`Found ${setsData.length} sets. Upserting to Supabase...`);
  
  const sets = setsData.map(set => ({
    id: set.set_id,
    name: set.set_name,
    card_count: 0, // Will be updated after cards sync
    updated_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('sets')
    .upsert(sets, { onConflict: 'id' });
  
  if (error) {
    console.error('Failed to upsert sets:', error);
    throw error;
  }
  
  console.log(`✓ Synced ${sets.length} sets`);
  return sets;
}

async function ensureTables() {
  // Try selecting from 'sets' and 'cards' to verify availability
  try {
    const setsProbe = await supabase.from('sets').select('id').limit(1);
    if (setsProbe.error) {
      const e = setsProbe.error;
      if (e.code === 'PGRST205') {
        console.error("Could not find table 'public.sets' in schema cache.");
        console.error('Fix: Run supabase-migration.sql in Supabase SQL Editor for the same project URL.');
        console.error(`Project URL: ${SUPABASE_URL}`);
        return false;
      }
      console.error('Unexpected error probing sets table:', e);
      return false;
    }

    const cardsProbe = await supabase.from('cards').select('id').limit(1);
    if (cardsProbe.error) {
      const e = cardsProbe.error;
      if (e.code === 'PGRST205') {
        console.error("Could not find table 'public.cards' in schema cache.");
        console.error('Fix: Run supabase-migration.sql in Supabase SQL Editor for the same project URL.');
        console.error(`Project URL: ${SUPABASE_URL}`);
        return false;
      }
      console.error('Unexpected error probing cards table:', e);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to probe tables:', err.message);
    return false;
  }
}

function generateFallbackId(setId, cardName) {
  // Generate a unique ID for cards without card_image_id
  const sanitized = cardName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `${setId}-${sanitized}`;
}

async function syncCardsForSet(setId, setName) {
  console.log(`  Fetching cards for ${setName} (${setId})...`);
  
  try {
    const cardsData = await fetchWithRetry(`${API_BASE}/sets/${setId}/`);
    const cards = Array.isArray(cardsData) ? cardsData : (cardsData.value || []);
    
    if (cards.length === 0) {
      console.log(`  ⚠ No cards found for ${setId}`);
      return 0;
    }
    
    const cardsToInsert = cards.map(card => ({
      // Generate fallback ID if card_image_id is missing
      card_image_id: card.card_image_id || generateFallbackId(setId, card.card_name),
      card_name: card.card_name,
      card_set_id: setId,
      set_name: setName,
      card_color: card.card_color || null,
      rarity: card.rarity || null,
      cost: card.cost || null,
      attribute: card.attribute || null,
      power: card.power || null,
      counter: card.counter || null,
      card_type: card.card_type || null,
      card_effect: card.card_effect || null,
      card_trigger: card.card_trigger || null,
      card_image: card.card_image || null,
      market_price: card.market_price || null,
      updated_at: new Date().toISOString(),
    }));
    
    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < cardsToInsert.length; i += batchSize) {
      const batch = cardsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('cards')
        .upsert(batch, { onConflict: 'card_image_id', ignoreDuplicates: false });
      
      if (error) {
        console.error(`  ✗ Failed to upsert batch for ${setId}:`, error);
        throw error;
      }
    }
    
    // Update set card count
    await supabase
      .from('sets')
      .update({ card_count: cardsToInsert.length })
      .eq('id', setId);
    
    console.log(`  ✓ Synced ${cardsToInsert.length} cards for ${setName}`);
    return cardsToInsert.length;
  } catch (err) {
    console.error(`  ✗ Failed to sync cards for ${setId}:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  OPTCG Data Sync to Supabase');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Sync sets
    const sets = await syncSets();
    console.log('');
    
    // Step 2: Sync cards for each set
    console.log('Syncing cards for all sets...');
    let totalCards = 0;
    
    for (const set of sets) {
      const count = await syncCardsForSet(set.id, set.name);
      totalCards += count;
      await sleep(500); // Rate limiting
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✓ Sync completed successfully!`);
    console.log(`  Sets: ${sets.length}`);
    console.log(`  Cards: ${totalCards}`);
    console.log(`  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════');
  } catch (err) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('✗ Sync failed:', err.message);
    console.error('═══════════════════════════════════════');
    process.exit(1);
  }
}

main();
