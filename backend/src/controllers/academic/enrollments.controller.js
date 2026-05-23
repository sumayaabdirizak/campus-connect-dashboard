import * as enrollmentsService from "../../services/enrollments.service.js";
import { prisma } from "../../db/prisma.js";
import { dispatchCoursePost } from "../../services/courseAnnouncementDispatcher.service.js";

async function announceRegistration(studentId, sectionId) {
  if (!studentId || !sectionId) return;
  try {
    const [student, offerings] = await Promise.all([
      prisma.user.findUnique({ where: { id: Number(studentId) }, select: { full_name: true } }),
      prisma.courseOffering.findMany({
        where: { sectionId: Number(sectionId) },
        select: { id: true },
      }),
    ]);
    const name = student?.full_name ?? "A new student";
    await Promise.all(
      offerings.map((o) =>
        dispatchCoursePost({
          courseOfferingId: o.id,
          source: "REGISTRATION",
          sourceKey: `student:${studentId}`,
          title: "Welcome",
          content: `${name} joined this course.`,
        })
      )
    );
  } catch {
    /* swallow — registration must still succeed */
  }
}

// Soo saar dhammaan diwaangelinta (List Enrollments)
export async function getEnrollments(req, res, next) {
    try {
        const data = await enrollmentsService.listEnrollments(req.user);
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Samee diwaangelin cusub (New Enrollment)
export async function postEnrollment(req, res, next) {
    try {
        const { student_id, course_code, section_id, semester } = req.body;
        const enrolled_by = req.user?.sub;

        if (!student_id || !course_code || !section_id || !semester) {
            return res.status(400).json({
                message: "student_id, course_code, section_id, and semester are required",
            });
        }

        if (!enrolled_by) {
            return res.status(401).json({ message: "Unauthorized: missing user ID in token" });
        }

        const created = await enrollmentsService.createEnrollment(req.user, {
            student_id,
            course_code,
            section_id,
            semester,
            enrolled_by,
        });

        announceRegistration(student_id, section_id);

        res.status(201).json(created);
    } catch (e) {
        next(e);
    }
}

// Soo saar hal diwaangelin gaar ah (Get Enrollment)
export async function getEnrollment(req, res, next) {
    try {
        const { id } = req.params;
        const data = await enrollmentsService.getEnrollmentById(req.user, id);
        if (!data) {
            return res.status(404).json({ message: "Enrollment not found or unauthorized" });
        }
        res.json(data);
    } catch (e) {
        next(e);
    }
}

// Beddel xogta diwaangelin jirta (Update Enrollment)
export async function putEnrollment(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await enrollmentsService.updateEnrollment(req.user, id, req.body);
        res.json(updated);
    } catch (e) {
        next(e);
    }
}

// Tirtir diwaangelinta jira (Delete Enrollment)
export async function deleteEnrollment(req, res, next) {
    try {
        const { id } = req.params;
        await enrollmentsService.deleteEnrollment(req.user, id);
        res.status(204).send();
    } catch (e) {
        next(e);
    }
}

// Samee diwaangelin ballaran (Bulk Enrollment Post)
export async function postBulkEnrollment(req, res, next) {
    try {
        const { batch_id, course_codes, semester, section_id } = req.body;
        const enrolled_by = req.user?.sub;

        if (!batch_id || !course_codes || !semester) {
            return res.status(400).json({ 
                message: "batch_id, course_codes (array), and semester are required" 
            });
        }

        if (!enrolled_by) {
            return res.status(401).json({ message: "Unauthorized: missing user ID in token" });
        }

        const results = await enrollmentsService.bulkEnrollBatch(req.user, {
            batch_id,
            course_codes,
            semester,
            section_id,
            enrolled_by,
        });

        res.status(201).json({
            message: "Bulk enrollment completed successfully",
            results
        });
    } catch (e) {
        next(e);
    }
}

