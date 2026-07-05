import { z } from "zod";

export const sendMessageSchema = z.object({
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

export const editMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
  e2e: z
    .object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
      keyVersion: z.number().int().positive(),
      senderDeviceId: z.string().min(1).max(128),
    })
    .optional(),
});

export const pinBodySchema = z.object({
  messageId: z.number().int().positive(),
});

export const muteBodySchema = z.object({
  until: z.string().datetime().optional().nullable(),
});

export const reactionBodySchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.number().int().positive()).optional(),
  groupId: z.number().int().positive().optional(),
  groupDmId: z.number().int().positive().optional(),
  markAll: z.boolean().optional(),
  upToCreatedAt: z.string().datetime().optional(),
});

export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(30),
  unreadOnly: z.coerce.boolean().optional().default(false),
  groupId: z.coerce.number().int().positive().optional(),
});

export const registerDeviceSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
  publicKey: z.string().trim().min(16),
  algorithm: z.string().trim().min(1).max(64).default("X25519"),
});

export const publishEpochSchema = z.object({
  keyVersion: z.number().int().positive(),
  algorithm: z.string().trim().min(1).max(64).default("X25519_AES_GCM"),
  envelopes: z
    .array(
      z.object({
        userId: z.number().int().positive(),
        deviceId: z.string().trim().min(1).max(128),
        encryptedKey: z.string().min(16),
        nonce: z.string().optional(),
      })
    )
    .min(1),
  rotationReason: z.string().trim().max(200).optional(),
});

export const patchDiscussionMeStatusSchema = z.object({
  status: z.union([z.string(), z.null()]),
});

export const acceptedAnswerBodySchema = z.object({
  accepted: z.boolean(),
});

export const createGroupDmSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  memberUserIds: z.array(z.number().int().positive()).min(2),
});

export const groupDmSendMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
  messageType: z.enum(["TEXT", "MEDIA", "SYSTEM"]).default("TEXT"),
  parentMessageId: z.number().int().positive().optional().nullable(),
});

export const addGroupDmMembersSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
});
