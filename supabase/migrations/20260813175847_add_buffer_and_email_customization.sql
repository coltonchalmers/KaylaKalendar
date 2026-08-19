/*
# Add buffer time, email customization, and meeting type overrides

## Overview
This migration adds:
1. A global buffer-minutes setting to admin_settings (default 15) so meetings
   can't be booked back-to-back.
2. Per-meeting-type override columns on meeting_types for buffer minutes,
   Zoom link, contact email, and contact phone — each nullable so the global
   default applies when not set.
3. Email customization columns on admin_settings: per-email-type enable
   toggles, element inclusion toggles, and custom template text for each of
   the four email types (invite, confirmation, notification, announcement).

## Modified Tables

### admin_settings (new columns)
- buffer_minutes (integer, default 15) — minutes of padding required between
  consecutive meetings.
- email_invite_enabled (boolean, default true)
- email_confirmation_enabled (boolean, default true)
- email_notification_enabled (boolean, default true)
- email_announcement_enabled (boolean, default true)
- email_include_company_info (boolean, default true)
- email_include_zoom (boolean, default true)
- email_include_phone (boolean, default true)
- email_invite_template (text, nullable) — custom template; null = use built-in default
- email_confirmation_template (text, nullable)
- email_notification_template (text, nullable)
- email_announcement_template (text, nullable)

### meeting_types (new columns)
- buffer_minutes (integer, nullable) — overrides global buffer when set
- zoom_link (text, nullable) — overrides global Zoom link for this meeting type
- contact_email_override (text, nullable) — overrides admin contact email
- contact_phone_override (text, nullable) — overrides admin contact phone

## Security
No new tables. Existing RLS policies on admin_settings and meeting_types
already cover the new columns — no policy changes needed.
*/

-- admin_settings: buffer + email columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'buffer_minutes') THEN
    ALTER TABLE admin_settings ADD COLUMN buffer_minutes integer NOT NULL DEFAULT 15;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_invite_enabled') THEN
    ALTER TABLE admin_settings ADD COLUMN email_invite_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_confirmation_enabled') THEN
    ALTER TABLE admin_settings ADD COLUMN email_confirmation_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_notification_enabled') THEN
    ALTER TABLE admin_settings ADD COLUMN email_notification_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_announcement_enabled') THEN
    ALTER TABLE admin_settings ADD COLUMN email_announcement_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_include_company_info') THEN
    ALTER TABLE admin_settings ADD COLUMN email_include_company_info boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_include_zoom') THEN
    ALTER TABLE admin_settings ADD COLUMN email_include_zoom boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_include_phone') THEN
    ALTER TABLE admin_settings ADD COLUMN email_include_phone boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_invite_template') THEN
    ALTER TABLE admin_settings ADD COLUMN email_invite_template text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_confirmation_template') THEN
    ALTER TABLE admin_settings ADD COLUMN email_confirmation_template text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_notification_template') THEN
    ALTER TABLE admin_settings ADD COLUMN email_notification_template text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_settings' AND column_name = 'email_announcement_template') THEN
    ALTER TABLE admin_settings ADD COLUMN email_announcement_template text;
  END IF;
END $$;

-- meeting_types: override columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_types' AND column_name = 'buffer_minutes') THEN
    ALTER TABLE meeting_types ADD COLUMN buffer_minutes integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_types' AND column_name = 'zoom_link') THEN
    ALTER TABLE meeting_types ADD COLUMN zoom_link text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_types' AND column_name = 'contact_email_override') THEN
    ALTER TABLE meeting_types ADD COLUMN contact_email_override text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_types' AND column_name = 'contact_phone_override') THEN
    ALTER TABLE meeting_types ADD COLUMN contact_phone_override text;
  END IF;
END $$;