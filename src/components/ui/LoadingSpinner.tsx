import { Loader2 } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export default function LoadingSpinner({ size = 'md', className, message }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className={classNames('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={classNames(sizes[size], 'animate-spin text-jungo-green-500')} />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}
