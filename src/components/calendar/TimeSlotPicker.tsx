import { Clock, Globe } from 'lucide-react';
import { formatTime, formatDisplayDate, classNames, getTimezoneLabel } from '@/lib/utils';

interface TimeSlotPickerProps {
  date: string;
  slots: string[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  loading?: boolean;
  timezone?: string;
}

export default function TimeSlotPicker({ date, slots, selectedSlot, onSelectSlot, loading, timezone }: TimeSlotPickerProps) {
  return (
    <div className="animate-slide-up">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{formatDisplayDate(date)}</h3>
      <p className="text-sm text-gray-500 mb-2">Select a time</p>
      {timezone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
          <Globe className="w-3.5 h-3.5" />
          <span>Times shown in: {getTimezoneLabel(timezone)}</span>
        </div>
      )}
      {!timezone && <div className="mb-5" />}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Clock className="w-5 h-5 animate-spin mr-2" />
          Loading times...
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No available times on this date.</p>
          <p className="text-sm text-gray-400 mt-1">Please select a different day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map(slot => (
            <button
              key={slot}
              onClick={() => onSelectSlot(slot)}
              className={classNames(
                'px-4 py-3 rounded-lg text-sm font-medium border transition-all duration-150',
                selectedSlot === slot
                  ? 'bg-jungo-green-500 text-white border-jungo-green-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-jungo-green-300 hover:bg-jungo-green-50 hover:shadow-sm'
              )}
            >
              {formatTime(slot)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
