/** @param {object} parsed */
export function buildPreviewRecipientShards(parsed) {
  const shards = [];
  if (parsed.targetType === "ALL" || parsed.targetType === "FACULTY") {
    shards.push({
      targetType: parsed.targetType,
      facultyId: parsed.facultyId ?? null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    });
    return shards;
  }

  if (parsed.targetType === "DEPARTMENT") {
    const ids = parsed.departmentIds.length
      ? parsed.departmentIds
      : parsed.departmentId
        ? [parsed.departmentId]
        : [];
    ids.forEach((id) =>
      shards.push({
        targetType: "DEPARTMENT",
        facultyId: null,
        departmentId: id,
        batchId: null,
        sectionId: null,
      }),
    );
    return shards;
  }

  if (parsed.targetType === "BATCH") {
    const ids = parsed.batchIds.length ? parsed.batchIds : parsed.batchId ? [parsed.batchId] : [];
    ids.forEach((id) =>
      shards.push({
        targetType: "BATCH",
        facultyId: null,
        departmentId: null,
        batchId: id,
        sectionId: null,
      }),
    );
    return shards;
  }

  if (parsed.targetType === "SECTION") {
    const ids = parsed.sectionIds.length ? parsed.sectionIds : parsed.sectionId ? [parsed.sectionId] : [];
    ids.forEach((id) =>
      shards.push({
        targetType: "SECTION",
        facultyId: null,
        departmentId: null,
        batchId: null,
        sectionId: id,
      }),
    );
  }

  return shards;
}
