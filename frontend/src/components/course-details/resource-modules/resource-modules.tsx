'use client';

import { useMemo } from 'react';
import type { Resource } from '@/lib/course-details/types';
import { ModuleBucket } from './module-bucket';
import { ModuleList } from './module-list';
import type { ResourceModulesProps } from './types';
import { UngroupedBucket } from './ungrouped-bucket';

export function ResourceModules({
  modules,
  resources,
  isStudent,
  onAddToModule,
  onEditModule,
  onDeleteModule,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderModules,
  onReorderResources
}: ResourceModulesProps) {
  const byModule = useMemo(() => {
    const groups = new Map<number | 'none', Resource[]>();
    for (const r of resources) {
      const key: number | 'none' = r.moduleId ?? 'none';
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return groups;
  }, [resources]);

  const ungrouped = byModule.get('none') ?? [];
  const showUngrouped = !isStudent || ungrouped.length > 0;

  return (
    <div className='space-y-4'>
      <ModuleList
        modules={modules}
        isStudent={isStudent}
        onReorder={onReorderModules}
        renderModule={(mod) => (
          <ModuleBucket
            key={mod.id}
            module={mod}
            resources={byModule.get(mod.id) ?? []}
            isStudent={isStudent}
            onAdd={() => onAddToModule?.(mod.id)}
            onEdit={() => onEditModule?.(mod)}
            onDelete={() => onDeleteModule?.(mod.id)}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
            onAnalytics={onAnalytics}
            onReorderResources={onReorderResources}
          />
        )}
      />

      {showUngrouped ? (
        <UngroupedBucket
          resources={ungrouped}
          isStudent={isStudent}
          onAdd={() => onAddToModule?.(null)}
          onEditResource={onEditResource}
          onDeleteResource={onDeleteResource}
          onAnalytics={onAnalytics}
          onReorderResources={onReorderResources}
        />
      ) : null}
    </div>
  );
}
