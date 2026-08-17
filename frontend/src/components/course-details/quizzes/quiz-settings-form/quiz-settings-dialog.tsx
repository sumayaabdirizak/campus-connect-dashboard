'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Calendar, ClipboardCheck, FileText, Shuffle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { BasicsTab } from './basics-tab';
import { BehaviorTab } from './behavior-tab';
import {
  BLANK,
  fromQuiz,
  scheduleBadgeFor,
  toPayload,
  validateForm,
  type QuizSettingsTab
} from './form-state';
import { GradingTab } from './grading-tab';
import { MarksTab } from './marks-tab';
import { ScheduleTab } from './schedule-tab';
import type { QuizSettingsDialogProps } from './types';

export function QuizSettingsDialog({
  open,
  onOpenChange,
  editing,
  pending,
  modules = [],
  onSubmit
}: QuizSettingsDialogProps) {
  const [form, setForm] = useState(BLANK);
  const [tab, setTab] = useState<QuizSettingsTab>('basics');

  // Radix's onOpenChange only fires for its own internally-triggered
  // transitions (Escape, overlay click) — it does NOT fire when the parent
  // flips the controlled `open` prop externally, which is how every quiz
  // card's "Settings" menu item opens this dialog. Syncing form state from
  // `editing` has to happen on the `open` prop itself, not on that callback.
  useEffect(() => {
    if (open) {
      setForm(editing ? fromQuiz(editing) : BLANK);
      setTab('basics');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const handleSubmit = () => {
    const err = validateForm(form, editing);
    if (err) {
      toast.error(err);
      return;
    }
    const data = toPayload(form);
    if (editing) onSubmit({ mode: 'edit', quizId: editing.id, data });
    else onSubmit({ mode: 'create', data });
  };

  const scheduleBadge = scheduleBadgeFor(editing);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <DialogTitle>{editing ? 'Quiz settings' : 'New quiz'}</DialogTitle>
            {editing?.is_draft ? <Badge variant='secondary'>Draft</Badge> : null}
            {scheduleBadge ? (
              <Badge variant={scheduleBadge.tone}>{scheduleBadge.label}</Badge>
            ) : null}
          </div>
          <DialogDescription>
            {editing
              ? 'Change scheduling, behavior, or grading. Existing attempts are not re-graded.'
              : 'Configure how this quiz opens, behaves while taken, and scores.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as QuizSettingsTab)}
          className='mt-2'
        >
          <TabsList className='grid grid-cols-5 w-full'>
            <TabsTrigger value='basics' className='gap-1'>
              <FileText className='w-3.5 h-3.5' /> Basics
            </TabsTrigger>
            <TabsTrigger value='schedule' className='gap-1'>
              <Calendar className='w-3.5 h-3.5' /> Schedule
            </TabsTrigger>
            <TabsTrigger value='behavior' className='gap-1'>
              <Shuffle className='w-3.5 h-3.5' /> Behavior
            </TabsTrigger>
            <TabsTrigger value='grading' className='gap-1'>
              <Trophy className='w-3.5 h-3.5' /> Grading
            </TabsTrigger>
            <TabsTrigger value='marks' className='gap-1'>
              <ClipboardCheck className='w-3.5 h-3.5' /> Marks
            </TabsTrigger>
          </TabsList>

          <TabsContent value='basics'>
            <BasicsTab form={form} setForm={setForm} modules={modules} />
          </TabsContent>
          <TabsContent value='schedule'>
            <ScheduleTab form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value='behavior'>
            <BehaviorTab form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value='grading'>
            <GradingTab form={form} setForm={setForm} editing={editing} />
          </TabsContent>
          <TabsContent value='marks'>
            <MarksTab form={form} setForm={setForm} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Create quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
