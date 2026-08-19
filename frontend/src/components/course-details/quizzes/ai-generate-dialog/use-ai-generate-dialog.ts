'use client';

import { useState } from 'react';
import { useGenerateQuestions } from '@/lib/course-details/queries/question-bank-queries';
import { useCreateQuestion, useCreateQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { GeneratedQuestion } from '@/lib/course-details/types';
import type { Quiz, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { DraftQuestion } from '../quiz-builder/types';
import {
  loadSourceFile,
  runGenerateQuestions,
  saveGeneratedQuestions
} from './ai-generate-actions';
import type { Destination } from './types';

export function useAiGenerateDialog(opts: {
  courseOfferingId: string;
  destination: Destination;
  onOpenChange: (open: boolean) => void;
  onQuizCreated?: (quiz: Quiz) => void;
  onLocalAdd?: (questions: DraftQuestion[]) => void;
  lockedQuestionTypes?: QuizQuestionType[];
}) {
  const {
    courseOfferingId,
    destination,
    onOpenChange,
    onQuizCreated,
    onLocalAdd,
    lockedQuestionTypes
  } = opts;
  const isNewQuiz = destination.kind === 'new-quiz';
  const defaultTypes = lockedQuestionTypes ?? ['MCQ'];

  const generateMutation = useGenerateQuestions(courseOfferingId);
  const createQuizMutation = useCreateQuiz(courseOfferingId);
  const createQuestionMutation = useCreateQuestion(
    courseOfferingId,
    destination.kind === 'quiz' ? destination.quizId : 0
  );

  const [phase, setPhase] = useState<'config' | 'preview'>('config');
  const [quizTitle, setQuizTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isExtractingSource, setIsExtractingSource] = useState(false);
  const [count, setCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>(defaultTypes);
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [keepSet, setKeepSet] = useState<Set<number>>(new Set());

  const closeHandler = (next: boolean) => {
    if (!next) {
      setPhase('config');
      setQuizTitle('');
      setPrompt('');
      setSourceMaterial('');
      setSourceFileName(null);
      setIsExtractingSource(false);
      setCount(10);
      setQuestionTypes(defaultTypes);
      setGenerated([]);
      setKeepSet(new Set());
    }
    onOpenChange(next);
  };

  const toggleType = (t: QuizQuestionType) => {
    if (lockedQuestionTypes) return;
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSourceFile = (file: File | undefined) => {
    if (!file) return;
    void loadSourceFile(file, sourceMaterial, {
      setIsExtractingSource,
      setSourceMaterial,
      setSourceFileName
    });
  };

  const handleGenerate = () =>
    runGenerateQuestions({
      isNewQuiz,
      quizTitle,
      prompt,
      sourceMaterial,
      count,
      questionTypes,
      generateMutation,
      onPreview: (questions) => {
        setGenerated(questions);
        setKeepSet(new Set(questions.map((_, i) => i)));
        setPhase('preview');
      }
    });

  const toggleKeep = (idx: number) => {
    setKeepSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (keepSet.size === generated.length) setKeepSet(new Set());
    else setKeepSet(new Set(generated.map((_, i) => i)));
  };

  const handleSave = () =>
    saveGeneratedQuestions({
      generated,
      keepSet,
      quizTitle,
      destination,
      createQuizMutation,
      createQuestionMutation,
      onQuizCreated,
      onLocalAdd,
      closeHandler
    });

  return {
    isNewQuiz,
    phase,
    setPhase,
    quizTitle,
    setQuizTitle,
    prompt,
    setPrompt,
    sourceMaterial,
    setSourceMaterial,
    sourceFileName,
    setSourceFileName,
    isExtractingSource,
    count,
    setCount,
    questionTypes,
    lockedQuestionTypes,
    generated,
    keepSet,
    closeHandler,
    toggleType,
    handleSourceFile,
    handleGenerate,
    toggleKeep,
    toggleAll,
    handleSave,
    isGenerating: generateMutation.isPending,
    isSaving: createQuestionMutation.isPending || createQuizMutation.isPending
  };
}
