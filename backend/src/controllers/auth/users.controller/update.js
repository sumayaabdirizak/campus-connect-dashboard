import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';

export const updateUserByAdmin = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid user id', null);

  const user = await prisma.user.update({
    where: { id },
    data: {
      full_name: req.body.full_name,
      email: req.body.email,
      number: req.body.number,
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      number: true,
      phone: true,
      status: true,
      created_at: true,
      updated_at: true,
      role: { select: { name: true } },
    },
  });

  let officeStaff = undefined;
  if (Object.prototype.hasOwnProperty.call(req.body, 'officeId')) {
    const officeIdRaw = req.body.officeId;
    if (officeIdRaw === null) {
      await prisma.supportOfficeStaff.deleteMany({ where: { userId: id } });
      officeStaff = null;
    } else {
      const officeId = Number(officeIdRaw);
      const staffRole = req.body.officeStaffRole === 'MANAGER' ? 'MANAGER' : 'AGENT';
      const office = await prisma.supportOffice.findUnique({
        where: { id: officeId },
        select: { id: true, name: true, slug: true },
      });
      if (!office) throw new HttpError(400, 'Selected office was not found.', null);
      // One primary office from the user form: replace prior memberships.
      await prisma.supportOfficeStaff.deleteMany({ where: { userId: id } });
      const row = await prisma.supportOfficeStaff.create({
        data: { officeId, userId: id, role: staffRole },
        select: {
          role: true,
          office: { select: { id: true, name: true, slug: true } },
        },
      });
      officeStaff = { officeId: office.id, role: row.role, office: row.office };
    }
  }

  res.json({
    message: 'User updated successfully',
    user: {
      ...user,
      role: user.role.name,
      ...(officeStaff !== undefined ? { officeStaff } : {}),
    },
  });
};
