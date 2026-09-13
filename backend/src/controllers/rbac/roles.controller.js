import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { namedListSuccess } from '../../utils/apiEnvelope.js';
import { normalizeRoleName, ROLES } from '../../../../shared/roles.js';

export async function listRoles(_req, res) {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, _count: { select: { users: true } } }
  });
  const items = roles.map((r) => ({
    id: r.id,
    name: r.name,
    userCount: r._count.users,
    isBuiltin: ROLES.includes(r.name)
  }));
  res.json(
    namedListSuccess({
      message: 'Roles fetched',
      name: 'roles',
      items,
      page: 1,
      pageSize: items.length,
      totalCount: items.length
    })
  );
}

export async function createRole(req, res) {
  const name = normalizeRoleName(req.body?.name);
  if (!name || name.length < 2) {
    throw new HttpError(400, 'name is required (letters, numbers, underscores)');
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    throw new HttpError(400, 'name must start with a letter (A–Z)');
  }
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw new HttpError(409, `Role "${name}" already exists`);

  const role = await prisma.role.create({
    data: { name },
    select: { id: true, name: true }
  });
  res.status(201).json({ ...role, userCount: 0, isBuiltin: false });
}
