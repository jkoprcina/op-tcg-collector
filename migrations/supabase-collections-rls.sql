-- Migration: Create user collections and related tables with proper RLS
-- This sets up the collections (binders) and collection_cards tables

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  binder_size INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create collection_cards table (cards within each collection)
CREATE TABLE IF NOT EXISTS collection_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_image_id TEXT NOT NULL,
  card_data JSONB NOT NULL,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_collection_id ON collection_cards(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_card_id ON collection_cards(card_image_id);

-- Enable RLS (Row Level Security)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;
DROP POLICY IF EXISTS "Users can read collection cards in their collections" ON collection_cards;
DROP POLICY IF EXISTS "Users can insert collection cards in their collections" ON collection_cards;
DROP POLICY IF EXISTS "Users can update collection cards in their collections" ON collection_cards;
DROP POLICY IF EXISTS "Users can delete collection cards in their collections" ON collection_cards;

-- Collections RLS policies
-- Allow users to read only their own collections
CREATE POLICY "Users can read their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to create collections
CREATE POLICY "Users can insert their own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own collections
CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own collections
CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection_cards RLS policies
-- Allow users to read cards in their own collections
CREATE POLICY "Users can read collection cards in their collections"
  ON collection_cards FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

-- Allow users to add cards to their own collections
CREATE POLICY "Users can insert collection cards in their collections"
  ON collection_cards FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

-- Allow users to update cards in their own collections
CREATE POLICY "Users can update collection cards in their collections"
  ON collection_cards FOR UPDATE
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete cards from their own collections
CREATE POLICY "Users can delete collection cards in their collections"
  ON collection_cards FOR DELETE
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );
