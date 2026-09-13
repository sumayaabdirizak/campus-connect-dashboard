'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGenerateQuestions } from '@/lib/course-details/queries/question-bank-queries';
import { useCreateQuestion, useCreateQuiz } from '@/lib/course-details/queries/quizzes-queries';
import type { GeneratedQuestion } from '@/lib/course-details/types';
import type { Quiz, QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { DraftQuestion } from '../quiz-builder/types';
import type { QuizDeliveryMode } from '../quiz-question-types';
import { questionTypesForMode } from '../quiz-question-types';
import {
  loadSourceFile,
  runGenerateBySections,
  runGenerateQuestions,
  saveGeneratedQuestions
} from './ai-generate-actions';
import {
  defaultCountForSection,
  type AiSectionPlanItem
} from './section-plan';
import type { Destination } from './types';

export function useAiGenerateDialog(opts: {
  courseOfferingId: string;
  destination: Destination;
  onOpenChange: (open: boolean) => void;
  onQuizCreated?: (quiz: Quiz) => void;
  onLocalAdd?: (questions: DraftQuestion[]) => void;
  lockedQuestionTypes?: QuizQuestionType[];
  /** When set (create-quiz marks plan), AI fills these sections by count. */
  sectionPlan?: AiSectionPlanItem[];
  quizMode?: QuizDeliveryMode;
}) {
  const {
    courseOfferingId,
    destination,
    onOpenChange,
    onQuizCreated,
    onLocalAdd,
    lockedQuestionTypes,
    sectionPlan,
    quizMode = 'online'
  } = opts;
  const isNewQuiz = destination.kind === 'new-quiz';
  const sectioned = (sectionPlan?.length ?? 0) > 0;
  const allowedTypes = questionTypesForMode(quizMode);
  const defaultTypes =
    lockedQuestionTypes?.filter((t) => allowedTypes.includes(t)) ??
    (allowedTypes.includes('MCQ') ? ['MCQ'] : [allowedTypes[0]]);

  const generateMutation = useGenerateQuestions(courseOfferingId);
  const createQuizMutation = useCreateQuiz(courseOfferingId);
  const createQuestionMutation = useCreateQuestion(
    courseOfferingId,
    destination.kind === 'quiz' ? destination.quizId : 0
  );

  const initialSectionCounts = useMemo(() => {
    const next: Partial<Record<QuizQuestionType, number>> = {};
    for (const s of sectionPlan ?? []) {
      next[s.type] = defaultCountForSection(s.remainingMarks);
    }
    return next;
  }, [sectionPlan]);

  const [phase, setPhase] = useState<'config' | 'preview'>('config');
  const [quizTitle, setQuizTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isExtractingSource, setIsExtractingSource] = useState(false);
  const [isSectionGenerating, setIsSectionGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [sectionCounts, setSectionCounts] =
    useState<Partial<Record<QuizQuestionType, number>>>(() => initialSectionCounts);
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>(defaultTypes);
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [keepSet, setKeepSet] = useState<Set<number>>(new Set());

  // Reseed counts when marks remaining / section list changes.
  const sectionPlanKey = (sectionPlan ?? [])
    .map((s) => `${s.type}:${s.remainingMarks}`)
    .join('|');
  useEffect(() => {
    setSectionCounts(initialSectionCounts);
  }, [sectionPlanKey, initialSectionCounts]);

  const totalSectionCount = (sectionPlan ?? []).reduce(
    (sum, s) => sum + (sectionCounts[s.type] ?? 0),
    0
  );

  const closeHandler = (next: boolean) => {
    if (!next) {
      setPhase('config');
      setQuizTitle('');
      setPrompt('');
      setSourceMaterial('');
      setSourceFileName(null);
      setIsExtractingSource(false);
      setIsSectionGenerating(false);
      setCount(10);
      setSectionCounts(initialSectionCounts);
      setQuestionTypes(defaultTypes);
      setGenerated([]);
      setKeepSet(new Set());
    }
    onOpenChange(next);
  };

  const toggleType = (t: QuizQuestionType) => {
    if (lockedQuestionTypes || sectioned || !allowedTypes.includes(t)) return;
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const setSectionCount = (type: QuizQuestionType, next: number) => {
    setSectionCounts((prev) => ({ ...prev, [type]: next }));
  };

  const handleSourceFile = (file: File | undefined) => {
    if (!file) return;
    void loadSourceFile(file, sourceMaterial, {
      setIsExtractingSource,
      setSourceMaterial,
      setSourceFileName
    });
  };

  const onPreview = (questions: GeneratedQuestion[]) => {
    setGenerated(questions);
    setKeepSet(new Set(questions.map((_, i) => i)));
    setPhase('preview');
  };

  const handleGenerate = () => {
    if (sectioned && sectionPlan) {
      void runGenerateBySections({
        isNewQuiz,
        quizTitle,
        prompt,
        sourceMaterial,
        sections: sectionPlan.map((s) => ({
          type: s.type,
          count: sectionCounts[s.type] ?? 0,
          remainingMarks: s.remainingMarks
        })),
        generateMutation,
        onPreview,
        setGenerating: setIsSectionGenerating
      });
      return;
    }
    runGenerateQuestions({
      isNewQuiz,
      quizTitle,
      prompt,
      sourceMaterial,
      count,
      questionTypes,
      generateMutation,
      onPreview
    });
  };

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
    sectionPlan,
    sectionCounts,
    setSectionCount,
    totalSectionCount,
    questionTypes,
    lockedQuestionTypes,
    quizMode,
    generated,
    keepSet,
    closeHandler,
    toggleType,
    handleSourceFile,
    handleGenerate,
    toggleKeep,
    toggleAll,
    handleSave,
    isGenerating: generateMutation.isPending || isSectionGenerating,
    isSaving: createQuestionMutation.isPending || createQuizMutation.isPending
  };
}
