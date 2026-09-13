import { z } from "zod";

export const OVERWRITE_TARGET_TYPES = Object.freeze({ ROLE: "ROLE", MEMBER: "MEMBER" });

export const overwriteUpsertSchema = z
  .object({
    allow: z
      .string()
      .regex(/^\d+$/, "allow must be a non-negative decimal string")
      .max(40)
      .optional(),
    deny: z
      .string()
      .regex(/^\d+$/, "deny must be a non-negative decimal string")
      .max(40)
      .optional(),
  })
  .strict();

export function parseOverwriteTargetType(raw) {
  const key = String(raw || "").toUpperCase();
  return OVERWRITE_TARGET_TYPES[key] || null;
}

export function parseOverwriteTargetId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function safePermissionBigInt(input) {
  if (input === undefined || input === null) return null;
  try {
    return BigInt(input);
  } catch {
    return null;
  }
}

export function overwriteRowToDto(row) {
  return {
    id: row.id,
    channelId: row.channelId,
    targetType: row.targetType,
    targetId: row.targetId,
    allow: row.allow.toString(),
    deny: row.deny.toString(),
  };
}
