-- Migration: Store OPTCG card data in Supabase for faster access
-- Run this in your Supabase SQL Editor

-- Create sets table
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  release_date DATE,
  card_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  card_image_id TEXT PRIMARY KEY,
  card_name TEXT NOT NULL,
  card_set_id TEXT,
  set_name TEXT,
  card_color TEXT,
  rarity TEXT,
  cost TEXT,
  attribute TEXT,
  power TEXT,
  counter TEXT,
  card_type TEXT,
  card_effect TEXT,
  card_trigger TEXT,
  card_image TEXT,
  market_price DECIMAL(10,2),
  cardmarket_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (card_set_id) REFERENCES sets(id) ON DELETE CASCADE
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(card_set_id);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_color ON cards(card_color);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(card_name);
CREATE INDEX IF NOT EXISTS idx_sets_name ON sets(name);

-- Enable RLS (Row Level Security)
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Allow public read access to sets" 
  ON sets FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to cards" 
  ON cards FOR SELECT 
  USING (true);

-- Only allow service role to insert/update (for sync script)
CREATE POLICY "Allow service role to manage sets" 
  ON sets FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage cards" 
  ON cards FOR ALL 
  USING (auth.role() = 'service_role');
