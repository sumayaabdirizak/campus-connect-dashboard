import { queryOptions } from '@/lib/async-query';
import {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource
} from './resources-service';
import { ResourceFilters } from './resources-types';

export const resourceKeys = {
  all: ['resources'] as const,
  list: (courseId: string, filters?: ResourceFilters) =>
    [...resourceKeys.all, 'list', courseId, filters] as const,
  detail: (resourceId: string) => [...resourceKeys.all, 'detail', resourceId] as const
};

export const resourcesQueryOptions = (courseId: string, filters?: ResourceFilters) =>
  queryOptions({
    queryKey: resourceKeys.list(courseId, filters),
    queryFn: () => getResources(courseId, filters)
  });

export const resourceDetailQueryOptions = (resourceId: string) =>
  queryOptions({
    queryKey: resourceKeys.detail(resourceId),
    queryFn: () => getResource(resourceId)
  });

export { createResource, updateResource, deleteResource };
