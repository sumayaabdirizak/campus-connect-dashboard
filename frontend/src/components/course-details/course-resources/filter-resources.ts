import type { CourseModule, Resource } from '@/lib/course-details/types';
import type { ResourceTypeFilter } from './constants';

export function visibleModulesForViewer(
  modules: CourseModule[],
  isStudent: boolean
): CourseModule[] {
  return isStudent ? modules.filter((m) => !!m.publishedAt) : modules;
}

export function filterResources(opts: {
  resources: Resource[];
  modules: CourseModule[];
  typeFilter: ResourceTypeFilter;
  search: string;
  isStudent: boolean;
}): Resource[] {
  const { resources, modules, typeFilter, search, isStudent } = opts;
  const q = search.toLowerCase();

  return resources.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search && !r.title.toLowerCase().includes(q)) return false;
    if (isStudent && (r.is_draft || r.status !== 'APPROVED')) return false;
    if (isStudent && r.moduleId != null) {
      const mod = modules.find((m) => m.id === r.moduleId);
      if (mod && !mod.publishedAt) return false;
    }
    return true;
  });
}
