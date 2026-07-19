'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X as XIcon } from 'lucide-react';

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
    <div className='space-y-3 rounded-3xl border bg-card p-4 shadow-sm'>
      <div className='flex items-center justify-between gap-2'>
        <Label>Feedback</Label>
        <button
          type='button'
          onClick={() => setTemplatesMenuOpen((v) => !v)}
          className='text-[11px] text-muted-foreground hover:text-foreground transition-colors'
        >
          {templatesMenuOpen ? 'Done' : 'Manage templates'}
        </button>
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        rows={4}
        placeholder='Comments to the student (used for all outcomes)…'
      />
      {templates.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {templates.map((t, i) => (
            <div
              key={`${t}-${i}`}
              className='group inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2.5 py-0.5 text-xs transition-colors hover:bg-muted/70'
            >
              <button
                type='button'
                onClick={() => insertTemplate(t)}
                className='max-w-[28ch] truncate'
                title={`Insert: "${t}"`}
              >
                {t}
              </button>
              {templatesMenuOpen ? (
                <button
                  type='button'
                  onClick={() => persistTemplates(templates.filter((_, j) => j !== i))}
                  aria-label={`Remove template "${t}"`}
                  className='text-muted-foreground hover:text-destructive pr-1.5'
                >
                  <XIcon className='w-3 h-3' />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {templatesMenuOpen ? (
        <div className='flex items-center gap-2 pt-1'>
          <Input
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
            placeholder='Save a new template…'
            className='h-8 text-xs'
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
            onClick={() => {
              if (!newTemplate.trim()) return;
              persistTemplates([...templates, newTemplate.trim()]);
              setNewTemplate('');
            }}
          >
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
