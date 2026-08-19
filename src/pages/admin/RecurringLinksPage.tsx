import { useState } from 'react';
import { Link2, Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, Infinity as InfinityIcon } from 'lucide-react';
import { useRecurringLinks } from '@/hooks/useRecurringLinks';
import { useMeetingTypes } from '@/hooks/useMeetingTypes';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { triggerInviteEmail } from '@/lib/bookingEmails';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RecurringLinksPage() {
  const { links, loading, createLink, toggleLink, deleteLink } = useRecurringLinks();
  const { meetingTypes, loading: mtLoading } = useMeetingTypes();

  const [showCreate, setShowCreate] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [label, setLabel] = useState('');
  const [meetingTypeId, setMeetingTypeId] = useState('');
  const [frequency, setFrequency] = useState('');
  const [occurrences, setOccurrences] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');

  // Auto-lock: if admin sets frequency/occurrences/end_date, client is locked
  // If admin leaves all blank and not ongoing, client can choose
  const allowFrequency = !frequency;
  const allowEndDate = !occurrences && !endDate && !isOngoing;

  const handleCreate = async () => {
    if (!clientName.trim() || !clientEmail.trim() || !meetingTypeId) return;
    if (!isValidEmail(clientEmail.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setCreating(true);
    try {
      const link = await createLink({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        label: label.trim() || undefined,
        frequency: frequency || null,
        occurrences: occurrences ? parseInt(occurrences) : null,
        end_date: endDate || null,
        allow_client_frequency: allowFrequency,
        allow_client_end_date: allowEndDate,
        meeting_type_id: meetingTypeId || null,
        is_ongoing: isOngoing,
      });

      const inviteUrl = `${window.location.origin}/book/${link.token}`;
      await triggerInviteEmail(clientName.trim(), clientEmail.trim(), inviteUrl);

      setShowCreate(false);
      setClientName('');
      setClientEmail('');
      setLabel('');
      setMeetingTypeId('');
      setFrequency('');
      setOccurrences('');
      setEndDate('');
      setIsOngoing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/book/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (id: string, active: boolean) => {
    try { await toggleLink(id, !active); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteLink(id); } catch (err) { console.error(err); }
  };

  const meetingTypeName = (id: string | null) => {
    if (!id) return null;
    return meetingTypes.find(mt => mt.id === id)?.name || null;
  };

  if (loading || mtLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Links</h1>
          <p className="text-gray-500 mt-1">Create unique booking links for recurring clients.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Create Link
        </Button>
      </div>

      {links.length === 0 ? (
        <Card className="text-center py-16">
          <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No recurring links yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create a link to share with clients for recurring bookings.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const mtName = meetingTypeName(link.meeting_type_id);
            return (
              <Card key={link.id} padding="sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{link.client_name}</p>
                      <Badge variant={link.is_active ? 'success' : 'neutral'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{link.client_email}</p>
                    {mtName && <p className="text-xs text-jungo-green-600 mt-0.5">{mtName}</p>}
                    {link.label && <p className="text-xs text-gray-400 mt-0.5">{link.label}</p>}
                    {link.is_ongoing ? (
                      <p className="text-xs text-jungo-green-600 mt-0.5 flex items-center gap-1">
                        <InfinityIcon className="w-3 h-3" />
                        Ongoing (no end date)
                      </p>
                    ) : link.frequency ? (
                      <p className="text-xs text-jungo-green-600 mt-0.5 capitalize">
                        {link.frequency}
                        {link.occurrences ? ` - ${link.occurrences} occurrences` : ''}
                        {link.end_date ? ` - until ${link.end_date}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={copiedId === link.id ? <Check className="w-4 h-4 text-jungo-green-500" /> : <Copy className="w-4 h-4" />}
                      onClick={() => copyLink(link.token, link.id)}
                    >
                      {copiedId === link.id ? 'Copied' : 'Copy'}
                    </Button>
                    <button
                      onClick={() => handleToggle(link.id, link.is_active)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={link.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {link.is_active ? <ToggleRight className="w-5 h-5 text-jungo-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Recurring Link" maxWidth="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Client Name" required value={clientName} onChange={e => setClientName(e.target.value)} />
            <Input label="Client Email" type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)} error={emailError} />
          </div>

          <Select
            label="Meeting Type"
            required
            value={meetingTypeId}
            onChange={e => setMeetingTypeId(e.target.value)}
            options={[
              { value: '', label: 'Select...' },
              ...meetingTypes.map(mt => ({ value: mt.id, label: `${mt.name} (${mt.duration_minutes} min)` })),
            ]}
          />

          <Input label="Label (internal note)" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Weekly check-in" />

          <Select
            label="Frequency (optional - leave blank to let client choose)"
            value={frequency}
            onChange={e => setFrequency(e.target.value)}
            options={[
              { value: '', label: 'Let client choose' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'biweekly', label: 'Biweekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Number of Occurrences"
              type="number"
              min="1"
              value={occurrences}
              onChange={e => setOccurrences(e.target.value)}
              placeholder="Optional"
              disabled={isOngoing}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              disabled={isOngoing}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isOngoing}
              onChange={e => {
                setIsOngoing(e.target.checked);
                if (e.target.checked) {
                  setOccurrences('');
                  setEndDate('');
                }
              }}
              className="rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
            />
            <span className="flex items-center gap-1.5">
              <InfinityIcon className="w-4 h-4 text-jungo-green-600" />
              Ongoing (no end date or occurrence limit)
            </span>
          </label>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">Client permissions (auto-determined):</p>
            <p>- Client {allowFrequency ? 'can' : 'cannot'} set frequency {allowFrequency ? '' : '(locked by your selection)'}</p>
            <p>- Client {allowEndDate ? 'can' : 'cannot'} set end date / occurrences {allowEndDate ? '' : '(locked by your selection)'}</p>
          </div>

          <p className="text-xs text-gray-500">
            An invite email with the booking link will be sent to the client automatically when you create this link.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!meetingTypeId || !clientName.trim() || !clientEmail.trim()}>Create Link</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
