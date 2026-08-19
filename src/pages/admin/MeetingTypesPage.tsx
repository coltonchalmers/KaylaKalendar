import { useState } from 'react';
import { CalendarClock, Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, Pencil, ChevronDown } from 'lucide-react';
import { useMeetingTypes } from '@/hooks/useMeetingTypes';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { classNames } from '@/lib/utils';
import type { MeetingType } from '@/lib/types';

export default function MeetingTypesPage() {
  const { meetingTypes, loading, createMeetingType, updateMeetingType, deleteMeetingType } = useMeetingTypes();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MeetingType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [isActive, setIsActive] = useState(true);
  const [bufferMinutes, setBufferMinutes] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [contactEmailOverride, setContactEmailOverride] = useState('');
  const [contactPhoneOverride, setContactPhoneOverride] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOverrides, setShowOverrides] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDuration('30');
    setIsActive(true);
    setBufferMinutes('');
    setZoomLink('');
    setContactEmailOverride('');
    setContactPhoneOverride('');
    setShowOverrides(false);
    setShowCreate(true);
  };

  const openEdit = (mt: MeetingType) => {
    setEditing(mt);
    setName(mt.name);
    setDescription(mt.description || '');
    setDuration(mt.duration_minutes.toString());
    setIsActive(mt.is_active);
    setBufferMinutes(mt.buffer_minutes?.toString() || '');
    setZoomLink(mt.zoom_link || '');
    setContactEmailOverride(mt.contact_email_override || '');
    setContactPhoneOverride(mt.contact_phone_override || '');
    const hasOverrides = !!(mt.buffer_minutes || mt.zoom_link || mt.contact_email_override || mt.contact_phone_override);
    setShowOverrides(hasOverrides);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: parseInt(duration) || 30,
        is_active: isActive,
        buffer_minutes: bufferMinutes.trim() ? parseInt(bufferMinutes) : null,
        zoom_link: zoomLink.trim() || null,
        contact_email_override: contactEmailOverride.trim() || null,
        contact_phone_override: contactPhoneOverride.trim() || null,
      };
      if (editing) {
        await updateMeetingType(editing.id, payload);
      } else {
        await createMeetingType(payload);
      }
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/m/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = async (mt: MeetingType) => {
    try { await updateMeetingType(mt.id, { is_active: !mt.is_active }); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMeetingType(id); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Types</h1>
          <p className="text-gray-500 mt-1">Create distinct meeting types, each with its own booking link.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New Meeting Type
        </Button>
      </div>

      {meetingTypes.length === 0 ? (
        <Card className="text-center py-16">
          <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No meeting types yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create a meeting type to generate a shareable booking link for it.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetingTypes.map(mt => (
            <Card key={mt.id} padding="lg">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{mt.name}</h3>
                    <Badge variant={mt.is_active ? 'success' : 'neutral'}>
                      {mt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {mt.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{mt.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-jungo-green-500" />
                  {mt.duration_minutes} min
                </span>
                {mt.buffer_minutes != null && (
                  <span className="text-gray-400">+{mt.buffer_minutes} min buffer</span>
                )}
                {mt.zoom_link && (
                  <span className="text-gray-400 truncate max-w-[120px]" title={mt.zoom_link}>Zoom override</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={copiedId === mt.id ? <Check className="w-4 h-4 text-jungo-green-500" /> : <Copy className="w-4 h-4" />}
                  onClick={() => copyLink(mt.token, mt.id)}
                >
                  {copiedId === mt.id ? 'Copied' : 'Copy Link'}
                </Button>
                <button
                  onClick={() => openEdit(mt)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggle(mt)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={mt.is_active ? 'Deactivate' : 'Activate'}
                >
                  {mt.is_active ? <ToggleRight className="w-5 h-5 text-jungo-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleDelete(mt.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editing ? 'Edit Meeting Type' : 'New Meeting Type'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Initial Consultation"
          />
          <Textarea
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Shown to clients on the booking page..."
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min="15"
            max="240"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />

          {/* Collapsible Optional Overrides */}
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowOverrides(!showOverrides)}
              className="w-full flex items-center justify-between gap-2 py-1 text-left"
            >
              <span className="text-sm font-semibold text-gray-700">Optional Overrides</span>
              <ChevronDown
                className={classNames(
                  'w-4 h-4 text-gray-400 transition-transform',
                  showOverrides && 'rotate-180'
                )}
              />
            </button>
            {showOverrides && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-gray-400">
                  Leave blank to use the global defaults from your Settings page.
                </p>
                <Input
                  label="Buffer Between Meetings (minutes)"
                  type="number"
                  min="0"
                  max="120"
                  value={bufferMinutes}
                  onChange={e => setBufferMinutes(e.target.value)}
                  placeholder="Uses global default"
                />
                <Input
                  label="Zoom / Meeting Link"
                  type="url"
                  value={zoomLink}
                  onChange={e => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
                <Input
                  label="Contact Email Override"
                  type="email"
                  value={contactEmailOverride}
                  onChange={e => setContactEmailOverride(e.target.value)}
                  placeholder="Uses global contact email"
                />
                <Input
                  label="Contact Phone Override"
                  type="tel"
                  value={contactPhoneOverride}
                  onChange={e => setContactPhoneOverride(e.target.value)}
                  placeholder="Uses global contact phone"
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
            />
            Active (clients can book this meeting type)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Save Changes' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
