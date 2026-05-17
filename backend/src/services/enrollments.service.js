import { prisma } from "../db/prisma.js";
import { checkFacultyAccess } from "../utils/facultyAccess.js";

// Liiska dhammaan dadka is diwaangeliyey (ama kuwa kuliyadda admin-ka)
export async function listEnrollments(user) {
    const where = {};
    if (user.role === "FACULTY_ADMIN") {
        where.student = {
            student_profile: {
                program: {
                    department: {
                        faculty_id: Number(user.faculty_id)
                    }
                }
            }
        };
    }

    return prisma.enrollment.findMany({
        where,
        include: {
            student: { include: { student_profile: true } },
            course: true,
            section: true,
            enroller: true,
        },
        orderBy: { enrollment_id: "desc" },
    });
}

// Samee diwaangelin cusub oo koorso ah
export async function createEnrollment(user, {
    student_id,
    course_code,
    section_id,
    semester,
    enrolled_by,
}) {
    // Hubi in ardaygan uu hoos tago kuliyada user-ka
    const student = await prisma.user.findUnique({
        where: { user_id: Number(student_id) },
        include: { student_profile: { include: { program: { include: { department: true } } } } }
    });

    if (!student?.student_profile || !checkFacultyAccess(user, student.student_profile.program.department.faculty_id)) {
        throw new Error("Ma haysatid ogolaansho aad u diwaangeliso ardaygan kuliyadan");
    }

    return prisma.enrollment.create({
        data: {
            student_id: Number(student_id),
            course_code,
            section_id: Number(section_id),
            semester,
            enrolled_by: Number(enrolled_by),
        },
    });
}

// Soo saar xogta diwaangelin gaar ah
export async function getEnrollmentById(user, id) {
    const enrollment = await prisma.enrollment.findUnique({
        where: { enrollment_id: Number(id) },
        include: {
            student: { include: { student_profile: { include: { program: { include: { department: true } } } } } }
        },
    });

    if (enrollment && !checkFacultyAccess(user, enrollment.student.student_profile.program.department.faculty_id)) {
        return null;
    }

    return prisma.enrollment.findUnique({
        where: { enrollment_id: Number(id) },
        include: {
            student: true,
            course: true,
            section: true,
            enroller: true,
        },
    });
}

// Cusbooniysii xogta diwaangelinta
export async function updateEnrollment(user, id, data) {
    const enrollment = await getEnrollmentById(user, id);
    if (!enrollment) throw new Error("Diwaangelintan lama helin ama ma lihid ogolaansho");

    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.section_id) updateData.section_id = Number(data.section_id);
    if (data.semester) updateData.semester = data.semester;
    
    if (data.student_id) {
        const student = await prisma.user.findUnique({
            where: { user_id: Number(data.student_id) },
            include: { student_profile: { include: { program: { include: { department: true } } } } }
        });
        if (!student?.student_profile || !checkFacultyAccess(user, student.student_profile.program.department.faculty_id)) {
            throw new Error("Ma haysatid ogolaansho aad u wareejiso ardaygan");
        }
        updateData.student_id = Number(data.student_id);
    }

    if (data.course_code) updateData.course_code = data.course_code;

    return prisma.enrollment.update({
        where: { enrollment_id: Number(id) },
        data: updateData,
        include: {
            student: true,
            course: true,
            section: true,
            enroller: true,
        }
    });
}

// Tirtir diwaangelin gaar ah
export async function deleteEnrollment(user, id) {
    const enrollment = await getEnrollmentById(user, id);
    if (!enrollment) throw new Error("Diwaangelintan lama helin ama ma lihid ogolaansho");

    return prisma.enrollment.delete({
        where: { enrollment_id: Number(id) },
    });
}

// Diwaangelin ballaran oo hal mar ah (Bulk Enrollment for Batch)
export async function bulkEnrollBatch(user, {
    batch_id,
    course_codes,
    semester,
    section_id,
    enrolled_by
}) {
    // 1. Hubi in batch-kan uu hoos tago kuliyada user-ka
    const batch = await prisma.batch.findUnique({
        where: { batch_id: Number(batch_id) },
        include: { 
            program: { include: { department: true } },
            students: true 
        }
    });

    if (!batch || !checkFacultyAccess(user, batch.program.department.faculty_id)) {
        throw new Error("Ma haysatid ogolaansho aad u diwaangeliso dufcaddan/batch-kan");
    }

    if (!batch.students || batch.students.length === 0) {
        throw new Error("Batch-kan ma lahan arday hadda diwaangelisan");
    }

    const results = {
        total_students: batch.students.length,
        total_courses: course_codes.length,
        created: 0,
        skipped: 0
    };

    // 2. Loop dhex mar arday kasta iyo koorso kasta
    for (const student of batch.students) {
        for (const code of course_codes) {
            // Ma horay baa loo diwaangeliyey?
            const existing = await prisma.enrollment.findFirst({
                where: {
                    student_id: student.user_id,
                    course_code: code,
                    semester: semester
                }
            });

            if (existing) {
                results.skipped++;
                continue;
            }

            // Samee diwaangelin cusub
            await prisma.enrollment.create({
                data: {
                    student_id: student.user_id,
                    course_code: code,
                    section_id: section_id ? Number(section_id) : (student.section_id || null),
                    semester,
                    enrolled_by: Number(enrolled_by)
                }
            });
            results.created++;
        }
    }

    return results;
}

