-- Migration: Create collected_cards table for user card collections
-- This table tracks how many of each card the user has collected

-- Create collected_cards table
CREATE TABLE IF NOT EXISTS collected_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_image_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, card_image_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_collected_cards_user_id ON collected_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_collected_cards_card_id ON collected_cards(card_image_id);
CREATE INDEX IF NOT EXISTS idx_collected_cards_user_card ON collected_cards(user_id, card_image_id);

-- Enable RLS (Row Level Security)
ALTER TABLE collected_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own collected cards" ON collected_cards;
DROP POLICY IF EXISTS "Users can insert their own collected cards" ON collected_cards;
DROP POLICY IF EXISTS "Users can update their own collected cards" ON collected_cards;
DROP POLICY IF EXISTS "Users can delete their own collected cards" ON collected_cards;

-- Create RLS policies
-- Allow users to read only their own collected cards
CREATE POLICY "Users can read their own collected cards"
  ON collected_cards FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own collected cards
CREATE POLICY "Users can insert their own collected cards"
  ON collected_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own collected cards
CREATE POLICY "Users can update their own collected cards"
  ON collected_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own collected cards
CREATE POLICY "Users can delete their own collected cards"
  ON collected_cards FOR DELETE
  USING (auth.uid() = user_id);
