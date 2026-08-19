import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProposalLink, ProposalSlot } from '@/lib/types';

export interface ProposalLinkWithSlots extends ProposalLink {
  slots: ProposalSlot[];
}

export function useProposalLinks() {
  const [proposals, setProposals] = useState<ProposalLinkWithSlots[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    const { data, error } = await supabase
      .from('proposal_links')
      .select(`
        *,
        slots:proposal_slots(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
    } else {
      setProposals((data || []) as ProposalLinkWithSlots[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const createProposal = useCallback(async (input: {
    client_name: string;
    client_email: string;
    label?: string;
    meeting_type_id?: string | null;
    expires_at?: string | null;
    slots: { date: string; start_time: string }[];
  }) => {
    const { slots, ...linkData } = input;
    const { data: link, error: linkError } = await supabase
      .from('proposal_links')
      .insert({
        ...linkData,
        label: linkData.label || null,
        meeting_type_id: linkData.meeting_type_id || null,
        expires_at: linkData.expires_at || null,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    const slotRows = slots.map(s => ({
      proposal_link_id: link.id,
      date: s.date,
      start_time: s.start_time,
    }));

    if (slotRows.length > 0) {
      const { error: slotsError } = await supabase
        .from('proposal_slots')
        .insert(slotRows);
      if (slotsError) throw slotsError;
    }

    const { data: fullSlots } = await supabase
      .from('proposal_slots')
      .select('*')
      .eq('proposal_link_id', link.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    const result: ProposalLinkWithSlots = { ...link, slots: fullSlots || [] };
    setProposals(prev => [result, ...prev]);
    return result;
  }, []);

  const toggleProposal = useCallback(async (id: string, is_active: boolean) => {
    const { data, error } = await supabase
      .from('proposal_links')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setProposals(prev => prev.map(p => p.id === id ? { ...data, slots: p.slots } : p));
  }, []);

  const deleteProposal = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('proposal_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setProposals(prev => prev.filter(p => p.id !== id));
  }, []);

  const deleteSlot = useCallback(async (slotId: string, proposalId: string) => {
    const { error } = await supabase
      .from('proposal_slots')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
    setProposals(prev => prev.map(p =>
      p.id === proposalId
        ? { ...p, slots: p.slots.filter(s => s.id !== slotId) }
        : p
    ));
  }, []);

  const addSlot = useCallback(async (proposalId: string, date: string, startTime: string) => {
    const { data, error } = await supabase
      .from('proposal_slots')
      .insert({ proposal_link_id: proposalId, date, start_time: startTime })
      .select()
      .single();

    if (error) throw error;
    setProposals(prev => prev.map(p =>
      p.id === proposalId
        ? { ...p, slots: [...p.slots, data].sort((a, b) =>
            a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
          ) }
        : p
    ));
    return data;
  }, []);

  const fetchByToken = useCallback(async (token: string) => {
    const { data: link, error: linkError } = await supabase
      .from('proposal_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link) return null;

    const { data: slots, error: slotsError } = await supabase
      .from('proposal_slots')
      .select('*')
      .eq('proposal_link_id', link.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError) throw slotsError;

    return { ...link, slots: slots || [] } as ProposalLinkWithSlots;
  }, []);

  const claimSlot = useCallback(async (slotId: string) => {
    const { data, error } = await supabase
      .from('proposal_slots')
      .update({ is_claimed: true })
      .eq('id', slotId)
      .eq('is_claimed', false)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const unclaimSlot = useCallback(async (slotId: string) => {
    const { error } = await supabase
      .from('proposal_slots')
      .update({ is_claimed: false })
      .eq('id', slotId);

    if (error) throw error;
  }, []);

  return {
    proposals,
    loading,
    createProposal,
    toggleProposal,
    deleteProposal,
    deleteSlot,
    addSlot,
    fetchByToken,
    claimSlot,
    unclaimSlot,
    refresh: fetchProposals,
  };
}
