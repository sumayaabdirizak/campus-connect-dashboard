'use client';

import type {
  DiscussionOverwrite,
  DiscussionOverwriteTarget
} from '../../../../api/types';
import { AddTargetMenu } from './add-target-menu';
import { PermissionsEmptyState } from './empty-state';
import { OverwriteCard } from './overwrite-card';

interface OverwriteListProps {
  channelId: number;
  kind: DiscussionOverwriteTarget;
  overwrites: DiscussionOverwrite[];
  pickerOptions: Array<{ id: number; label: string; subtitle?: string | null }>;
  resolveName: (id: number) => string;
  resolveSubtitle: (id: number) => string | null;
  onAdd: (id: number) => void;
}

export function OverwriteList({
  channelId,
  kind,
  overwrites,
  pickerOptions,
  resolveName,
  resolveSubtitle,
  onAdd
}: OverwriteListProps) {
  const picker = <AddTargetMenu kind={kind} options={pickerOptions} onPick={onAdd} />;

  if (overwrites.length === 0) {
    return <PermissionsEmptyState kind={kind} picker={picker} />;
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-[11px] text-muted-foreground'>
          {overwrites.length} {kind === 'ROLE' ? 'role' : 'member'}
          {overwrites.length === 1 ? '' : 's'} with an overwrite
        </p>
        {picker}
      </div>
      <div className='space-y-3'>
        {overwrites.map((o) => (
          <OverwriteCard
            key={`${o.targetType}-${o.targetId}`}
            channelId={channelId}
            overwrite={o}
            targetName={resolveName(o.targetId)}
            targetSubtitle={resolveSubtitle(o.targetId)}
            isOptimistic={o.id < 0}
          />
        ))}
      </div>
    </div>
  );
}
