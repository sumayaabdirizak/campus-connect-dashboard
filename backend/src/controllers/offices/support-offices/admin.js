import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { assertCanManageOfficeStaff } from './office-staff-auth.js';

export async function createOffice(req, res) {
  const { name, slug, description, codePrefix } = req.body ?? {};
  if (!name || !slug) throw new HttpError(400, 'name and slug are required');
  const office = await prisma.supportOffice.create({
    data: {
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase(),
      description: description ? String(description).trim() : null,
      codePrefix: codePrefix ? String(codePrefix).trim().toUpperCase().slice(0, 6) : 'OFC'
    }
  });
  res.status(201).json(office);
}

export async function updateOffice(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, 'Invalid office id');

  const { name, description, codePrefix, isActive } = req.body ?? {};
  const data = {};
  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new HttpError(400, 'name cannot be empty');
    data.name = trimmed;
  }
  if (description !== undefined) {
    data.description = description ? String(description).trim() : null;
  }
  if (codePrefix != null) {
    data.codePrefix = String(codePrefix).trim().toUpperCase().slice(0, 6) || 'OFC';
  }
  if (typeof isActive === 'boolean') data.isActive = isActive;

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'No fields to update');
  }

  try {
    const office = await prisma.supportOffice.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        codePrefix: true,
        isActive: true,
        createdAt: true
      }
    });
    res.json(office);
  } catch (err) {
    if (err?.code === 'P2025') throw new HttpError(404, 'Office not found');
    throw err;
  }
}

export async function addStaff(req, res) {
  const officeId = Number(req.params.id);
  await assertCanManageOfficeStaff(req, officeId);
  const userId = Number(req.body?.userId);
  const role = req.body?.role === 'MANAGER' ? 'MANAGER' : 'AGENT';
  if (!Number.isFinite(userId)) throw new HttpError(400, 'userId is required');

  // Each office may have exactly one manager; everyone else is an agent.
  if (role === 'MANAGER') {
    const existingManager = await prisma.supportOfficeStaff.findFirst({
      where: { officeId, role: 'MANAGER', userId: { not: userId } },
      select: { userId: true, user: { select: { full_name: true } } }
    });
    if (existingManager) {
      throw new HttpError(
        400,
        `${existingManager.user.full_name} is already the manager of this office — remove them or change their role first`
      );
    }
  }

  const row = await prisma.supportOfficeStaff.upsert({
    where: { officeId_userId: { officeId, userId } },
    create: { officeId, userId, role },
    update: { role },
    include: { user: { select: { id: true, full_name: true, email: true } } }
  });
  res.status(201).json(row);
}

export async function listStaff(req, res) {
  const officeId = Number(req.params.id);
  await assertCanManageOfficeStaff(req, officeId);
  const rows = await prisma.supportOfficeStaff.findMany({
    where: { officeId },
    include: { user: { select: { id: true, full_name: true, email: true } } }
  });
  res.json(rows);
}

export async function removeStaff(req, res) {
  const officeId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  await assertCanManageOfficeStaff(req, officeId);
  if (!Number.isFinite(targetUserId)) throw new HttpError(400, 'userId is required');

  const existing = await prisma.supportOfficeStaff.findUnique({
    where: { officeId_userId: { officeId, userId: targetUserId } }
  });
  if (!existing) throw new HttpError(404, 'Staff member not found on this office');

  // Keep at least one manager when removing a manager.
  if (existing.role === 'MANAGER') {
    const managerCount = await prisma.supportOfficeStaff.count({
      where: { officeId, role: 'MANAGER' }
    });
    if (managerCount <= 1) {
      throw new HttpError(400, 'Cannot remove the last manager of this office');
    }
  }

  await prisma.supportOfficeStaff.delete({
    where: { officeId_userId: { officeId, userId: targetUserId } }
  });
  res.json({ ok: true, officeId, userId: targetUserId });
}
