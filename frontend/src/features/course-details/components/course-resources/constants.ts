import type { ResourceType } from '../../api/resources-types';

export const RESOURCE_TYPES: ResourceType[] = [
  'SYLLABUS',
  'ASSIGNMENT',
  'LECTURE_NOTE',
  'VIDEO',
  'EXTERNAL_LINK',
  'OTHER',
];

export type ResourceTypeFilter = 'all' | ResourceType;
