import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';

export const deleteUserByAdmin = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid user id', null);
  if (id === req.user.sub) throw new HttpError(400, 'You cannot delete your own account', null);

  try {
    await prisma.user.delete({ where: { id } });
  } catch (error) {
    if (error?.code === 'P2003') {
      throw new HttpError(
        409,
        'This user has related academic activity and cannot be deleted',
        null,
      );
    }
    throw error;
  }

  res.json({ message: 'User deleted successfully' });
};
