import { asyncHandler } from '../../../utils/asyncHandler.js';
import { listResourceTypeOptions } from '../../../features/resources/resourceTypeOptions.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/types',
    asyncHandler(async (req, res) => {
      const includeInactive = req.query.includeInactive === '1';
      const rows = await listResourceTypeOptions({
        activeOnly: !includeInactive,
      });
      res.json(rows);
    })
  );
}
