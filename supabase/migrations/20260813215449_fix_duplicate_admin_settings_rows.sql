/*
# Fix duplicate admin_settings rows

## Overview
The admin_settings table has accumulated 258 duplicate rows for the same user_id,
causing settings saves to appear to fail (the save hits one row, but the next
page load fetches a different row). This migration:
1. Deletes all but the most-recently-updated row per user_id
2. Adds a UNIQUE constraint on user_id so duplicates can never happen again

## Safety
- We keep the row with the latest updated_at per user (the one with the most
  recent save). If there's a tie, we keep the one with the latest created_at.
- No data is lost beyond stale duplicate rows that were never the "active" row.
*/

-- Step 1: Delete duplicate rows, keeping the most recently updated one per user_id
DELETE FROM admin_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM admin_settings
  ORDER BY user_id, updated_at DESC, created_at DESC
);

-- Step 2: Add unique constraint on user_id to prevent future duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'admin_settings' AND indexname = 'admin_settings_user_id_key'
  ) THEN
    ALTER TABLE admin_settings ADD CONSTRAINT admin_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;
