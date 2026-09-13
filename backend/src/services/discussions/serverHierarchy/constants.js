import { PERMISSION_BITS } from "../permissions/constants.js";

const B = PERMISSION_BITS;

export const MEMBER_ALLOW_MASK =
  B.VIEW_CHANNEL |
  B.READ_MESSAGE_HISTORY |
  B.SEND_MESSAGES |
  B.ATTACH_FILES |
  B.EMBED_LINKS |
  B.ADD_REACTIONS |
  B.USE_EXTERNAL_EMOJI |
  B.CREATE_THREADS |
  B.SEND_MESSAGES_IN_THREADS;

export const STAFF_BONUS_MASK =
  B.MANAGE_MESSAGES | B.MANAGE_THREADS | B.PIN_MESSAGES | B.MENTION_EVERYONE;

export const CATEGORY_KEYS = Object.freeze({
  GENERAL: "GENERAL",
  DEPARTMENTS: "DEPARTMENTS",
  BATCHES: "BATCHES",
  SECTIONS: "SECTIONS",
});

export const DEFAULT_CATEGORIES = [
  { systemKey: CATEGORY_KEYS.GENERAL, name: "General", position: 0 },
  { systemKey: CATEGORY_KEYS.DEPARTMENTS, name: "Departments", position: 1 },
  { systemKey: CATEGORY_KEYS.BATCHES, name: "Batches", position: 2 },
  { systemKey: CATEGORY_KEYS.SECTIONS, name: "Sections", position: 3 },
];

export function staffMemberRoles() {
  return new Set(["LECTURER", "DEAN", "HEAD", "ADVISOR", "ADMIN"]);
}
