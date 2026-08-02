import { HttpError } from '../../../utils/httpError.js';
import { canManageOffices } from '../../../../../shared/roles.js';
import { staffMembership } from './helpers.js';

/** SUPER_ADMIN, ACADEMIC_OFFICE, DEAN, or MANAGER of this office. */
export async function assertCanManageOfficeStaff(req, officeId) {
  const platformRole = req.user?.role;
  if (canManageOffices(platformRole)) return { via: 'admin' };

  const userId = Number(req.user?.sub);
  const membership = await staffMembership(userId, officeId);
  if (membership?.role === 'MANAGER') return { via: 'manager', membership };

  throw new HttpError(403, 'Only office managers or admins can manage office staff');
}

export function isOfficeManager(staffRow) {
  return staffRow?.role === 'MANAGER';
}
