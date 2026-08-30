'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X as XIcon } from 'lucide-react';
import { GradingDrawerSection } from './grading-drawer-section';
import { gradingBlue } from './grading-drawer-blue';
import { cn } from '@/lib/utils';

export function FeedbackTemplatesPanel({
  feedback,
  onFeedbackChange,
  templates,
  templatesMenuOpen,
  setTemplatesMenuOpen,
  newTemplate,
  setNewTemplate,
  persistTemplates,
  insertTemplate
}: {
  feedback: string;
  onFeedbackChange: (v: string) => void;
  templates: string[];
  templatesMenuOpen: boolean;
  setTemplatesMenuOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
  newTemplate: string;
  setNewTemplate: (v: string) => void;
  persistTemplates: (next: string[]) => void;
  insertTemplate: (text: string) => void;
}) {
  return (
    <GradingDrawerSection
      title='Note for student'
      hint='Optional — they will see this with their grade.'
    >
      <div className='space-y-3'>
        {templates.length > 0 ? (
          <div className='flex justify-end'>
            <button
              type='button'
              onClick={() => setTemplatesMenuOpen((v) => !v)}
              className={cn('text-xs font-medium', gradingBlue.textLink)}
            >
              {templatesMenuOpen ? 'Done editing phrases' : 'Manage quick phrases'}
            </button>
          </div>
        ) : null}

        <Textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={3}
          placeholder='e.g. Good work — check question 3 for more detail.'
          className={cn(
            'min-h-[88px] resize-none rounded-lg border-border bg-background text-sm',
            gradingBlue.focusRing
          )}
        />

        {templates.length > 0 ? (
          <div className='flex flex-wrap gap-1.5'>
            {templates.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className={cn(
                  'inline-flex items-center overflow-hidden rounded-full border text-xs',
                  gradingBlue.phrasePill
                )}
              >
                <button
                  type='button'
                  onClick={() => insertTemplate(t)}
                  className={cn('px-2.5 py-1', gradingBlue.phrasePillHover)}
                >
                  {t.length > 36 ? `${t.slice(0, 36)}…` : t}
                </button>
                {templatesMenuOpen ? (
                  <button
                    type='button'
                    onClick={() => persistTemplates(templates.filter((_, j) => j !== i))}
                    className='border-l border-blue-100 px-1.5 py-1 text-blue-500/80 hover:bg-destructive/10 hover:text-destructive'
                    aria-label='Remove phrase'
                  >
                    <XIcon className='size-3' />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        {templatesMenuOpen ? (
          <div className='flex gap-2'>
            <Input
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              placeholder='Add a new quick phrase…'
              className='h-9 rounded-lg text-sm'
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTemplate.trim()) {
                  e.preventDefault();
                  persistTemplates([...templates, newTemplate.trim()]);
                  setNewTemplate('');
                }
              }}
            />
            <Button
              size='sm'
              variant='outline'
              className={cn('h-9 shrink-0', gradingBlue.outlineBtn)}
              onClick={() => {
                if (!newTemplate.trim()) return;
                persistTemplates([...templates, newTemplate.trim()]);
                setNewTemplate('');
              }}
            >
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </GradingDrawerSection>
  );
}
