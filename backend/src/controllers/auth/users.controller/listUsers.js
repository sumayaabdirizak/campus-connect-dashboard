import { prisma } from '../../../db/prisma.js';
import { parsePaginationQuery, paginatedPayload } from '../../../utils/pagination.js';

// Get all users with pagination and search
export const getAllUsers = async (req, res) => {
  const { page, pageSize, skip } = parsePaginationQuery(req.query, {
    defaultPageSize: 10,
    maxPageSize: 2000,
  });
  const { search, role } = req.query;

  const staffRoles = ['SUPER_ADMIN'];
  const where = {
    ...(search
      ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { number: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role === 'STAFF'
      ? { role: { name: { in: staffRoles } } }
      : role
        ? { role: { name: role } }
        : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        status: true,
        created_at: true,
        role: { select: { name: true } },
        studentProfile: {
          select: {
            student_number: true,
            admission_year: true,
            facultyId: true,
            departmentId: true,
            programId: true,
          },
        },
        lecturerProfile: {
          include: {
            faculties: { include: { faculty: true } },
          },
        },
        deanProfile: { include: { faculty: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const mappedUsers = users.map((u) => ({
    ...u,
    role: u.role.name,
    faculties: u.lecturerProfile?.faculties?.map((f) => ({
      id: f.faculty.id,
      name: f.faculty.name,
      code: f.faculty.code,
    })) ?? [],
  }));

  res.json(paginatedPayload({ total, page, pageSize, results: mappedUsers }));
};
