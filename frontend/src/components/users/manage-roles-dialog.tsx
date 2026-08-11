'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { Icons } from '@/components/icons';
import { useQuery, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { useRoles } from '@/lib/roles/queries';
import { fetchUserRoles, grantUserRole, revokeUserRole } from '@/lib/users/services';

type Props = {
  userId: number | null;
  userName: string;
  onOpenChange: (open: boolean) => void;
};

export function ManageRolesDialog({ userId, userName, onOpenChange }: Props) {
  const open = userId != null;
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('');
  const [pending, setPending] = useState<'grant' | string | null>(null);

  const { data: allRoles = [] } = useRoles();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => fetchUserRoles(userId as number),
    enabled: open
  });

  const primaryRole = data?.primaryRole;
  const extraRoles = (data?.availableRoles ?? []).filter((r) => r !== primaryRole);
  const grantableRoles = allRoles
    .map((r) => r.name)
    .filter((name) => name !== primaryRole && !extraRoles.includes(name));

  const handleGrant = async () => {
    if (!userId || !selectedRole) return;
    setPending('grant');
    try {
      await grantUserRole(userId, selectedRole);
      showToast('success', `Granted ${selectedRole}`);
      setSelectedRole('');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      handleApiError(err, 'Failed to grant role');
    } finally {
      setPending(null);
    }
  };

  const handleRevoke = async (role: string) => {
    if (!userId) return;
    setPending(role);
    try {
      await revokeUserRole(userId, role);
      showToast('success', `Revoked ${role}`);
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      handleApiError(err, 'Failed to revoke role');
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>
            {userName} can switch between their primary role and any roles granted here.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className='text-muted-foreground py-6 text-center text-sm'>Loading...</p>
        ) : (
          <div className='space-y-4'>
            <div>
              <p className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide'>
                Primary role
              </p>
              <Badge variant='outline' className='border-primary/20 bg-primary/10 text-primary'>
                {primaryRole}
              </Badge>
            </div>

            <div>
              <p className='text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide'>
                Additional roles
              </p>
              {extraRoles.length === 0 ? (
                <p className='text-muted-foreground text-sm'>None granted yet.</p>
              ) : (
                <div className='flex flex-wrap gap-1.5'>
                  {extraRoles.map((role) => (
                    <Badge key={role} variant='secondary' className='gap-1 py-1 pl-2.5 pr-1'>
                      {role}
                      <button
                        type='button'
                        aria-label={`Revoke ${role}`}
                        className='hover:text-destructive'
                        disabled={pending === role}
                        onClick={() => handleRevoke(role)}
                      >
                        <Icons.close className='size-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className='flex items-end gap-2'>
              <div className='flex-1 space-y-1.5'>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                  Grant a role
                </p>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className='h-9'>
                    <SelectValue placeholder='Select role...' />
                  </SelectTrigger>
                  <SelectContent>
                    {grantableRoles.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type='button'
                size='sm'
                className='h-9'
                disabled={!selectedRole || pending === 'grant'}
                onClick={handleGrant}
              >
                {pending === 'grant' ? 'Granting...' : 'Grant'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
