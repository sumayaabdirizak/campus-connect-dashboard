import { whereFromParam } from "./publicIdResolution.js";

/** Prisma include for WhatsApp-style quote target. */
export const REPLY_TO_INCLUDE = {
  replyTo: {
    select: {
      id: true,
      publicId: true,
      content: true,
      deletedAt: true,
      sender: { select: { id: true, full_name: true } },
    },
  },
};

/**
 * Ensure replyTo is an undeleted message in the same DM or channel. Accepts
 * either the message's UUID publicId or a legacy numeric id.
 * @returns {Promise<number | null>}
 */
export async function resolveReplyToMessageId(
  prismaClient,
  {
    replyToMessageId,
    groupDmId = null,
    channelId = null,
    groupId = null,
  }
) {
  const idWhere = whereFromParam(replyToMessageId);
  if (!idWhere) return null;

  const where = {
    ...idWhere,
    deletedAt: null,
    ...(groupDmId != null ? { groupDmId: Number(groupDmId) } : {}),
    ...(channelId != null ? { channelId: Number(channelId) } : {}),
    ...(groupId != null ? { groupId: Number(groupId) } : {}),
  };

  const row = await prismaClient.discussionMessage.findFirst({
    where,
    select: { id: true },
  });
  return row?.id ?? null;
}
