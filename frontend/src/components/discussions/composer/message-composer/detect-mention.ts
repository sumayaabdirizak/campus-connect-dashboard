/** Look back from the caret for an open `@<query>` token (no spaces between
 *  the `@` and the caret). Returns null when the caret isn't in a mention
 *  position. The `@` must be preceded by start-of-string or whitespace. */
export function detectMentionAtCaret(
  value: string,
  caret: number
): { query: string; start: number; end: number } | null {
  for (let i = caret; i > 0; i--) {
    const ch = value[i - 1];
    if (ch === '@') {
      const prev = value[i - 2];
      if (prev !== undefined && !/\s/.test(prev)) return null;
      const query = value.slice(i, caret);
      if (/\s/.test(query)) return null;
      return { query, start: i - 1, end: caret };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}
