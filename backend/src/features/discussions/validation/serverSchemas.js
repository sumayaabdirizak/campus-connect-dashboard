import { z } from "zod";

export const serverReactionBodySchema = z.object({
  emoji: z.string().trim().min(1).max(64),
});

export const sendChannelMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
  messageType: z.enum(["TEXT", "MEDIA", "SYSTEM", "QUESTION"]).default("TEXT"),
  postAsQuestion: z.boolean().optional().default(false),
  isAnonymous: z.boolean().optional().default(false),
  attachmentIds: z.array(z.number().int().positive()).default([]),
  parentMessageId: z.number().int().positive().optional().nullable(),
  e2e: z
    .object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
      keyVersion: z.number().int().positive(),
      senderDeviceId: z.string().min(1).max(128),
    })
    .optional(),
});

export const editChannelMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
});

export const patchChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(191).optional(),
    topic: z.union([z.string(), z.null()]).optional(),
    categoryId: z.union([z.number().int().positive(), z.null()]).optional(),
    position: z.number().int().min(0).max(10000).optional(),
    kind: z.enum(["TEXT", "ANNOUNCEMENT", "FORUM"]).optional(),
    isPrivate: z.boolean().optional(),
    slowModeSeconds: z.number().int().min(0).max(21600).optional(),
  })
  .strict();

export const createChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(191),
    topic: z.union([z.string(), z.null()]).optional(),
    categoryId: z.number().int().positive().optional(),
  })
  .strict();
