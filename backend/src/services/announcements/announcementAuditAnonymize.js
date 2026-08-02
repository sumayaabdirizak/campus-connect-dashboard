/**
 * GDPR-compliant anonymization helpers for announcement audit records.
 *
 * Hashes actor IDs with a server-side HMAC so erased users remain correlatable
 * across audit rows for security investigations (GDPR Art. 17 + Art. 5(1)(e)).
 */
import crypto from 'crypto';
import { prisma as defaultPrisma } from '../../db/prisma.js';
import { getSigningSecret } from '../../utils/signingSecret.js';
import { announcementLog } from './announcementLogger.js';

/**
 * Hash a user identifier with a server secret.
 * @param {number | string} actorId
 * @returns {string}
 */
export function hashActorId(actorId) {
  const secret = getSigningSecret('ANNOUNCEMENT_AUDIT_HASH_SECRET');
  return crypto
    .createHmac('sha256', secret)
    .update(String(actorId))
    .digest('hex')
    .slice(0, 32);
}

/**
 * Anonymise audit rows for a user about to be erased. Sets actorId NULL while
 * preserving an HMAC fingerprint so security investigations can still cluster
 * actions by the same (now-anonymous) actor.
 *
 * Call this BEFORE deleting the user row (FK is `onDelete: SetNull`).
 *
 * @param {number} userId
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [opts]
 * @returns {Promise<{ anonymized: number }>}
 */
export async function anonymizeAnnouncementAuditForUser(userId, opts = {}) {
  const prisma = opts.prisma ?? defaultPrisma;
  const hash = hashActorId(userId);
  try {
    const result = await prisma.announcementAudit.updateMany({
      where: { actorId: userId },
      data: { actorId: null, actorIdHash: hash },
    });
    announcementLog('info', 'announcement.retention.audit_anonymized', {
      userId,
      anonymized: result.count,
    });
    return { anonymized: result.count };
  } catch (err) {
    announcementLog('error', 'announcement.retention.audit_anonymize_failed', {
      userId,
      message: err?.message ?? String(err),
    });
    return { anonymized: 0 };
  }
}
