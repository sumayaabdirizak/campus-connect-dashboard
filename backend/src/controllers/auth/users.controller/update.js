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

  res.json({
    message: 'User updated successfully',
    user: {
      ...user,
      role: user.role.name,
    },
  });
};
