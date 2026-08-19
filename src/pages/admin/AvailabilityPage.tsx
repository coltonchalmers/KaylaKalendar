import { useState } from 'react';
import { Plus, Trash2, Ban, CalendarOff } from 'lucide-react';
import { useAvailability } from '@/hooks/useAvailability';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DAY_NAMES } from '@/lib/types';
import { formatTime, formatDisplayDate, classNames } from '@/lib/utils';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const time = `${h.toString().padStart(2, '0')}:${m}`;
  return { value: time, label: formatTime(time) };
});

export default function AvailabilityPage() {
  const { rules, overrides, loading, addRule, deleteRule, addOverride, deleteOverride } = useAvailability();

  const [showAddRule, setShowAddRule] = useState(false);
  const [newDay, setNewDay] = useState('1');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [ruleLoading, setRuleLoading] = useState(false);

  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideBlocked, setOverrideBlocked] = useState(true);
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const handleAddRule = async () => {
    setRuleLoading(true);
    try {
      await addRule({ day_of_week: parseInt(newDay), start_time: newStart, end_time: newEnd });
      setShowAddRule(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRuleLoading(false);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) return;
    setOverrideLoading(true);
    try {
      await addOverride({
        date: overrideDate,
        is_blocked: overrideBlocked,
        start_time: overrideBlocked ? undefined : overrideStart,
        end_time: overrideBlocked ? undefined : overrideEnd,
        reason: overrideReason || undefined,
      });
      setShowAddOverride(false);
      setOverrideDate('');
      setOverrideReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try { await deleteRule(id); } catch (err) { console.error(err); }
  };

  const handleDeleteOverride = async (id: string) => {
    try { await deleteOverride(id); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const rulesByDay = DAY_NAMES.map((name, i) => ({
    name,
    dayIndex: i,
    dayRules: rules.filter(r => r.day_of_week === i),
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-gray-500 mt-1">Set your weekly hours and block specific dates.</p>
      </div>

      {/* Weekly Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddRule(true)}>
            Add Hours
          </Button>
        </div>

        <div className="space-y-2">
          {rulesByDay.map(({ name, dayRules }) => (
            <Card key={name} padding="sm">
              <div className="flex items-center justify-between">
                <span className={classNames(
                  'text-sm font-medium w-24',
                  dayRules.length > 0 ? 'text-gray-900' : 'text-gray-400'
                )}>
                  {name}
                </span>
                <div className="flex-1 flex flex-wrap gap-2 justify-end">
                  {dayRules.length === 0 ? (
                    <span className="text-sm text-gray-400">Unavailable</span>
                  ) : (
                    dayRules.map(rule => (
                      <div key={rule.id} className="flex items-center gap-2 bg-jungo-green-50 text-jungo-green-700 text-sm px-3 py-1 rounded-full">
                        {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-jungo-green-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Date Overrides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Date Overrides</h2>
          <Button size="sm" variant="secondary" icon={<Ban className="w-4 h-4" />} onClick={() => setShowAddOverride(true)}>
            Block Date
          </Button>
        </div>

        {overrides.length === 0 ? (
          <Card className="text-center py-8">
            <CalendarOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No date overrides set. Block dates for holidays or special hours.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {overrides.map(override => (
              <Card key={override.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDisplayDate(override.date)}</p>
                    <p className="text-xs text-gray-500">
                      {override.is_blocked
                        ? 'Blocked - No availability'
                        : `Custom hours: ${formatTime(override.start_time!)} - ${formatTime(override.end_time!)}`}
                      {override.reason && ` - ${override.reason}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteOverride(override.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      <Modal open={showAddRule} onClose={() => setShowAddRule(false)} title="Add Available Hours">
        <div className="space-y-4">
          <Select
            label="Day"
            value={newDay}
            onChange={e => setNewDay(e.target.value)}
            options={DAY_NAMES.map((name, i) => ({ value: i.toString(), label: name }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Start Time" value={newStart} onChange={e => setNewStart(e.target.value)} options={TIME_OPTIONS} />
            <Select label="End Time" value={newEnd} onChange={e => setNewEnd(e.target.value)} options={TIME_OPTIONS} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddRule(false)}>Cancel</Button>
            <Button onClick={handleAddRule} loading={ruleLoading}>Add Hours</Button>
          </div>
        </div>
      </Modal>

      {/* Add Override Modal */}
      <Modal open={showAddOverride} onClose={() => setShowAddOverride(false)} title="Block or Override Date">
        <div className="space-y-4">
          <Input label="Date" type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} required />
          <Select
            label="Type"
            value={overrideBlocked ? 'blocked' : 'custom'}
            onChange={e => setOverrideBlocked(e.target.value === 'blocked')}
            options={[
              { value: 'blocked', label: 'Block entire day' },
              { value: 'custom', label: 'Custom hours' },
            ]}
          />
          {!overrideBlocked && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Start Time" value={overrideStart} onChange={e => setOverrideStart(e.target.value)} options={TIME_OPTIONS} />
              <Select label="End Time" value={overrideEnd} onChange={e => setOverrideEnd(e.target.value)} options={TIME_OPTIONS} />
            </div>
          )}
          <Input label="Reason (optional)" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="e.g., Holiday, Team retreat" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddOverride(false)}>Cancel</Button>
            <Button variant="secondary" onClick={handleAddOverride} loading={overrideLoading}>
              {overrideBlocked ? 'Block Date' : 'Set Custom Hours'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
