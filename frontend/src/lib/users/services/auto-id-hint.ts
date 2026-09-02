export function autoIdHint(role: string, batchName?: string, deptCode?: string) {
  if (role === 'STUDENT') {
    return batchName
      ? `Auto: ${batchName}-001, ${batchName}-002, …`
      : 'Auto from batch code + serial (e.g. CS-FC-B1-001)';
  }
  if (role === 'TEACHER') {
    return deptCode
      ? `Auto: TCH-${deptCode}-001, …`
      : 'Auto: TCH-{department}-001';
  }
  if (role === 'DEAN') return 'Auto: DEAN-{faculty}-001';
  if (role === 'SUPER_ADMIN') return 'Auto: SA-001';
  return 'University ID will be generated automatically';
}
