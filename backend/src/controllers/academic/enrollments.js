import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import {
    getEnrollments,
    postEnrollment,
    getEnrollment,
    putEnrollment,
    deleteEnrollment,
    postBulkEnrollment,
} from "./enrollments.controller.js";

export const enrollmentsRouter = Router();

// Soo saar dhammaan diwaangelinta (Enrollments)
enrollmentsRouter.get("/", auth, getEnrollments);

// Samee diwaangelin cusub (Kaliya Super Admin)
enrollmentsRouter.post("/", auth, requireRole("SUPER_ADMIN", "DEAN"), postEnrollment);

// Soo saar hal diwaangelin adigoo ID-geeda u maraya
enrollmentsRouter.get("/:id", auth, getEnrollment);

// Beddel xogta diwaangelin jirta (Kaliya Super Admin)
enrollmentsRouter.patch("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), putEnrollment);

// Tirtir diwaangelin jirta (Kaliya Super Admin ama Faculty Admin)
enrollmentsRouter.delete("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), deleteEnrollment);

// Diwaangelin ballaran (Bulk Enrollment Route)
enrollmentsRouter.post("/bulk", auth, requireRole("SUPER_ADMIN", "DEAN"), postBulkEnrollment);

