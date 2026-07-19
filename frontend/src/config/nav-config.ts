import {
  accountNavGroup,
  adminNavGroups,
  communicationNavGroup,
  deanReportsNavGroup,
  deanSetupNavGroup,
  overviewNavGroup,
  studentPortalNavGroup,
  teacherPortalNavGroup,
  universityStructureNavGroup,
} from './nav-groups';
import type { NavGroup } from '@/types';

/** Campus Connect navigation configuration with RBAC support. */
export const navGroups: NavGroup[] = [
  overviewNavGroup,
  deanSetupNavGroup,
  universityStructureNavGroup,
  ...adminNavGroups,
  teacherPortalNavGroup,
  studentPortalNavGroup,
  communicationNavGroup,
  deanReportsNavGroup,
  accountNavGroup,
];
