/*
# Add per-email-type element overrides and Google Calendar link toggle

## Overview
This migration adds:
1. Four JSONB columns to admin_settings — one per email type — so each email
   type can independently override which elements it includes (company info,
   zoom link, phone number, google calendar link). Null means "use global defaults."
2. One new global boolean column `email_include_google_calendar` (default true)
   that controls whether a Google Calendar "add to event" link is included in
   emails by default. This uses Google's public event URL format — no OAuth or
   account connection required.

## Modified Tables

### admin_settings (new columns)
- email_invite_elements (jsonb, nullable) — overrides for invite emails
- email_confirmation_elements (jsonb, nullable) — overrides for confirmation emails
- email_notification_elements (jsonb, nullable) — overrides for notification emails
- email_announcement_elements (jsonb, nullable) — overrides for announcement emails
- email_include_google_calendar (boolean, default true) — global toggle for
  including a Google Calendar link in outgoing emails

Each JSONB column, when non-null, stores an object like:
  { "company_info": true, "zoom": true, "phone": true, "google_calendar": true }

## Security
No new tables. Existing RLS policies on admin_settings already cover the new
columns — no policy changes needed.
*/

-- Per-email-type element override columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_invite_elements') THEN
    ALTER TABLE admin_settings ADD COLUMN email_invite_elements jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_confirmation_elements') THEN
    ALTER TABLE admin_settings ADD COLUMN email_confirmation_elements jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_notification_elements') THEN
    ALTER TABLE admin_settings ADD COLUMN email_notification_elements jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_announcement_elements') THEN
    ALTER TABLE admin_settings ADD COLUMN email_announcement_elements jsonb;
  END IF;
END $$;

-- Global Google Calendar toggle
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_include_google_calendar') THEN
    ALTER TABLE admin_settings ADD COLUMN email_include_google_calendar boolean NOT NULL DEFAULT true;
  END IF;
END $$;