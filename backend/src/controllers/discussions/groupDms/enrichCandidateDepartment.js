/**
 * Map candidate users → department / batch / section for hierarchy picker.
 */

/**
 * @param {object} u
 * @param {Map<number, { id: number, name: string, code: string }>} deptById
 */
export function enrichCandidateDepartment(u, deptById) {
  const roleName = String(u.role?.name || '').toUpperCase();
  let departmentId = null;
  let departmentName = null;
  let departmentCode = null;
  let batchId = null;
  let batchName = null;
  let sectionId = null;
  let sectionName = null;

  const reg = pickActiveRegistration(u.studentRegistrations);
  if (reg?.batchSection) {
    const section = reg.batchSection;
    const batch = section.batch;
    const programDept = batch?.program?.department;
    sectionId = section.id;
    sectionName = section.name;
    batchId = batch?.id ?? null;
    batchName = batch?.name ?? null;
    if (programDept) {
      departmentId = programDept.id;
      departmentName = programDept.name;
      departmentCode = programDept.code;
    }
  }

  if (!departmentId && u.lecturerProfile?.department) {
    departmentId = u.lecturerProfile.department.id;
    departmentName = u.lecturerProfile.department.name;
    departmentCode = u.lecturerProfile.department.code;
  } else if (!departmentId && u.studentProfile?.departmentId) {
    const d = deptById.get(Number(u.studentProfile.departmentId));
    if (d) {
      departmentId = d.id;
      departmentName = d.name;
      departmentCode = d.code;
    }
  } else if (!departmentId && u.deanProfile?.faculty) {
    departmentName = u.deanProfile.faculty.name;
    departmentCode = u.deanProfile.faculty.code;
  }

  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: roleName || null,
    departmentId,
    departmentName,
    departmentCode,
    batchId,
    batchName,
    sectionId,
    sectionName,
  };
}

/** Prefer ACTIVE registration; else newest by id. */
function pickActiveRegistration(regs) {
  if (!Array.isArray(regs) || regs.length === 0) return null;
  const active = regs.find((r) => String(r.status || '').toUpperCase() === 'ACTIVE');
  return active || regs[0];
}
