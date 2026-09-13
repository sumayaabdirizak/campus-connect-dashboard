import { randomUUID } from 'crypto';
import { prisma } from '../src/db/prisma.js';

const MODELS = [
  'discussionGroup',
  'discussionChannelCategory',
  'discussionChannel',
  'groupDm',
  'discussionMessage',
  'discussionAttachment',
];

async function backfill(modelName) {
  const model = prisma[modelName];
  const rows = await model.findMany({ where: { publicId: null }, select: { id: true } });
  console.log(`${modelName}: ${rows.length} rows to backfill`);
  for (const row of rows) {
    await model.update({ where: { id: row.id }, data: { publicId: randomUUID() } });
  }
}

async function main() {
  for (const modelName of MODELS) {
    await backfill(modelName);
  }
  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
