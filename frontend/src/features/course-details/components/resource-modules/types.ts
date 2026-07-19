import type { CourseModule, Resource } from '../../api/resources-types';

export type ReorderResourcesFn = (
  items: { id: number; moduleId: number | null; position: number }[]
) => void;

export interface ResourceModulesProps {
  modules: CourseModule[];
  resources: Resource[];
  isStudent?: boolean;
  onAddToModule?: (moduleId: number | null) => void;
  onEditModule?: (module: CourseModule) => void;
  onDeleteModule?: (moduleId: number) => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderModules?: (orderedIds: number[]) => void;
  onReorderResources?: ReorderResourcesFn;
}
