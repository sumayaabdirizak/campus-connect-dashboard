'use client';

import Link from 'next/link';
import { ClipboardCopy, Eye, MoreHorizontal, User } from 'lucide-react';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { PlatformAuditLogEntry } from '@/lib/admin/services';
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { Checkbox } from '@/features/ui/components/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/components/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  actionStyles,
  formatTimestamp,
  severityStyles,
  userInitials,
} from './audit-log-styles';
import type { AuditColumnId } from './audit-table-utils';

interface AuditLogRowProps {
  entry: PlatformAuditLogEntry;
  selected: boolean;
  showModuleColumn: boolean;
  col: (id: AuditColumnId) => boolean;
  onToggle: () => void;
  onView: () => void;
  onCopyId: () => void;
}

export function AuditLogRow({
  entry,
  selected,
  showModuleColumn,
  col,
  onToggle,
  onView,
  onCopyId,
}: AuditLogRowProps) {
  const ts = formatTimestamp(entry.createdAt);

  return (
    <PosTableRow>
      <PosTableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select log ${entry.id}`}
        />
      </PosTableCell>
      {col('timestamp') ? (
        <PosTableCell>
          <div className='text-xs leading-tight'>
            <div className='font-medium'>{ts.date}</div>
            <div className='text-muted-foreground'>{ts.time}</div>
          </div>
        </PosTableCell>
      ) : null}
      {col('user') ? (
        <PosTableCell>
          <div className='flex items-center gap-2'>
            <Avatar className='size-8'>
              <AvatarFallback className='text-[10px]'>
                {userInitials(entry.actorName)}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate text-sm font-medium'>{entry.actorName ?? 'System'}</p>
              <p className='text-muted-foreground truncate text-xs'>
                {entry.actorEmail ?? '—'}
              </p>
            </div>
          </div>
        </PosTableCell>
      ) : null}
      {col('action') ? (
        <PosTableCell>
          <Badge
            variant='secondary'
            className={cn('font-normal capitalize', actionStyles[entry.actionType] ?? '')}
          >
            {entry.actionLabel}
          </Badge>
        </PosTableCell>
      ) : null}
      {showModuleColumn ? (
        <PosTableCell className='text-muted-foreground text-sm'>{entry.module}</PosTableCell>
      ) : null}
      {col('description') ? (
        <PosTableCell className='max-w-[280px] truncate'>
          <span title={entry.description}>{entry.description}</span>
        </PosTableCell>
      ) : null}
      {col('ip') ? (
        <PosTableCell className='text-muted-foreground font-mono text-xs'>
          {entry.ipAddress ?? '—'}
        </PosTableCell>
      ) : null}
      {col('severity') ? (
        <PosTableCell>
          <Badge className={cn('capitalize', severityStyles[entry.severity])}>
            {entry.severity}
          </Badge>
        </PosTableCell>
      ) : null}
      {col('status') ? (
        <PosTableCell>
          <Badge variant={entry.status === 'success' ? 'outline' : 'destructive'}>
            {entry.status}
          </Badge>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type='button' variant='ghost' size='icon' className='size-8'>
              <MoreHorizontal className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={onView}>
              <Eye className='mr-2 size-4' />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyId}>
              <ClipboardCopy className='mr-2 size-4' />
              Copy log ID
            </DropdownMenuItem>
            {entry.actorId ? (
              <DropdownMenuItem asChild>
                <Link href='/dashboard/users'>
                  <User className='mr-2 size-4' />
                  View user profile
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </PosTableCell>
    </PosTableRow>
  );
}
