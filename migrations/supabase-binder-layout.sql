-- Migration: add binder_size to collections for binder layout
-- Run this in your Supabase SQL Editor

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS binder_size INTEGER DEFAULT 3;

UPDATE collections
SET binder_size = 3
WHERE binder_size IS NULL;
