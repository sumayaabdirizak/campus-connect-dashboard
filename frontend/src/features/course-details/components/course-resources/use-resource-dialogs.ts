'use client';

import { useState } from 'react';
import type { CourseModule, Resource } from '../../api/resources-types';

export function useResourceDialogs() {
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [defaultModuleId, setDefaultModuleId] = useState<number | null>(null);

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

  const [deleteResourceId, setDeleteResourceId] = useState<number | null>(null);
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null);

  const [analyticsResource, setAnalyticsResource] = useState<Resource | null>(null);

  const openCreateResource = (moduleId: number | null) => {
    setEditingResource(null);
    setDefaultModuleId(moduleId);
    setResourceDialogOpen(true);
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setDefaultModuleId(null);
    setResourceDialogOpen(true);
  };

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleDialogOpen(true);
  };

  const openEditModule = (module: CourseModule) => {
    setEditingModule(module);
    setModuleDialogOpen(true);
  };

  return {
    resourceDialogOpen,
    setResourceDialogOpen,
    editingResource,
    setEditingResource,
    defaultModuleId,
    moduleDialogOpen,
    setModuleDialogOpen,
    editingModule,
    setEditingModule,
    deleteResourceId,
    setDeleteResourceId,
    deleteModuleId,
    setDeleteModuleId,
    analyticsResource,
    setAnalyticsResource,
    openCreateResource,
    openEditResource,
    openCreateModule,
    openEditModule,
  };
}
