'use client'

import { Label } from '@/features/ui/components/label'
import { Switch } from '@/features/ui/components/switch'

function AccessRow({
  id,
  title,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  title: string
  hint: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className='flex items-center justify-between gap-3 px-3.5 py-3'>
      <div className='min-w-0 space-y-0.5'>
        <Label
          htmlFor={id}
          className='text-sm font-medium text-foreground'
        >
          {title}
        </Label>
        <p className='text-[11px] leading-snug text-muted-foreground'>{hint}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

export function LockChannelToggle({
  locked,
  onToggle,
  isArchived,
  canManageRoles,
  everyoneRoleId,
  lockBusy,
}: {
  locked: boolean
  onToggle: (next: boolean) => void
  isArchived: boolean
  canManageRoles: boolean
  everyoneRoleId: number | null
  lockBusy: boolean
}) {
  return (
    <AccessRow
      id='channel-lock'
      title='Lock'
      hint='Read-only — no posting or reactions.'
      checked={locked}
      onCheckedChange={onToggle}
      disabled={
        isArchived || !canManageRoles || everyoneRoleId == null || lockBusy
      }
    />
  )
}
