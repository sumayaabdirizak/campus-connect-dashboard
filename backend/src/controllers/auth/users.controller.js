import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { parsePaginationQuery, paginatedPayload } from '../../utils/pagination.js';

export { registerUserByAdmin } from './users.registration.js';

// Get all users with pagination and search
export const getAllUsers = async (req, res) => {
  const { page, pageSize, skip } = parsePaginationQuery(req.query);
  const { search, role } = req.query;

  const where = {
    ...(search ? {
      OR: [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(role ? { role: { name: role } } : {}),
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

// Get current user profile
export const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      full_name: true,
      email: true,
      number: true,
      phone: true,
      smsOptIn: true,
      status: true,
      created_at: true,
      updated_at: true,
      roleId: true,
      role: true,
      studentProfile: true,
      lecturerProfile: {
        include: { faculties: { include: { faculty: true } } },
      },
      deanProfile: { include: { faculty: true } },
      facultyAdminProfile: { include: { faculty: true } },
    },
  });

  if (!user) throw new HttpError(404, 'User not found', null);

  const roleName = user.role.name;
  const result = {
    ...user,
    role: roleName,
    faculties: user.lecturerProfile?.faculties?.map((f) => ({
      id: f.faculty.id,
      name: f.faculty.name,
    })) ?? [],
    scope: {
      facultyId: req.user.facultyId ?? null,
      departmentId: req.user.departmentId ?? null,
      programId: req.user.programId ?? null,
      facultyIds: Array.isArray(req.user.facultyIds) ? req.user.facultyIds : [],
    },
  };

  res.json(result);
};

export const patchMe = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.sub },
    data: { smsOptIn: req.body.smsOptIn },
  });
  return getMe(req, res);
};