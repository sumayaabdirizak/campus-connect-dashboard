'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/components/avatar';
import { Button } from '@/features/ui/components/button';
import { resolvePublicAssetUrl } from '@/lib/resolve-public-asset-url';
import {
  removeProfileAvatar,
  uploadProfileAvatar,
  type ProfileMe,
} from '@/lib/profile/services';

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileAvatarField({
  profile,
  onUpdated,
}: {
  profile: ProfileMe;
  onUpdated: (next: ProfileMe) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const name = profile.full_name || 'User';
  const avatarSrc = resolvePublicAssetUrl(profile.avatarUrl);

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    setBusy(true);
    try {
      onUpdated(await uploadProfileAvatar(file));
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onRemove() {
    if (!profile.avatarUrl || busy) return;
    setBusy(true);
    try {
      onUpdated(await removeProfileAvatar());
      toast.success('Profile photo removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove photo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Avatar className='size-24 border border-[#E5E7EB] bg-[#F9FAFB]'>
        {avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
        <AvatarFallback className='bg-[#F9FAFB] text-sm font-semibold text-[#667085]'>
          {initialsOf(name) || <ImageIcon className='size-5' />}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className='mb-0.5 text-sm font-semibold text-[#101828]'>Upload profile image</p>
        <p className='mb-2 text-xs text-[#667085]'>Image should be below 2MB</p>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={busy}
            className='relative h-8 gap-1 text-xs'
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className='size-3.5 animate-spin' />
            ) : (
              <RefreshCcw className='size-3.5' />
            )}
            Change Image
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={busy || !profile.avatarUrl}
            aria-label='Remove profile photo'
            className='size-8 rounded-full'
            onClick={() => void onRemove()}
          >
            <Trash2 className='size-3.5' />
          </Button>
          <input
            ref={inputRef}
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className='hidden'
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}
