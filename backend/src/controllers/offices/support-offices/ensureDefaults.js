import { ensureDefaultSupportOffices } from '../../../features/offices/ensureDefaultSupportOffices.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';

/** SUPER_ADMIN / ACADEMIC_OFFICE: university desks + per-faculty Dean's Offices. */
export async function ensureDefaults(req, res) {
  const result = await ensureDefaultSupportOffices();
  res.json(
    namedListSuccess({
      message: `Defaults ensured (${result.created} created, ${result.updated} updated)`,
      name: 'offices',
      items: result.offices,
      page: 1,
      pageSize: result.offices.length,
      totalCount: result.offices.length,
    })
  );
}
