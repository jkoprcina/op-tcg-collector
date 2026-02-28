-- Migration: add binder position ordering for collection cards
-- Run this in your Supabase SQL Editor

ALTER TABLE collection_cards
  ADD COLUMN IF NOT EXISTS position INTEGER;

CREATE INDEX IF NOT EXISTS idx_collection_cards_collection_position
  ON collection_cards (collection_id, position);
