'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePushSubscription } from './use-push-subscription';

interface NotificationToggleProps {
  /** Show as a compact icon-only button (good for header strips). */
  compact?: boolean;
}

/// One-click subscribe/unsubscribe to Web Push. Encapsulates permission state
/// so callers can drop it anywhere without managing the full lifecycle.
export function NotificationToggle({ compact }: NotificationToggleProps) {
  const { permission, subscribed, loading, enable, disable } = usePushSubscription();

  if (permission === 'unsupported') return null;

  const Icon = subscribed ? Bell : BellOff;
  const label = subscribed ? 'Notifications on' : 'Enable notifications';
  const denied = permission === 'denied';

  const handleClick = async () => {
    if (loading) return;
    if (denied) {
      toast.error('Notifications are blocked — change browser permission to enable.');
      return;
    }
    try {
      if (subscribed) {
        await disable();
        toast.success('Notifications turned off');
      } else {
        const ok = await enable();
        if (Notification.permission === 'granted') {
          // `enable` returns false when push is not available on the server.
          if (ok === false) {
            toast.error('Push notifications are not available on this server.');
          } else {
            toast.success('Notifications enabled');
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change notification setting');
    }
  };

  const button = (
    <Button
      variant={subscribed ? 'default' : 'outline'}
      size={compact ? 'icon' : 'sm'}
      onClick={handleClick}
      disabled={loading}
      className={compact ? 'h-8 w-8' : 'gap-1'}
      aria-label={label}
    >
      {loading ? (
        <Loader2 className='w-4 h-4 animate-spin' />
      ) : (
        <Icon className='w-4 h-4' />
      )}
      {!compact && <span>{label}</span>}
    </Button>
  );

  if (!compact) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{denied ? 'Notifications blocked' : label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
