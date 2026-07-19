'use client';

import { toast } from 'sonner';
import type {
  GeneratedQuestion,
  GenerateQuestionsInput
} from '../../api/question-bank-types';
import type { CreateQuizInput, Quiz, QuizQuestionType } from '../../api/quizzes-types';
import {
  AI_SOURCE_MAX_CHARS,
  clampSourceMaterial,
  extractSourceTextFromFile
} from '../_shared/extract-source-text';
import { chosenToBankImport, chosenToQuizInput } from './map-chosen';
import type { Destination, Difficulty } from './types';

type MutateFn<TData, TVars> = {
  mutate: (
    vars: TVars,
    opts?: {
      onSuccess?: (data: TData) => void;
      onError?: (e: Error) => void;
    }
  ) => void;
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

export function saveGeneratedQuestions(opts: {
  generated: GeneratedQuestion[];
  keepSet: Set<number>;
  quizTitle: string;
  destination: Destination;
  createQuizMutation: MutateFn<Quiz, CreateQuizInput>;
  importMutation: MutateFn<{ imported: number }, ReturnType<typeof chosenToBankImport>>;
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
  opts.importMutation.mutate(chosenToBankImport(chosen), {
    onSuccess: (res) => {
      toast.success(
        `Added ${res.imported} question${res.imported === 1 ? '' : 's'} to bank`
      );
      if (opts.destination.kind === 'quiz') {
        toast.message('Open "Add from Bank" to attach them to the quiz', {
          duration: 6000
        });
      }
      opts.closeHandler(false);
    },
    onError: (e: Error) => toast.error(e.message)
  });
}
