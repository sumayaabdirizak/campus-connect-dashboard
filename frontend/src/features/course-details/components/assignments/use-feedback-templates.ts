'use client';

import { useEffect, useState } from 'react';

const DEFAULT_TEMPLATES = [
  'Great work! Clear and well-reasoned.',
  'Good effort — please cite sources next time.',
  'See feedback inline; revise and resubmit.',
  'Missing the required components.',
];

export function useFeedbackTemplates(courseId: string) {
  const storageKey = `cc.assign.fb-templates.${courseId}`;
  const [templates, setTemplates] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
          setTemplates(parsed);
          return;
        }
      }
      setTemplates(DEFAULT_TEMPLATES);
      window.localStorage.setItem(storageKey, JSON.stringify(DEFAULT_TEMPLATES));
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, [storageKey]);

  const persistTemplates = (next: string[]) => {
    setTemplates(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  return {
    templates,
    newTemplate,
    setNewTemplate,
    templatesMenuOpen,
    setTemplatesMenuOpen,
    persistTemplates,
  };
}
