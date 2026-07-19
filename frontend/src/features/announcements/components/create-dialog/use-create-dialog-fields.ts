'use client';

import { useState } from 'react';
import type { AnnouncementPriority, AnnouncementTargetType } from '../../api/types';
import type { ActiveDaysPreset, ImageFile } from './types';

export function useCreateDialogFields(isDean: boolean) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepLive, setStepLive] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>(
    isDean ? 'DEPARTMENT' : 'ALL',
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [includeStudents, setIncludeStudents] = useState(true);
  const [includeTeachers, setIncludeTeachers] = useState(true);
  const [activeDaysPreset, setActiveDaysPreset] = useState<ActiveDaysPreset>('off');
  const [expiresAtCustom, setExpiresAtCustom] = useState('');
  const [deadlineAtLocal, setDeadlineAtLocal] = useState('');
  const [notifySms, setNotifySms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);

  return {
    step,
    setStep,
    stepLive,
    setStepLive,
    title,
    setTitle,
    content,
    setContent,
    targetType,
    setTargetType,
    selectedDepartments,
    setSelectedDepartments,
    selectedBatches,
    setSelectedBatches,
    selectedSections,
    setSelectedSections,
    priority,
    setPriority,
    includeStudents,
    setIncludeStudents,
    includeTeachers,
    setIncludeTeachers,
    activeDaysPreset,
    setActiveDaysPreset,
    expiresAtCustom,
    setExpiresAtCustom,
    deadlineAtLocal,
    setDeadlineAtLocal,
    notifySms,
    setNotifySms,
    formError,
    setFormError,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    images,
    setImages,
  };
}
