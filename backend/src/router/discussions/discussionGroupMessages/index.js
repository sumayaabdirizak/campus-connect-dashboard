import express from "express";
import acceptedAnswerRoutes from "./routes/acceptedAnswer.routes.js";
import editRoutes from "./routes/edit.routes.js";
import deleteRoutes from "./routes/delete.routes.js";
import reactionsRoutes from "./routes/reactions.routes.js";

const router = express.Router();

router.use(acceptedAnswerRoutes);
router.use(editRoutes);
router.use(deleteRoutes);
router.use(reactionsRoutes);

export default router;
