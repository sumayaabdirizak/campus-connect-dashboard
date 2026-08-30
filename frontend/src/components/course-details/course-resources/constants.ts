import type { ResourceType } from '@/lib/course-details/types';

/** Active resource types teachers can add — matches `typeSelectOptions`. */
export const RESOURCE_TYPES: ResourceType[] = [
  'LECTURE_NOTE',
  'VIDEO',
  'AUDIO',
  'EXTERNAL_LINK'
];

export type ResourceTypeFilter = 'all' | ResourceType;
