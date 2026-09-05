import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { listAvailableRoleNames } from '../auth.helpers.js';
import { loadBatchSemesterForUserId } from '../../../services/integrations/academicInfoSystem/universityStudentAcademic.js';

async function enrichStudentAcademic(studentProfile) {
  if (!studentProfile) return null;
  const [faculty, department, program, batchSemester] = await Promise.all([
    prisma.faculty.findUnique({
      where: { id: studentProfile.facultyId },
      select: { id: true, name: true, code: true },
    }),
    prisma.department.findUnique({
      where: { id: studentProfile.departmentId },
      select: { id: true, name: true, code: true },
    }),
    prisma.program.findUnique({
      where: { id: studentProfile.programId },
      select: { id: true, name: true, code: true },
    }),
    loadBatchSemesterForUserId(studentProfile.userId),
  ]);

  return {
    ...studentProfile,
    faculty,
    department,
    program,
    batch_semester_number: batchSemester.number,
    semester_label: batchSemester.label,
  };
}

export const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      full_name: true,
      email: true,
      number: true,
      phone: true,
      avatarUrl: true,
      smsOptIn: true,
      status: true,
      created_at: true,
      updated_at: true,
      roleId: true,
      role: true,
      studentProfile: true,
      lecturerProfile: {
        include: {
          department: { select: { id: true, name: true, code: true } },
          faculties: { include: { faculty: { select: { id: true, name: true, code: true } } } },
        },
      },
      deanProfile: {
        include: { faculty: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!user) throw new HttpError(404, 'User not found', null);

  const roleName = user.role.name;
  const studentProfile = await enrichStudentAcademic(user.studentProfile);
  const availableRoles = await listAvailableRoleNames(user.id);

  res.json({
    ...user,
    studentProfile,
    role: roleName,
    availableRoles,
    faculties:
      user.lecturerProfile?.faculties?.map((f) => ({
        id: f.faculty.id,
        name: f.faculty.name,
        code: f.faculty.code,
      })) ?? [],
    scope: {
      facultyId: req.user.facultyId ?? null,
      departmentId: req.user.departmentId ?? null,
      programId: req.user.programId ?? null,
      facultyIds: Array.isArray(req.user.facultyIds) ? req.user.facultyIds : [],
    },
  });
};

export const patchMe = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.sub },
    data: { smsOptIn: req.body.smsOptIn },
  });
  return getMe(req, res);
};
