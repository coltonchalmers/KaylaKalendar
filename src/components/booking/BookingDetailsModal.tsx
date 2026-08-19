import { useState, useEffect, useMemo, useCallback } from 'react';
import { XCircle, CalendarClock, CheckCircle, Repeat, Clock, ArrowRight, AlertTriangle, Edit3, Save, Bell, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/Badge';
import { formatTime, formatDisplayDate, minutesToTime, timeToMinutes } from '@/lib/utils';
import { useBookings, type ConflictResult } from '@/hooks/useBookings';
import { useMeetingTypes } from '@/hooks/useMeetingTypes';
import { useSettings } from '@/hooks/useSettings';
import type { Booking, BookingChange, MeetingType } from '@/lib/types';

interface Props {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, open, onClose }: Props) {
  const {
    fetchBookings,
    cancelBooking,
    updateBookingStatus,
    rescheduleBooking,
    cancelRecurringGroup,
    rescheduleRecurringGroup,
    checkMeetingTypeConflict,
    updateBookingMeetingType,
    updateBookingDetails,
    fetchRecurringGroup,
    fetchBookingChanges,
  } = useBookings({ autoFetch: false });
  const { meetingTypes } = useMeetingTypes();
  const { settings } = useSettings();

  const [mode, setMode] = useState<'view' | 'edit' | 'reschedule' | 'shift'>('view');
  const [recurringGroup, setRecurringGroup] = useState<Booking[]>([]);
  const [changes, setChanges] = useState<BookingChange[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit mode state
  const [editMeetingTypeId, setEditMeetingTypeId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editZoomLink, setEditZoomLink] = useState('');
  const [notifyClient, setNotifyClient] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [bufferWarning, setBufferWarning] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Shift series state
  const [shiftDays, setShiftDays] = useState('1');

  const meetingTypeMap = useMemo(() => {
    const map: Record<string, MeetingType> = {};
    meetingTypes.forEach(mt => { map[mt.id] = mt; });
    return map;
  }, [meetingTypes]);

  useEffect(() => {
    if (!booking || !open) {
      setMode('view');
      setRecurringGroup([]);
      setChanges([]);
      setConflictError(null);
      setBufferWarning(null);
      return;
    }
    setEditMeetingTypeId(booking.meeting_type_id || '');
    setEditEmail(booking.client_email);
    setEditPhone(booking.client_phone || '');
    setEditZoomLink(booking.zoom_link || '');
    setNotifyClient(settings?.notify_client_on_admin_change ?? false);
    setRescheduleDate(booking.date);
    setRescheduleTime(booking.start_time);

    (async () => {
      if (booking.recurrence_group_id) {
        const group = await fetchRecurringGroup(booking.recurrence_group_id);
        setRecurringGroup(group);
      }
      const ch = await fetchBookingChanges(booking.id);
      setChanges(ch);
    })();
  }, [booking, open, settings?.notify_client_on_admin_change, fetchRecurringGroup, fetchBookingChanges]);

  const handleMeetingTypeChange = useCallback(async (mtId: string) => {
    setEditMeetingTypeId(mtId);
    setConflictError(null);
    setBufferWarning(null);
    if (!booking || !mtId || mtId === booking.meeting_type_id) return;
    const mt = meetingTypeMap[mtId];
    if (!mt) return;
    try {
      const result: ConflictResult = await checkMeetingTypeConflict(
        booking.id, booking.date, booking.start_time,
        mt.duration_minutes, mt.buffer_minutes ?? settings?.buffer_minutes ?? 0
      );
      if (result.hasConflict) {
        setConflictError(
          `Overlaps with ${result.conflictingBooking?.first_name} ${result.conflictingBooking?.last_name} at ${formatTime(result.conflictingBooking?.start_time || '')}. Change blocked.`
        );
      } else if (result.hasBufferOverlap) {
        setBufferWarning(
          `Eats into buffer time near ${result.conflictingBooking?.first_name} ${result.conflictingBooking?.last_name}. You can still save.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [booking, meetingTypeMap, checkMeetingTypeConflict, settings?.buffer_minutes]);

  const refreshAndClose = async () => {
    await fetchBookings();
    onClose();
  };

  const handleCancel = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await cancelBooking(booking.id, true);
      await refreshAndClose();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await updateBookingStatus(booking.id, 'completed');
      await refreshAndClose();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleCancelGroup = async () => {
    if (!booking?.recurrence_group_id) return;
    setActionLoading(true);
    try {
      await cancelRecurringGroup(booking.recurrence_group_id, true);
      await refreshAndClose();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleSaveEdit = async () => {
    if (!booking || conflictError) return;
    setActionLoading(true);
    try {
      if (editMeetingTypeId !== (booking.meeting_type_id || '')) {
        const mt = meetingTypeMap[editMeetingTypeId];
        if (mt) {
          await updateBookingMeetingType(
            booking.id, editMeetingTypeId, mt.duration_minutes,
            mt.buffer_minutes ?? settings?.buffer_minutes ?? 0, notifyClient
          );
        }
      }
      await updateBookingDetails(booking.id, {
        client_email: editEmail,
        client_phone: editPhone || null,
        zoom_link: editZoomLink || null,
      }, notifyClient);
      await refreshAndClose();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleReschedule = async () => {
    if (!booking || !rescheduleDate || !rescheduleTime) return;
    setActionLoading(true);
    try {
      await rescheduleBooking(booking.id, rescheduleDate, rescheduleTime, booking.duration_minutes, true);
      await refreshAndClose();
    } catch (err) {
      console.error(err);
      alert('Could not reschedule. Please try again.');
    } finally { setActionLoading(false); }
  };

  const handleShiftSeries = async () => {
    if (!booking?.recurrence_group_id) return;
    const days = parseInt(shiftDays);
    if (!days) return;
    setActionLoading(true);
    try {
      const count = await rescheduleRecurringGroup(booking.recurrence_group_id, days, true);
      alert(`${count} booking${count !== 1 ? 's' : ''} shifted by ${days > 0 ? '+' : ''}${days} day${Math.abs(days) !== 1 ? 's' : ''}.`);
      await refreshAndClose();
    } catch (err) {
      console.error(err);
      alert('Could not shift series. Please try again.');
    } finally { setActionLoading(false); }
  };

  if (!booking) return null;

  const isRecurring = !!booking.recurrence_group_id;
  const upcomingInGroup = recurringGroup.filter(
    b => b.status === 'confirmed' && b.date >= new Date().toISOString().slice(0, 10)
  );
  const lastChange = changes[0];

  return (
    <Modal open={open} onClose={onClose} title="Booking Details" maxWidth="md">
      <div className="space-y-4">
        {mode === 'view' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Client</p>
                <p className="font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-900">{booking.client_email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
                <p className="text-sm text-gray-900">{formatDisplayDate(booking.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Time</p>
                <p className="text-sm text-gray-900">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
                <p className="text-sm text-gray-900">{booking.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Meeting Type</p>
                <p className="text-sm text-gray-900">
                  {booking.meeting_type_id && meetingTypeMap[booking.meeting_type_id]
                    ? meetingTypeMap[booking.meeting_type_id].name
                    : '---'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <StatusBadge status={booking.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Source</p>
                <p className="text-sm text-gray-900 capitalize">{booking.source.replace('_', ' ')}</p>
              </div>
              {booking.client_phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm text-gray-900">{booking.client_phone}</p>
                </div>
              )}
              {booking.zoom_link && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Zoom Link</p>
                  <a href={booking.zoom_link} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 underline break-all">
                    {booking.zoom_link}
                  </a>
                  {booking.zoom_passcode && (
                    <p className="text-xs text-gray-500 mt-0.5">Passcode: {booking.zoom_passcode}</p>
                  )}
                </div>
              )}
            </div>

            {booking.guests.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Guests</p>
                <div className="flex flex-wrap gap-1.5">
                  {booking.guests.map(g => (
                    <span key={g} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {booking.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{booking.notes}</p>
              </div>
            )}

            {lastChange && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  {lastChange.change_type === 'rescheduled' && lastChange.old_date && (
                    <>Rescheduled from {formatDisplayDate(lastChange.old_date)} at {formatTime(lastChange.old_start_time || '')}</>
                  )}
                  {lastChange.change_type === 'cancelled' && 'This booking was cancelled.'}
                  {lastChange.change_type === 'completed' && 'This booking was marked completed.'}
                </p>
              </div>
            )}

            {isRecurring && recurringGroup.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="w-4 h-4 text-jungo-green-600" />
                  <p className="text-sm font-semibold text-gray-700">Recurring Series ({recurringGroup.length} sessions)</p>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {recurringGroup.map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{formatDisplayDate(b.date)}</span>
                        <span className="text-sm text-gray-500">at {formatTime(b.start_time)}</span>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {booking.status === 'confirmed' && (
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" icon={<Edit3 className="w-4 h-4" />} onClick={() => setMode('edit')}>Edit</Button>
                <Button variant="ghost" size="sm" icon={<CalendarClock className="w-4 h-4" />} onClick={() => setMode('reschedule')}>Reschedule</Button>
                <Button variant="ghost" size="sm" icon={<CheckCircle className="w-4 h-4" />} onClick={handleComplete} loading={actionLoading}>Complete</Button>
                {isRecurring && upcomingInGroup.length > 1 && (
                  <>
                    <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={() => setMode('shift')}>Shift Series</Button>
                    <Button variant="ghost" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={handleCancelGroup} loading={actionLoading}>Cancel All Remaining</Button>
                  </>
                )}
                <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={handleCancel} loading={actionLoading}>Cancel</Button>
              </div>
            )}
          </>
        )}

        {mode === 'edit' && (
          <div className="space-y-4">
            <Select
              label="Meeting Type"
              value={editMeetingTypeId}
              onChange={e => handleMeetingTypeChange(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...meetingTypes.filter(mt => mt.is_active).map(mt => ({
                  value: mt.id,
                  label: `${mt.name} (${mt.duration_minutes} min)`,
                })),
              ]}
            />
            {conflictError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{conflictError}</p>
              </div>
            )}
            {bufferWarning && !conflictError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">{bufferWarning}</p>
              </div>
            )}
            <Input label="Client Email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            <Input label="Client Phone" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            <Input label="Zoom Link" value={editZoomLink} onChange={e => setEditZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." />

            <label className="flex items-center gap-3 cursor-pointer pt-2 border-t">
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={e => setNotifyClient(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
              />
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Notify client of these changes</span>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setMode('view'); setConflictError(null); setBufferWarning(null); }}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={actionLoading} disabled={!!conflictError} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </div>
          </div>
        )}

        {mode === 'reschedule' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Current: {formatDisplayDate(booking.date)} at {formatTime(booking.start_time)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="New Date" type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
              <Input label="New Time" type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
            </div>
            {rescheduleDate && rescheduleTime && (
              <div className="bg-jungo-green-50 border border-jungo-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-jungo-green-800">{formatDisplayDate(rescheduleDate)}</p>
                <p className="text-jungo-green-600">
                  {formatTime(rescheduleTime)} - {formatTime(minutesToTime(timeToMinutes(rescheduleTime) + booking.duration_minutes))}
                  {' '}({booking.duration_minutes} min)
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button onClick={handleReschedule} loading={actionLoading} disabled={!rescheduleDate || !rescheduleTime} icon={<CalendarClock className="w-4 h-4" />}>Confirm Reschedule</Button>
            </div>
          </div>
        )}

        {mode === 'shift' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                This will shift all {upcomingInGroup.length} upcoming confirmed sessions by the number of days you specify. Use a negative number to shift earlier.
              </p>
            </div>
            <Input label="Shift by (days)" type="number" value={shiftDays} onChange={e => setShiftDays(e.target.value)} placeholder="e.g. 3 or -2" />
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 max-h-40 overflow-y-auto">
              <p className="text-gray-500 font-medium mb-2">Preview:</p>
              {upcomingInGroup.slice(0, 5).map(b => {
                const [y, m, d] = b.date.split('-').map(Number);
                const shifted = new Date(y, m - 1, d);
                shifted.setDate(shifted.getDate() + (parseInt(shiftDays) || 0));
                const nds = `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
                return (
                  <div key={b.id} className="flex items-center gap-2 text-gray-600">
                    <span className="line-through text-gray-400">{formatDisplayDate(b.date).split(',')[0]}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span>{formatDisplayDate(nds).split(',')[0]}</span>
                    <span className="text-gray-400">at {formatTime(b.start_time)}</span>
                  </div>
                );
              })}
              {upcomingInGroup.length > 5 && <p className="text-xs text-gray-400 mt-1">...and {upcomingInGroup.length - 5} more</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button onClick={handleShiftSeries} loading={actionLoading} disabled={!parseInt(shiftDays)} icon={<ArrowRight className="w-4 h-4" />}>Shift Series</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
