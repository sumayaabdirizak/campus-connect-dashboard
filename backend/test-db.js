import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connection Successful!');
  } catch (error) {
    console.error('❌ Connection Failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
