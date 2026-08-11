'use client'

import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'

export function MemberRemoveButton({
  name,
  onRemove,
}: {
  name: string
  onRemove: () => void
}) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-8 shrink-0 rounded-lg text-[#667085] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover/member:opacity-100'
      aria-label={`Remove ${name} from channel`}
      onClick={onRemove}
    >
      <Icons.trash className='size-3.5' />
    </Button>
  )
}
