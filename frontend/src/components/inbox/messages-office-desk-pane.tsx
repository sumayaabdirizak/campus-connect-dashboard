'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/features/ui/components/button'
import { Textarea } from '@/features/ui/components/textarea'
import { useQueryClient } from '@/lib/async-query'
import { inboxKeys } from '@/lib/inbox/inbox-queries'
import { messagesOfficeThreadHref } from '@/lib/inbox/services/messages-href'
import {
  useOversightOfficeDm,
  useSendOversightOfficeDm
} from '@/lib/offices/queries'

type Props = {
  slug: string
  onClose: () => void
}

/** DM-style chat: Academic Office ↔ one support office. */
export function MessagesOfficeDeskPane({ slug, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useOversightOfficeDm(slug)
  const sendMutation = useSendOversightOfficeDm(slug)
  const [draft, setDraft] = useState('')

  const threadId = data?.thread?.id ?? null

  useEffect(() => {
    if (threadId != null && threadId > 0) {
      router.replace(messagesOfficeThreadHref(threadId))
    }
  }, [threadId, router])

  function sendFirst() {
    const content = draft.trim()
    if (!content) return
    sendMutation.mutate(
      { content },
      {
        onSuccess: (payload) => {
          setDraft('')
          void qc.invalidateQueries({ queryKey: inboxKeys.all })
          if (payload.thread?.id) {
            router.replace(messagesOfficeThreadHref(payload.thread.id))
          }
        },
        onError: (e) => toast.error(e.message)
      }
    )
  }

  if (isLoading && !data) {
    return (
      <div className='flex h-full items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' /> Opening chat…
      </div>
    )
  }

  if (threadId) {
    return (
      <div className='flex h-full items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' /> Opening chat…
      </div>
    )
  }

  const office = data?.office
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F8FAFC]'>
      <div className='shrink-0 border-b border-[#E5E7EB] bg-white px-4 py-3'>
        <div className='flex items-center gap-3'>
          <span className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-full'>
            <Building2 className='size-5' />
          </span>
          <div className='min-w-0 flex-1'>
            <h2 className='truncate text-base font-semibold text-[#101828]'>
              {office?.name ?? slug.replace(/-/g, ' ')}
            </h2>
            <p className='text-muted-foreground text-xs'>
              {office?.faculty
                ? `Faculty · ${office.faculty.name}`
                : 'Direct message with this office'}
            </p>
          </div>
          <button
            type='button'
            className='text-muted-foreground text-xs underline'
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center'>
        <p className='text-sm text-[#475467]'>
          Say hello — your message opens a direct chat with{' '}
          <span className='font-medium text-[#101828]'>{office?.name ?? 'this office'}</span>.
        </p>
      </div>

      <div className='shrink-0 border-t border-[#E5E7EB] bg-white p-3'>
        <div className='flex items-end gap-2'>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendFirst()
              }
            }}
            placeholder='Write a message…'
            className='max-h-36 min-h-11 flex-1 resize-none py-2.5'
            maxLength={5000}
          />
          <Button
            size='icon'
            onClick={sendFirst}
            disabled={!draft.trim() || sendMutation.isPending}
            aria-label='Send'
          >
            {sendMutation.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Send className='size-4' />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
