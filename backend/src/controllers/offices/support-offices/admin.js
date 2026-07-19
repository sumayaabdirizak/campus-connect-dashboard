import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';

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

export async function addStaff(req, res) {
  const officeId = Number(req.params.id);
  const userId = Number(req.body?.userId);
  const role = req.body?.role === 'MANAGER' ? 'MANAGER' : 'AGENT';
  if (!Number.isFinite(userId)) throw new HttpError(400, 'userId is required');
  const row = await prisma.supportOfficeStaff.upsert({
    where: { officeId_userId: { officeId, userId } },
    create: { officeId, userId, role },
    update: { role },
    include: { user: { select: { id: true, full_name: true, email: true } } }
  });
  res.status(201).json(row);
}

export async function listStaff(req, res) {
  const rows = await prisma.supportOfficeStaff.findMany({
    where: { officeId: Number(req.params.id) },
    include: { user: { select: { id: true, full_name: true, email: true } } }
  });
  res.json(rows);
}
