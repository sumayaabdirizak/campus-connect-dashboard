import { Router } from "express";
import { getCsrf, postLogin, postLogout, postRefresh } from "./auth.controller.js";
import { auth } from "../../middleware/auth.js";
import { loginRateLimit } from "../../middleware/loginRateLimit.js";
import { refreshRateLimit } from "../../middleware/refreshRateLimit.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { loginBodySchema } from "../../validation/authSchemas.js";

const router = Router();

router.post("/login", loginRateLimit, validateBody(loginBodySchema), asyncHandler(postLogin));
router.post("/refresh", refreshRateLimit, postRefresh);
router.get("/csrf", getCsrf);
router.post("/logout", auth, postLogout);


export default router;