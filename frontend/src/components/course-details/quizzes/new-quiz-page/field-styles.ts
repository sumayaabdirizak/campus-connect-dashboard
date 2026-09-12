/** Soft elevated surfaces — white, light border, gentle shadow (create-quiz). */
const softSurface =
  'border border-gray-200/90 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-card dark:shadow-none';

/** Create-quiz controls using theme primary (`--primary` / Campus Connect blue). */
export const quizFormFieldClass =
  `h-11 rounded-full ${softSurface} px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20`;

export const quizFormTextareaClass =
  `min-h-[5.5rem] rounded-3xl ${softSurface} px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20`;

export const quizFormSelectClass =
  `h-11 w-full rounded-full ${softSurface} px-4 text-sm text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20`;

export const quizFormLabelClass = 'text-sm font-medium text-foreground';

export const quizFormCardClass =
  `rounded-3xl ${softSurface} p-5 sm:p-6`;

export const quizFormSwitchRowClass =
  `flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-full ${softSurface} px-4 py-2.5 text-sm text-foreground`;

export const quizFormHintClass = 'text-sm text-muted-foreground';

export const quizFormPrimaryBtnClass =
  'h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_2px_10px_rgba(59,130,246,0.28)] hover:bg-primary/90';

export const quizFormOutlineBtnClass =
  `h-11 rounded-full ${softSurface} px-5 text-sm font-medium text-primary hover:border-primary/30 hover:bg-secondary`;

export const quizFormIconBtnClass =
  `size-9 shrink-0 rounded-full ${softSurface} text-primary hover:border-primary/30 hover:bg-secondary`;

export const quizFormRowClass =
  `rounded-full ${softSurface} px-4 py-2.5 text-sm text-foreground`;

export const quizFormCheckboxClass =
  'size-[18px] rounded-[5px] border border-gray-300 bg-white shadow-sm data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:border-white/15 dark:bg-card';

export const quizFormSwitchClass =
  'h-5 w-9 border border-gray-300 shadow-sm data-[state=unchecked]:border-gray-300 data-[state=unchecked]:bg-gray-100 data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:border-white/15 dark:data-[state=unchecked]:border-white/15 dark:data-[state=unchecked]:bg-white/10';
