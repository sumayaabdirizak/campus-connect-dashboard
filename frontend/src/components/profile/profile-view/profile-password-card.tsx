'use client';

import { useState } from 'react';
import { Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { changeProfilePassword } from '@/lib/profile/services';
import { ProfileSectionHeading } from './profile-section-heading';

export function ProfilePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await changeProfilePassword({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className='rounded-xl border border-border bg-card p-4 sm:p-5'>
      <ProfileSectionHeading icon={Lock} title='Change Password' />
      <form onSubmit={submit}>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='current-password'>
              Current Password <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='current-password'
              type='password'
              autoComplete='current-password'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='new-password'>
              New Password <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='new-password'
              type='password'
              autoComplete='new-password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='confirm-password'>
              Confirm Password <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='confirm-password'
              type='password'
              autoComplete='new-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>
        <div className='mt-4 flex justify-end border-t border-border pt-4'>
          <Button
            type='submit'
            disabled={busy}
            className='gap-2 bg-primary text-white hover:bg-[#2563EB]'
          >
            <Save className='size-4' aria-hidden />
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
