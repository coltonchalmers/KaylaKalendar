import { classNames } from '@/lib/utils';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    error: 'bg-red-50 text-red-700 ring-red-600/20',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    neutral: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    confirmed: { variant: 'success', label: 'Confirmed' },
    cancelled: { variant: 'error', label: 'Cancelled' },
    completed: { variant: 'info', label: 'Completed' },
  };

  const { variant, label } = map[status] || { variant: 'neutral' as const, label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
