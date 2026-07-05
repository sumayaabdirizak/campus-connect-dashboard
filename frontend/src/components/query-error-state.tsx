import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QueryErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared error UI for failed data fetches (useQuery / apiClient).
 */
export function QueryErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Please try again.',
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center',
        className
      )}
      role='alert'
    >
      <AlertCircle className='size-8 text-destructive/80' aria-hidden />
      <div className='space-y-1'>
        <p className='text-sm font-medium'>{title}</p>
        <p className='text-sm text-muted-foreground max-w-sm'>{message}</p>
      </div>
      {onRetry ? (
        <Button type='button' variant='outline' size='sm' onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
