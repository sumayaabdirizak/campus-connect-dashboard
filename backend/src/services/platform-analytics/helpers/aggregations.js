import { prisma } from '../../../db/prisma.js';
import { safe } from './safe.js';

function monthKeyFromParts(year, monthIndex) {
  return `${year}-${monthIndex}`;
}

function facultyUserSql(alias, facultyId) {
  return `
    (
      EXISTS (
        SELECT 1 FROM "StudentProfile" sp
        WHERE sp."userId" = ${alias}."senderId" AND sp."facultyId" = ${facultyId}
      )
      OR EXISTS (
        SELECT 1 FROM "LecturerProfile" lp
        INNER JOIN "LecturerFaculty" lf ON lf."lecturerProfileId" = lp.id
        WHERE lp."userId" = ${alias}."senderId" AND lf."facultyId" = ${facultyId}
      )
    )
  `;
}

function facultyUserSqlForUser(alias, facultyId) {
  return `
    (
      EXISTS (
        SELECT 1 FROM "StudentProfile" sp
        WHERE sp."userId" = ${alias}.id AND sp."facultyId" = ${facultyId}
      )
      OR EXISTS (
        SELECT 1 FROM "LecturerProfile" lp
        INNER JOIN "LecturerFaculty" lf ON lf."lecturerProfileId" = lp.id
        WHERE lp."userId" = ${alias}.id AND lf."facultyId" = ${facultyId}
      )
    )
  `;
}

/** @returns {Promise<Record<string, number>>} keys like `2026-2` (JS month index) */
export async function aggregateMessagesByMonth(since, facultyId) {
  return safe(async () => {
    const facultyFilter =
      facultyId != null ? `AND ${facultyUserSql('m', Number(facultyId))}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        EXTRACT(YEAR FROM date_trunc('month', m."createdAt"))::int AS y,
        (EXTRACT(MONTH FROM date_trunc('month', m."createdAt"))::int - 1) AS m,
        COUNT(*)::int AS count
      FROM "DiscussionMessage" m
      WHERE m."deletedAt" IS NULL
        AND m."createdAt" >= $1
        ${facultyFilter}
      GROUP BY 1, 2
      ORDER BY 1, 2
      `,
      since
    );
    const out = {};
    for (const row of rows) {
      out[monthKeyFromParts(Number(row.y), Number(row.m))] = Number(row.count);
    }
    return out;
  }, {});
}

/** @returns {Promise<Record<string, number>>} keys like `2026-2` */
export async function aggregateUsersByMonth(since, facultyId) {
  return safe(async () => {
    const facultyFilter =
      facultyId != null ? `AND ${facultyUserSqlForUser('u', Number(facultyId))}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        EXTRACT(YEAR FROM date_trunc('month', u.created_at))::int AS y,
        (EXTRACT(MONTH FROM date_trunc('month', u.created_at))::int - 1) AS m,
        COUNT(*)::int AS count
      FROM "User" u
      WHERE u.created_at >= $1
        ${facultyFilter}
      GROUP BY 1, 2
      ORDER BY 1, 2
      `,
      since
    );
    const out = {};
    for (const row of rows) {
      out[monthKeyFromParts(Number(row.y), Number(row.m))] = Number(row.count);
    }
    return out;
  }, {});
}

/**
 * Bucket message counts for the system-usage chart without loading every row.
 * @returns {Promise<number[]>} length = bucketCount
 */
export async function aggregateMessagesByBucket({
  rangeStart,
  bucketDays,
  bucketCount,
  facultyId,
}) {
  return safe(async () => {
    const bucketSeconds = bucketDays * 24 * 60 * 60;
    const facultyFilter =
      facultyId != null ? `AND ${facultyUserSql('m', Number(facultyId))}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        LEAST(
          GREATEST(
            FLOOR(EXTRACT(EPOCH FROM (m."createdAt" - $1::timestamptz)) / $2)::int,
            0
          ),
          $3 - 1
        ) AS bucket_idx,
        COUNT(*)::int AS count
      FROM "DiscussionMessage" m
      WHERE m."deletedAt" IS NULL
        AND m."createdAt" >= $1
        ${facultyFilter}
      GROUP BY 1
      ORDER BY 1
      `,
      rangeStart,
      bucketSeconds,
      bucketCount
    );
    const counts = new Array(bucketCount).fill(0);
    for (const row of rows) {
      const idx = Number(row.bucket_idx);
      if (idx >= 0 && idx < bucketCount) counts[idx] = Number(row.count);
    }
    return counts;
  }, new Array(bucketCount).fill(0));
}
