-- Migration: Add performance indexes to collections and collection_cards tables
-- Run this in your Supabase SQL Editor to optimize query performance

-- Indexes on collections table
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);

-- Indexes on collection_cards table (critical for binder performance)
CREATE INDEX IF NOT EXISTS idx_collection_cards_collection_id ON collection_cards(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_image_id ON collection_cards(card_image_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_position ON collection_cards(position);
CREATE INDEX IF NOT EXISTS idx_collection_cards_composite ON collection_cards(collection_id, position);

-- Indexes on collected_cards table
CREATE INDEX IF NOT EXISTS idx_collected_cards_user_id ON collected_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_collected_cards_image_id ON collected_cards(card_image_id);
CREATE INDEX IF NOT EXISTS idx_collected_cards_composite ON collected_cards(user_id, card_image_id);
