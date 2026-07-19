import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';

export async function listOffices(req, res) {
  const userId = Number(req.user.sub);
  const { page, pageSize, skip } = parsePaginationQuery(req.query, {
    defaultPageSize: 50,
    maxPageSize: 200,
  });
  const where = { isActive: true };
  const [totalCount, offices] = await Promise.all([
    prisma.supportOffice.count({ where }),
    prisma.supportOffice.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
      select: {
        id: true, name: true, slug: true, description: true, codePrefix: true,
        staff: { where: { userId }, select: { role: true } }
      }
    }),
  ]);
  const items = offices.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    description: o.description,
    codePrefix: o.codePrefix,
    myStaffRole: o.staff[0]?.role ?? null
  }));
  res.json(
    namedListSuccess({
      message: 'Offices fetched',
      name: 'offices',
      items,
      page,
      pageSize,
      totalCount,
    })
  );
}
