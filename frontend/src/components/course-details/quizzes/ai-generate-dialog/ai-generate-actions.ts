'use client';

import { toast } from 'sonner';
import type { MutateCallbacks } from '@/lib/async-query';
import type {
  GeneratedQuestion,
  GenerateQuestionsInput
} from '@/lib/course-details/types';
import type {
  CreateQuestionInput,
  CreateQuizInput,
  Quiz,
  QuizQuestion,
  QuizQuestionType
} from '@/lib/course-details/services/quizzes-types';
import {
  AI_SOURCE_MAX_CHARS,
  clampSourceMaterial,
  extractSourceTextFromFile
} from '../../_shared/extract-source-text';
import { chosenToQuestionInputs, chosenToQuizInput } from './map-chosen';
import type { Destination, Difficulty } from './types';

type MutateFn<TData, TVars> = {
  mutate: (vars: TVars, opts?: MutateCallbacks<TData, TVars>) => void;
};

type MutateAsyncFn<TData, TVars> = {
  mutateAsync: (vars: TVars, opts?: MutateCallbacks<TData, TVars>) => Promise<TData>;
};

export async function loadSourceFile(
  file: File,
  currentSource: string,
  setters: {
    setIsExtractingSource: (v: boolean) => void;
    setSourceMaterial: (v: string) => void;
    setSourceFileName: (v: string | null) => void;
  }
) {
  setters.setIsExtractingSource(true);
  try {
    const extracted = await extractSourceTextFromFile(file);
    if (!extracted.trim()) {
      toast.error('No readable text found in that file');
      return;
    }
    const header = `--- ${file.name} ---`;
    const merged = currentSource.trim()
      ? `${currentSource.trim()}\n\n${header}\n\n${extracted.trim()}`
      : `${header}\n\n${extracted.trim()}`;
    const clamped = clampSourceMaterial(merged);
    if (clamped.length < merged.length) {
      toast.warning(
        `Source text was trimmed to ${AI_SOURCE_MAX_CHARS.toLocaleString()} characters`
      );
    }
    setters.setSourceMaterial(clamped);
    setters.setSourceFileName(file.name);
    toast.success(`Loaded text from ${file.name}`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not read that file');
  } finally {
    setters.setIsExtractingSource(false);
  }
}

export function runGenerateQuestions(opts: {
  isNewQuiz: boolean;
  quizTitle: string;
  prompt: string;
  sourceMaterial: string;
  count: number;
  questionTypes: QuizQuestionType[];
  difficulty: Difficulty;
  generateMutation: MutateFn<{ questions: GeneratedQuestion[] }, GenerateQuestionsInput>;
  onPreview: (questions: GeneratedQuestion[]) => void;
}) {
  if (opts.isNewQuiz && !opts.quizTitle.trim()) {
    toast.error('Give the quiz a title first');
    return;
  }
  if (!opts.prompt.trim()) {
    toast.error('Describe what you want — even a sentence helps');
    return;
  }
  opts.generateMutation.mutate(
    {
      prompt: opts.prompt.trim(),
      sourceMaterial: opts.sourceMaterial.trim() || undefined,
      count: opts.count,
      questionTypes: opts.questionTypes,
      difficulty: opts.difficulty
    },
    {
      onSuccess: (res) => {
        if (!res.questions || res.questions.length === 0) {
          toast.error('No questions returned — try a more specific prompt');
          return;
        }
        opts.onPreview(res.questions);
      },
      onError: (e: Error) => toast.error(e.message)
    }
  );
}

export async function saveGeneratedQuestions(opts: {
  generated: GeneratedQuestion[];
  keepSet: Set<number>;
  quizTitle: string;
  destination: Destination;
  createQuizMutation: MutateFn<Quiz, CreateQuizInput>;
  createQuestionMutation: MutateAsyncFn<QuizQuestion, CreateQuestionInput>;
  onQuizCreated?: (quiz: Quiz) => void;
  closeHandler: (next: boolean) => void;
}) {
  const chosen = opts.generated.filter((_, i) => opts.keepSet.has(i));
  if (chosen.length === 0) {
    toast.error('Select at least one question to save');
    return;
  }
  if (opts.destination.kind === 'new-quiz') {
    const title = opts.quizTitle.trim();
    if (!title) {
      toast.error('Give the quiz a title before saving');
      return;
    }
    opts.createQuizMutation.mutate(chosenToQuizInput(title, chosen), {
      onSuccess: (quiz) => {
        toast.success(
          `Created "${quiz.title}" with ${chosen.length} question${chosen.length === 1 ? '' : 's'} — review & publish when ready`
        );
        opts.onQuizCreated?.(quiz);
        opts.closeHandler(false);
      },
      onError: (e: Error) => toast.error(e.message)
    });
    return;
  }
  // Straight into the quiz's question list — one create call per kept
  // question, sequential so order_index assignment on the backend can't race.
  try {
    for (const input of chosenToQuestionInputs(chosen)) {
      await opts.createQuestionMutation.mutateAsync(input);
    }
    toast.success(
      `Added ${chosen.length} question${chosen.length === 1 ? '' : 's'} to the quiz`
    );
    opts.closeHandler(false);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not save one of the questions');
  }
}
