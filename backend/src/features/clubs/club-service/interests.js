export async function attachInterestsIfAny(tx, clubId, tagSlugs) {
  if (!Array.isArray(tagSlugs) || tagSlugs.length === 0) return;
  const tags = await tx.interestTag.findMany({
    where: { slug: { in: tagSlugs.map((s) => String(s).trim().toLowerCase()) } },
    select: { id: true },
  });
  if (tags.length === 0) return;
  await tx.clubInterest.createMany({
    data: tags.map((t) => ({ clubId, tagId: t.id })),
    skipDuplicates: true,
  });
}
