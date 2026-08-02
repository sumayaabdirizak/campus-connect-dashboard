import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { hashPassword, verifyPassword } from '../../../utils/password.js';

export async function changeMyPassword(req, res) {
  const userId = Number(req.user.sub);
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (currentPassword.length < 1 || newPassword.length < 8) {
    throw new HttpError(400, 'Current password and a new password (min 8 chars) are required');
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, 'New password must be different from the current password');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password_hash: true },
  });
  if (!user) throw new HttpError(404, 'User not found');

  const match = await verifyPassword(currentPassword, user.password_hash);
  if (!match) throw new HttpError(400, 'Current password is incorrect');

  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash, must_change_password: false },
  });

  res.json({ ok: true, message: 'Password updated' });
}
