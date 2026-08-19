import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MeetingType } from '@/lib/types';

export function useMeetingTypes() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetingTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from('meeting_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching meeting types:', error);
    else setMeetingTypes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetingTypes();
  }, [fetchMeetingTypes]);

  const createMeetingType = useCallback(async (input: {
    name: string;
    description?: string | null;
    duration_minutes: number;
    is_active?: boolean;
    buffer_minutes?: number | null;
    zoom_link?: string | null;
    contact_email_override?: string | null;
    contact_phone_override?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('meeting_types')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    setMeetingTypes(prev => [data, ...prev]);
    return data;
  }, []);

  const updateMeetingType = useCallback(async (id: string, updates: Partial<MeetingType>) => {
    const { data, error } = await supabase
      .from('meeting_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setMeetingTypes(prev => prev.map(mt => mt.id === id ? data : mt));
    return data;
  }, []);

  const deleteMeetingType = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('meeting_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setMeetingTypes(prev => prev.filter(mt => mt.id !== id));
  }, []);

  const fetchByToken = useCallback(async (token: string) => {
    const { data, error } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  return {
    meetingTypes,
    loading,
    createMeetingType,
    updateMeetingType,
    deleteMeetingType,
    fetchByToken,
    refresh: fetchMeetingTypes,
  };
}
