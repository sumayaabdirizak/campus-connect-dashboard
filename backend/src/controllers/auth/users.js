import { Router } from "express";
import { registerUserByAdmin, getAllUsers, getMe, patchMe } from "./users.controller.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { registerUserBodySchema, patchMeBodySchema } from "../../validation/authSchemas.js";

const router = Router();

router.get("/me", asyncHandler(getMe));

router.patch("/me", validateBody(patchMeBodySchema), asyncHandler(patchMe));

router.post(
  "/register", requireRole("SUPER_ADMIN"),
  validateBody(registerUserBodySchema),
  asyncHandler(registerUserByAdmin)
);

router.get("/", requireRole("SUPER_ADMIN"), asyncHandler(getAllUsers));
export default router;
