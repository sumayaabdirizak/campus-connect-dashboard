import { z } from 'zod';
import { ClubServiceError } from '../../services/clubs/club.service.js';

export function userId(req) {
  return Number(req.user?.id ?? req.user?.sub);
}

export function handleServiceError(err, res) {
  if (err instanceof ClubServiceError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      details: err.details,
    });
  }
  throw err;
}

export function formatClubForApi(club) {
  const { interests, _count, ...rest } = club;
  return {
    ...rest,
    interests: interests?.map((ci) => ci.tag) ?? [],
    pendingRequestCount: _count?.requests ?? undefined,
  };
}

/** Absolute URL or host-stable `/uploads/...` path. */
const optionalAssetUrl = z
  .union([
    z.string().url(),
    z.string().regex(/^\/uploads\/[A-Za-z0-9._/-]+$/),
  ])
  .optional()
  .nullable();

export const createClubSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(32).optional(),
  tagline: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  rules: z.string().trim().max(4000).optional().nullable(),
  iconUrl: optionalAssetUrl,
  bannerUrl: optionalAssetUrl,
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #1a2b3c')
    .optional()
    .nullable(),
  joinPolicy: z.enum(['OPEN', 'BY_REQUEST', 'INVITE_ONLY']).default('BY_REQUEST'),
  scopeKind: z.enum(['FACULTY', 'UNIVERSITY', 'CROSS']).default('FACULTY'),
  facultyId: z.number().int().positive().optional().nullable(),
  interestTagSlugs: z.array(z.string().trim()).max(10).optional(),
  moderatorUserIds: z.array(z.number().int().positive()).max(20).optional(),
});

export const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const editClubSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  tagline: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  rules: z.string().trim().max(4000).optional().nullable(),
  iconUrl: optionalAssetUrl,
  bannerUrl: optionalAssetUrl,
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  joinPolicy: z.enum(['OPEN', 'BY_REQUEST', 'INVITE_ONLY']).optional(),
});

export const userInterestsSchema = z.object({
  tagSlugs: z.array(z.string().min(1).max(60)).max(20),
});

export const createInviteSchema = z.object({
  inviteeUserId: z.number().int().positive().optional().nullable(),
  expiresInHours: z.number().int().min(1).max(720).default(168),
});
