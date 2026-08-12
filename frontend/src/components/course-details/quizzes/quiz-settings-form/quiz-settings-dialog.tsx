'use client';

import { useState } from 'react';
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
import { Calendar, FileText, Shuffle, Trophy } from 'lucide-react';
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

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(editing ? fromQuiz(editing) : BLANK);
      setTab('basics');
    }
    onOpenChange(next);
  };

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <TabsList className='grid grid-cols-4 w-full'>
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
