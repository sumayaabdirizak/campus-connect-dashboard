export function groupReactionsByEmoji(rows) {
  const byEmoji = new Map();
  for (const r of rows) {
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
    byEmoji.get(r.emoji).push({
      userId: r.userId,
      full_name: r.user?.full_name ?? null,
      ...(r.createdAt ? { createdAt: r.createdAt } : {}),
    });
  }
  return [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
}
