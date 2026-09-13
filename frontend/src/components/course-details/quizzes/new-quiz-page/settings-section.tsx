'use client';

import { quizFormCardClass, quizFormLabelClass } from './field-styles';

export function SettingsSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={quizFormCardClass}>
      <div className='mb-4'>
        <h2 className='text-base font-semibold text-foreground'>{title}</h2>
        {description ? (
          <p className={`mt-1 ${quizFormLabelClass}`}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
