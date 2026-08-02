import { Router } from "express";
import {
  registerUserByAdmin,
  registerStudentsBulk,
  getAllUsers,
  getMe,
  patchMe,
  changeMyPassword,
  uploadMyAvatar,
  removeMyAvatar,
  avatarUploadMw,
  updateUserByAdmin,
  deleteUserByAdmin,
  getUserRoles,
  grantUserRole,
  revokeUserRole,
} from "../../controllers/auth/users.controller/index.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadRateLimit } from "../../middleware/perUserRateLimit.js";
import {
  registerUserBodySchema,
  registerStudentsBulkBodySchema,
  patchMeBodySchema,
  changePasswordBodySchema,
  adminUpdateUserBodySchema,
} from "../../validation/authSchemas.js";

const router = Router();

router.get("/me", asyncHandler(getMe));
router.patch("/me", validateBody(patchMeBodySchema), asyncHandler(patchMe));
router.post(
  "/me/password",
  validateBody(changePasswordBodySchema),
  asyncHandler(changeMyPassword)
);
router.post(
  "/me/avatar",
  uploadRateLimit,
  avatarUploadMw,
  asyncHandler(uploadMyAvatar)
);
router.delete("/me/avatar", asyncHandler(removeMyAvatar));

router.post(
  "/register", requireRole("SUPER_ADMIN"),
  validateBody(registerUserBodySchema),
  asyncHandler(registerUserByAdmin)
);

router.post(
  "/register-bulk",
  requireRole("SUPER_ADMIN"),
  validateBody(registerStudentsBulkBodySchema),
  asyncHandler(registerStudentsBulk)
);

router.get("/", requireRole("SUPER_ADMIN"), asyncHandler(getAllUsers));
router.put(
  "/:id",
  requireRole("SUPER_ADMIN"),
  validateBody(adminUpdateUserBodySchema),
  asyncHandler(updateUserByAdmin),
);
router.delete("/:id", requireRole("SUPER_ADMIN"), asyncHandler(deleteUserByAdmin));

router.get("/:id/roles", requireRole("SUPER_ADMIN"), asyncHandler(getUserRoles));
router.post("/:id/roles", requireRole("SUPER_ADMIN"), asyncHandler(grantUserRole));
router.delete("/:id/roles/:role", requireRole("SUPER_ADMIN"), asyncHandler(revokeUserRole));

export default router;
