import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import {
  canManageOffices,
  isDeanRole,
  isStudentRole,
} from '../../../../../shared/roles.js';
import {
  loadStudentFacultyId,
  studentContactableOfficeWhere,
} from './studentOfficeContactScope.js';

const FACULTY_SELECT = { id: true, name: true, code: true };

export async function listOffices(req, res) {
  const userId = Number(req.user.sub);
  const platformRole = req.user?.role;
  const includeInactive =
    req.query.includeInactive === 'true' && canManageOffices(platformRole);
  const { page, pageSize, skip } = parsePaginationQuery(req.query, {
    defaultPageSize: 50,
    maxPageSize: 200,
  });

  // `scope=manage` is the admin Offices table (deans manage only their own
  // faculty's desk there); omitted for "Contact an office" messaging, which
  // still lets a dean reach any office university-wide.
  const isManageScope = req.query.scope === 'manage';

  const baseWhere = includeInactive ? {} : { isActive: true };
  let where = baseWhere;
  if (isStudentRole(platformRole)) {
    const facultyId = await loadStudentFacultyId(userId);
    where = {
      AND: [baseWhere, studentContactableOfficeWhere(facultyId)],
    };
  } else if (isManageScope && isDeanRole(platformRole)) {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    where = {
      AND: [baseWhere, { facultyId: deanProfile?.facultyId ?? -1 }],
    };
  }

  const [totalCount, offices] = await Promise.all([
    prisma.supportOffice.count({ where }),
    prisma.supportOffice.findMany({
      where,
      orderBy: [{ facultyId: 'asc' }, { name: 'asc' }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        codePrefix: true,
        isActive: true,
        createdAt: true,
        facultyId: true,
        faculty: { select: FACULTY_SELECT },
        staff: { where: { userId }, select: { role: true } },
      },
    }),
  ]);
  const items = offices.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    description: o.description,
    codePrefix: o.codePrefix,
    isActive: o.isActive,
    createdAt: o.createdAt,
    facultyId: o.facultyId,
    faculty: o.faculty,
    myStaffRole: o.staff[0]?.role ?? null,
  }));
  res.json(
    namedListSuccess({
      message: 'Offices fetched',
      name: 'offices',
      items,
      page,
      pageSize,
      totalCount,
    })
  );
}
