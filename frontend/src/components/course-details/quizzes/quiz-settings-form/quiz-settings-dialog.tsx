'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Calendar, ClipboardCheck, FileText, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { BasicsTab } from './basics-tab';
import { BehaviorTab } from './behavior-tab';
import {
  BLANK,
  fromQuiz,
  toPayload,
  validateForm,
  type QuizSettingsTab
} from './form-state';
import { MarksTab } from './marks-tab';
import { ScheduleTab } from './schedule-tab';
import type { QuizSettingsDialogProps } from './types';
import {
  duplicateQuizTitleMessage,
  isDuplicateCourseTitle
} from '@/lib/course-details/validate-unique-title';

export function QuizSettingsDialog({
  open,
  onOpenChange,
  editing,
  pending,
  existingQuizzes = [],
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
    if (isDuplicateCourseTitle(form.title, existingQuizzes, editing?.id)) {
      toast.error(duplicateQuizTitleMessage(form.title));
      return;
    }
    const data = toPayload(form);
    if (editing) onSubmit({ mode: 'edit', quizId: editing.id, data });
    else onSubmit({ mode: 'create', data });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Quiz settings' : 'New quiz'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the name, time, or how the quiz works.'
              : 'Give it a name and set when students can take it.'}
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
              <Shuffle className='w-3.5 h-3.5' /> Timing
            </TabsTrigger>
            <TabsTrigger value='marks' className='gap-1'>
              <ClipboardCheck className='w-3.5 h-3.5' /> Marking
            </TabsTrigger>
          </TabsList>

          <TabsContent value='basics'>
            <BasicsTab form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value='schedule'>
            <ScheduleTab form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value='behavior'>
            <BehaviorTab form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value='marks'>
            <MarksTab form={form} setForm={setForm} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' className='h-11 rounded-xl' onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            className='h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90'
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? 'Saving…' : editing ? 'Save' : 'Create quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
