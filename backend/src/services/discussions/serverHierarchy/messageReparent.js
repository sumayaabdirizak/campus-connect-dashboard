import { prisma } from "../../../db/prisma.js";

export async function reparentLegacyMessages(legacyGroupId, channelId, prismaClient = prisma) {
  const channel = await prismaClient.discussionChannel.findUnique({
    where: { id: channelId },
    select: { serverId: true },
  });
  if (!channel) return 0;
  const result = await prismaClient.discussionMessage.updateMany({
    where: { groupId: legacyGroupId, channelId: null },
    data: { channelId, groupId: channel.serverId },
  });
  return result.count ?? 0;
}

export async function reparentFacultyMessagesToGeneral(serverGroup, prismaClient = prisma) {
  const general = await prismaClient.discussionChannel.findUnique({
    where: { serverId_slug: { serverId: serverGroup.id, slug: "general" } },
    select: { id: true },
  });
  if (!general) return 0;
  const result = await prismaClient.discussionMessage.updateMany({
    where: { groupId: serverGroup.id, channelId: null },
    data: { channelId: general.id },
  });
  return result.count ?? 0;
}
