import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Keep codes safe in University IDs (e.g. CS&IT → CSIT). */
function sanitizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

/**
 * Next serial for numbers matching `{prefix}-{digits}`.
 * @param {string} prefix e.g. "CS-FC-B1" or "TCH-CS"
 */
export async function nextSerialForPrefix(prefix) {
  const rows = await prisma.user.findMany({
    where: { number: { startsWith: `${prefix}-` } },
    select: { number: true },
  });

  const re = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`);
  let max = 0;
  for (const row of rows) {
    const match = row.number?.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function formatId(prefix, serial, pad = 3) {
  return `${prefix}-${String(serial).padStart(pad, '0')}`;
}

/**
 * Auto University ID by role.
 * STUDENT: {batchName}-{NNN}  e.g. CS-FC-B1-001
 * TEACHER: TCH-{deptCode}-{NNN}
 * DEAN: DEAN-{facultyCode}-{NNN}
 * SUPER_ADMIN: SA-{NNN}
 * ACADEMIC_OFFICE: AO-{NNN}
 * Custom roles: {ROLE}-{NNN}  e.g. OFFICE-STAFF-001
 */
export async function generateUniversityId({
  role,
  batchSectionId,
  departmentCode,
  facultyId,
}) {
  if (role === 'STUDENT') {
    if (!batchSectionId) {
      throw new HttpError(400, 'Select a batch section to generate student ID.', null);
    }
    const section = await prisma.batchSection.findUnique({
      where: { id: Number(batchSectionId) },
      include: { batch: { select: { name: true } } },
    });
    const batchName = section?.batch?.name?.trim();
    if (!batchName) {
      throw new HttpError(400, 'Batch section is missing a batch code/name.', null);
    }
    const serial = await nextSerialForPrefix(batchName);
    return formatId(batchName, serial);
  }

  if (role === 'TEACHER') {
    const code = sanitizeCode(departmentCode);
    if (!code) {
      throw new HttpError(400, 'Department is required to generate this user ID.', null);
    }
    const prefix = `TCH-${code}`;
    return formatId(prefix, await nextSerialForPrefix(prefix));
  }

  if (role === 'DEAN') {
    if (!facultyId) {
      throw new HttpError(400, 'Faculty is required to generate dean ID.', null);
    }
    const faculty = await prisma.faculty.findUnique({
      where: { id: Number(facultyId) },
      select: { code: true },
    });
    if (!faculty?.code) {
      throw new HttpError(400, 'Selected faculty was not found.', null);
    }
    const prefix = `DEAN-${sanitizeCode(faculty.code)}`;
    return formatId(prefix, await nextSerialForPrefix(prefix));
  }

  if (role === 'SUPER_ADMIN') {
    const prefix = 'SA';
    return formatId(prefix, await nextSerialForPrefix(prefix));
  }

  if (role === 'ACADEMIC_OFFICE') {
    const prefix = 'AO';
    return formatId(prefix, await nextSerialForPrefix(prefix));
  }

  // Custom platform roles (e.g. OFFICE_STAFF): ROLECODE-{NNN}
  const customPrefix = sanitizeCode(String(role || '').replace(/_/g, '-'));
  if (customPrefix.length >= 2) {
    return formatId(customPrefix, await nextSerialForPrefix(customPrefix));
  }

  throw new HttpError(400, `Cannot generate University ID for role ${role}.`, null);
}
