import { ANNOUNCEMENT_LIKE_EMOJI } from "../../dto/announcementDto.js";
export {
  CREATE_ANNOUNCEMENT_ROLES,
  ANNOUNCEMENT_MANAGER_ROLES,
  canManageAnnouncements,
} from "../../../../../../shared/roles.js";

export const announcementEngagementCountInclude = {
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      reactions: { where: { emoji: ANNOUNCEMENT_LIKE_EMOJI } },
    },
  },
};

export const DEAN_SCOPE_FORBIDDEN = "Dean can only manage their faculty";
export const MAX_PINNED_PER_CREATOR = 2;

export const ANNOUNCEMENT_TARGET_ROLE_OPTIONS = new Set([
  "SUPER_ADMIN",
  "ACADEMIC_OFFICE",
  "ADMIN",
  "DEAN",
  "LECTURER",
  "TEACHER",
  "STUDENT",
  "OFFICE_STAFF",
]);

export const DEAN_ALLOWED_TARGET_ROLES = new Set(["STUDENT", "TEACHER", "LECTURER"]);
