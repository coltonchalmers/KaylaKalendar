import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthDays, isPast, isToday, hasAvailability, classNames, formatDate } from '@/lib/utils';
import type { AvailabilityRule, AvailabilityOverride } from '@/lib/types';
import { DAY_NAMES_SHORT } from '@/lib/types';

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onNavigate: (direction: -1 | 1) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  maxDate?: Date;
  allowAllFutureDates?: boolean;
}

export default function CalendarGrid({
  year,
  month,
  selectedDate,
  onSelectDate,
  onNavigate,
  canGoBack,
  canGoForward,
  rules,
  overrides,
  maxDate,
  allowAllFutureDates = false,
}: CalendarGridProps) {
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate(-1)}
          disabled={!canGoBack}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
        <button
          onClick={() => onNavigate(1)}
          disabled={!canGoForward}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = formatDate(day);
          const past = isPast(day);
          const beyondMax = maxDate ? day > maxDate : false;
          const today = isToday(day);
          const hasAvail = !past && !beyondMax && hasAvailability(day, rules, overrides);
          const selectable = allowAllFutureDates ? (!past && !beyondMax) : hasAvail;
          const selected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => selectable && onSelectDate(dateStr)}
              disabled={!selectable}
              className={classNames(
                'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 relative',
                selected
                  ? 'bg-jungo-green-500 text-white shadow-md ring-2 ring-jungo-green-300 ring-offset-1'
                  : selectable
                  ? hasAvail
                    ? 'bg-jungo-green-50 text-jungo-green-700 hover:bg-jungo-green-100 hover:shadow-sm cursor-pointer'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:shadow-sm cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed',
                today && !selected && 'ring-2 ring-jungo-green-300'
              )}
            >
              {day.getDate()}
              {today && (
                <span className={classNames(
                  'absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                  selected ? 'bg-white' : 'bg-jungo-green-500'
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
