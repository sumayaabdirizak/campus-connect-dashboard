import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { cleanExpiredRevokedTokens } from "../src/utils/tokenRevocation.js";

const result = await cleanExpiredRevokedTokens();
console.log(JSON.stringify(result));
await prisma.$disconnect();
