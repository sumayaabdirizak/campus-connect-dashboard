/** Shared Prisma include for group member rows. */
export const memberInclude = {
  member: { select: { id: true, full_name: true, number: true } },
};
