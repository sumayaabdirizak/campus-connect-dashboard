import { Router } from "express";
import { registerUserByAdmin, getAllUsers, getMe, patchMe } from "./users.controller.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { registerUserBodySchema, patchMeBodySchema } from "../../validation/authSchemas.js";

const router = Router();

router.get("/me", auth, asyncHandler(getMe));

router.patch("/me", auth, validateBody(patchMeBodySchema), asyncHandler(patchMe));

router.post(
  "/register",
  auth,
  requireRole("SUPER_ADMIN"),
  validateBody(registerUserBodySchema),
  asyncHandler(registerUserByAdmin)
);

router.get("/", auth, requireRole("SUPER_ADMIN"), asyncHandler(getAllUsers));
export default router;
