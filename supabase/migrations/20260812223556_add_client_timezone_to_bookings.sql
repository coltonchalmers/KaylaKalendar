/*
# Add client timezone to bookings

## Purpose
Stores the timezone the client selected when booking, so the admin knows
what timezone the client was seeing when they chose their appointment time.

## Changes
- bookings table: add `client_timezone` column (text, nullable, defaults to null)
  - Stores an IANA timezone identifier (e.g. "America/New_York")
  - Nullable so existing bookings are unaffected

## Security
- No RLS policy changes needed; existing policies already cover the new column
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_timezone text;
