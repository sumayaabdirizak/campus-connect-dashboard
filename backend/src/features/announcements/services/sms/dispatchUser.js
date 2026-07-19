import { announcementLog } from "../../announcementLogger.js";
import { tryConsumeSmsDailySlot } from "../smsRateLimit.service.js";
import { redactPhone, sendViaTwilio } from "./twilio.js";
import { writeSmsAudit } from "./audit.js";

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ id: number; phone: string | null; smsOptIn: boolean }} user
 * @param {number} announcementId
 * @param {string} body
 * @param {boolean} configured
 */
export async function dispatchSmsToUser(prisma, user, announcementId, body, configured) {
  const to = String(user.phone).trim();
  const masked = redactPhone(to);
  if (!to) {
    await writeSmsAudit(prisma, {
      userId: user.id,
      announcementId,
      phoneMasked: masked,
      status: "SKIPPED",
      reason: "NO_PHONE",
    });
    return;
  }
  if (!user.smsOptIn) {
    await writeSmsAudit(prisma, {
      userId: user.id,
      announcementId,
      phoneMasked: masked,
      status: "SKIPPED",
      reason: "SMS_OPT_IN_FALSE",
    });
    return;
  }

  const { allowed, usedRedis } = await tryConsumeSmsDailySlot(user.id);
  if (!allowed) {
    await writeSmsAudit(prisma, {
      userId: user.id,
      announcementId,
      phoneMasked: masked,
      status: "SKIPPED",
      reason: usedRedis ? "RATE_LIMIT_DAILY" : "RATE_LIMIT",
    });
    announcementLog("info", "announcement.sms_skipped_rate_limit", {
      announcementId,
      userId: user.id,
    });
    return;
  }

  try {
    if (configured) {
      await sendViaTwilio(to, body);
      await writeSmsAudit(prisma, {
        userId: user.id,
        announcementId,
        phoneMasked: masked,
        status: "SENT",
        reason: null,
      });
      announcementLog("info", "announcement.sms_sent", {
        announcementId,
        userId: user.id,
        to: masked,
      });
      return;
    }

    await writeSmsAudit(prisma, {
      userId: user.id,
      announcementId,
      phoneMasked: masked,
      status: "SKIPPED",
      reason: "NO_TWILIO_PROVIDER",
    });
    announcementLog("info", "announcement.sms_skipped_no_twilio", {
      announcementId,
      userId: user.id,
      to: masked,
      preview: body,
    });
  } catch (err) {
    await writeSmsAudit(prisma, {
      userId: user.id,
      announcementId,
      phoneMasked: masked,
      status: "FAILED",
      reason: String(err?.message ?? err).slice(0, 500),
    });
    announcementLog("warn", "announcement.sms_send_failed", {
      announcementId,
      userId: user.id,
      to: masked,
      message: err?.message ?? String(err),
    });
  }
}
