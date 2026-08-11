'use client'

import { OfficeThreadView } from '@/components/offices/office-thread-view'

type Props = {
  threadId: number
  onClose: () => void
}

/** Office conversation in the Messages right pane (ticket or office↔office chat). */
export function MessagesOfficePane({ threadId, onClose }: Props) {
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F8FAFC]'>
      <OfficeThreadView threadId={threadId} onBack={onClose} />
    </div>
  )
}
