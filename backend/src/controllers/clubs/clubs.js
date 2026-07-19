/**
 * Clubs REST controller — mounts at /api/clubs.
 * Static paths registered before param paths.
 */
import express from 'express';
import listRoutes from './routes/list.routes.js';
import mineRecommendedRoutes from './routes/mineRecommended.routes.js';
import deanRoutes from './routes/dean.routes.js';
import interestsRoutes from './routes/interests.routes.js';
import invitesAcceptRoutes from './routes/invitesAccept.routes.js';
import invitesPreviewRoutes from './routes/invitesPreview.routes.js';
import getBySlugRoutes from './routes/getBySlug.routes.js';
import createRoutes from './routes/create.routes.js';
import patchRoutes from './routes/patch.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import joinRoutes from './routes/join.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import membersListRoutes from './routes/membersList.routes.js';
import membersDecideRoutes from './routes/membersDecide.routes.js';
import membersPromoteRoutes from './routes/membersPromote.routes.js';
import membersDemoteRoutes from './routes/membersDemote.routes.js';
import membersKickRoutes from './routes/membersKick.routes.js';
import invitesCreateRoutes from './routes/invitesCreate.routes.js';
import invitesListDeleteRoutes from './routes/invitesListDelete.routes.js';

const router = express.Router();

router.use(listRoutes);
router.use(mineRecommendedRoutes);
router.use(deanRoutes);
router.use(interestsRoutes);
router.use(invitesAcceptRoutes);
router.use(invitesPreviewRoutes);
router.use(getBySlugRoutes);
router.use(createRoutes);
router.use(patchRoutes);
router.use(moderationRoutes);
router.use(joinRoutes);
router.use(leaveRoutes);
router.use(membersListRoutes);
router.use(membersDecideRoutes);
router.use(membersPromoteRoutes);
router.use(membersDemoteRoutes);
router.use(membersKickRoutes);
router.use(invitesCreateRoutes);
router.use(invitesListDeleteRoutes);

export default router;
