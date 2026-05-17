'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useEditClub } from '../../api/queries'
import type { Club } from '../../api/types'

export function RulesTab({ club }: { club: Club }) {
  const [rules, setRules] = useState(club.rules ?? '')
  const [preview, setPreview] = useState(false)
  const editMutation = useEditClub()

  const isDirty = rules !== (club.rules ?? '')

  const handleSave = () => {
    editMutation.mutate({
      clubId: club.id,
      data: { rules: rules.trim() || null },
    })
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium'>Club Rules</h3>
          <p className='text-xs text-muted-foreground'>
            Set the guidelines members should follow. Markdown is supported.
          </p>
        </div>
        <div className='flex gap-1'>
          <Button
            variant={!preview ? 'default' : 'ghost'}
            size='sm'
            className='h-7 text-xs'
            onClick={() => setPreview(false)}
          >
            Edit
          </Button>
          <Button
            variant={preview ? 'default' : 'ghost'}
            size='sm'
            className='h-7 text-xs'
            onClick={() => setPreview(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Side-by-side on md+, stacked on mobile */}
      <div className={cn('gap-4', preview ? 'grid md:grid-cols-2' : '')}>
        {!preview && (
          <div className='space-y-1.5'>
            <Label htmlFor='club-rules' className='sr-only'>
              Rules
            </Label>
            <Textarea
              id='club-rules'
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              maxLength={4000}
              rows={16}
              placeholder={`# Club Rules\n\n1. Be respectful to all members\n2. Stay on topic\n3. No spam or self-promotion\n4. Follow university guidelines`}
              className='font-mono text-sm'
            />
            <p className='text-right text-[10px] text-muted-foreground'>
              {rules.length}/4000
            </p>
          </div>
        )}

        {preview && (
          <div className='rounded-lg border bg-muted/30 p-4'>
            {rules.trim() ? (
              <div className='prose prose-sm dark:prose-invert max-w-none'>
                {/* Simple markdown rendering — paragraphs + headers + lists */}
                {rules.split('\n').map((line, i) => {
                  const trimmed = line.trim()
                  if (trimmed.startsWith('# ')) {
                    return (
                      <h2 key={i} className='text-base font-semibold mt-3 mb-1'>
                        {trimmed.slice(2)}
                      </h2>
                    )
                  }
                  if (trimmed.startsWith('## ')) {
                    return (
                      <h3 key={i} className='text-sm font-semibold mt-2 mb-1'>
                        {trimmed.slice(3)}
                      </h3>
                    )
                  }
                  if (/^\d+\.\s/.test(trimmed)) {
                    return (
                      <p key={i} className='text-sm text-muted-foreground ml-2'>
                        {trimmed}
                      </p>
                    )
                  }
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return (
                      <p key={i} className='text-sm text-muted-foreground ml-2'>
                        {trimmed}
                      </p>
                    )
                  }
                  if (!trimmed) return <br key={i} />
                  return (
                    <p key={i} className='text-sm text-muted-foreground'>
                      {trimmed}
                    </p>
                  )
                })}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground italic'>
                No rules set yet. Write some rules for your club!
              </p>
            )}
          </div>
        )}
      </div>

      <div className='flex justify-end'>
        <Button
          onClick={handleSave}
          disabled={!isDirty || editMutation.isPending}
        >
          {editMutation.isPending ? (
            <>
              <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              Saving...
            </>
          ) : (
            'Save Rules'
          )}
        </Button>
      </div>
    </div>
  )
}
