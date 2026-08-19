import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RecurringLink } from '@/lib/types';

export function useRecurringLinks() {
  const [links, setLinks] = useState<RecurringLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from('recurring_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching links:', error);
    else setLinks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const createLink = useCallback(async (input: {
    client_name: string;
    client_email: string;
    label?: string;
    frequency?: string | null;
    occurrences?: number | null;
    end_date?: string | null;
    allow_client_frequency?: boolean;
    allow_client_end_date?: boolean;
    meeting_type_id?: string | null;
    is_ongoing?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('recurring_links')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    setLinks(prev => [data, ...prev]);
    return data;
  }, []);

  const toggleLink = useCallback(async (id: string, is_active: boolean) => {
    const { data, error } = await supabase
      .from('recurring_links')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setLinks(prev => prev.map(l => l.id === id ? data : l));
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('recurring_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setLinks(prev => prev.filter(l => l.id !== id));
  }, []);

  const fetchLinkByToken = useCallback(async (token: string) => {
    const { data, error } = await supabase
      .from('recurring_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  return { links, loading, createLink, toggleLink, deleteLink, fetchLinkByToken, refresh: fetchLinks };
}
