export function buildQuickLinks(resources = []) {
  const visible = resources.filter((r) => !r.is_draft && r.status === "APPROVED");
  const syllabus = visible.find((r) => r.type === "SYLLABUS") ?? null;
  return {
    syllabus: syllabus
      ? {
          id: syllabus.id,
          title: syllabus.title,
          url: syllabus.url,
          type: syllabus.type,
        }
      : null,
    resourcesCount: visible.length,
  };
}
