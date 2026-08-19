import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AdminSettings } from '@/lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
    } else {
      setSettings(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const ensureSettings = useCallback(async (userId: string) => {
    if (settings) return settings;

    const { data: existing } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      setSettings(existing);
      return existing;
    }

    const { data: created, error } = await supabase
      .from('admin_settings')
      .upsert({ user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Error creating settings:', error);
      return null;
    }

    setSettings(created);
    return created;
  }, [settings]);

  const updateSettings = useCallback(async (updates: Partial<AdminSettings>) => {
    if (!settings) return;

    const { data, error } = await supabase
      .from('admin_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }

    setSettings(data);
    return data;
  }, [settings]);

  return { settings, loading, fetchSettings, ensureSettings, updateSettings };
}
