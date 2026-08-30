'use client';

import { Switch } from '@/features/ui/components/switch';
import { usePushSubscription } from '@/lib/notifications/services';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationToggleProps {
  compact?: boolean;
}

export function NotificationToggle({ compact }: NotificationToggleProps) {
  const { subscribed, loading, permission, enable, disable } = usePushSubscription();
  const isSupported = permission !== 'unsupported';

  async function handleChange(checked: boolean) {
    try {
      if (checked) {
        const success = await enable();
        if (!success) {
          toast.error('Could not enable push notifications');
        } else {
          toast.success('Push notifications enabled');
        }
      } else {
        await disable();
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification preferences');
    }
  }

  if (!isSupported) {
    return <span className='text-xs text-muted-foreground'>Not supported in your browser</span>;
  }

  return (
    <Switch
      checked={subscribed}
      onCheckedChange={handleChange}
      disabled={loading}
      aria-label='Browser push notifications'
      className={cn(
        compact &&
          'h-5 w-9 border-border data-[state=unchecked]:border-[#667085] data-[state=unchecked]:bg-[#D0D5DD]'
      )}
    />
  );
}
