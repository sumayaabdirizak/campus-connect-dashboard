import { prisma } from '../src/db/prisma.js';
import { CHANNEL_MSG_INCLUDE } from '../src/controllers/discussions/serverChannelFeed/shared.js';

try {
  const rows = await prisma.discussionMessage.findMany({
    where: { channelId: 33734, deletedAt: null, parentMessageId: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 5,
    include: CHANNEL_MSG_INCLUDE,
  });
  console.log('OK', rows.length, 'includeKeys', Object.keys(CHANNEL_MSG_INCLUDE));
  console.log('sample replyTo', rows[0]?.replyTo ?? null);
} catch (e) {
  console.error('FAIL', e.name, e.code, e.message);
} finally {
  await prisma.$disconnect();
}
