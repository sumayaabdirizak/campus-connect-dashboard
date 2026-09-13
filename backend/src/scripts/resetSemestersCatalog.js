/**
 * One-shot: delete all semesters and recreate 12 clean ones (6 years × 2).
 * Usage: node src/scripts/resetSemestersCatalog.js
 */
import { resetToCleanTwelveSemesters } from "../services/academic/resetSemesters.js";
import { prisma } from "../db/prisma.js";

async function main() {
  const result = await resetToCleanTwelveSemesters();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
