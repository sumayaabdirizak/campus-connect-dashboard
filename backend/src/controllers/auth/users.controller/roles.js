import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { listAvailableRoleNames } from '../auth.helpers.js';

function parseUserId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid user id', null);
  return id;
}

/** GET /users/:id/roles — primary role + every granted secondary role. */
export const getUserRoles = async (req, res) => {
  const id = parseUserId(req);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: { select: { name: true } } },
  });
  if (!user) throw new HttpError(404, 'User not found', null);

  const availableRoles = await listAvailableRoleNames(id);
  res.json({ primaryRole: user.role.name, availableRoles });
};

/** POST /users/:id/roles { role } — grant a secondary role (idempotent). */
export const grantUserRole = async (req, res) => {
  const id = parseUserId(req);
  const roleName = String(req.body?.role ?? '').toUpperCase();
  if (!roleName) throw new HttpError(400, 'role is required', null);

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, roleId: true } }),
    prisma.role.findUnique({ where: { name: roleName } }),
  ]);
  if (!user) throw new HttpError(404, 'User not found', null);
  if (!role) throw new HttpError(400, `Unknown role "${roleName}"`, null);
  if (role.id === user.roleId) {
    throw new HttpError(400, 'That is already this user’s primary role', null);
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: id, roleId: role.id } },
    create: { userId: id, roleId: role.id },
    update: {},
  });

  const availableRoles = await listAvailableRoleNames(id);
  res.status(201).json({ message: `Granted ${roleName}`, availableRoles });
};

/** DELETE /users/:id/roles/:role — revoke a granted secondary role. */
export const revokeUserRole = async (req, res) => {
  const id = parseUserId(req);
  const roleName = String(req.params.role ?? '').toUpperCase();

  const user = await prisma.user.findUnique({ where: { id }, select: { roleId: true } });
  if (!user) throw new HttpError(404, 'User not found', null);

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new HttpError(400, `Unknown role "${roleName}"`, null);
  if (role.id === user.roleId) {
    throw new HttpError(400, 'Cannot revoke the primary role', null);
  }

  await prisma.userRole.deleteMany({ where: { userId: id, roleId: role.id } });

  const availableRoles = await listAvailableRoleNames(id);
  res.json({ message: `Revoked ${roleName}`, availableRoles });
};
