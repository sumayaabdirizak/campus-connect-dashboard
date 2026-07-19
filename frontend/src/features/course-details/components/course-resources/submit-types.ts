import type {
  CreateModuleData,
  CreateResourceData,
  UpdateModuleData,
  UpdateResourceData,
} from '../../api/resources-types';

export type ResourceSubmitPayload =
  | { mode: 'create'; data: Omit<CreateResourceData, 'teacherId'> & { is_draft?: boolean } }
  | { mode: 'edit'; resourceId: number; data: UpdateResourceData };

export type ModuleSubmitPayload =
  | { mode: 'create'; data: CreateModuleData }
  | { mode: 'edit'; moduleId: number; data: UpdateModuleData };
