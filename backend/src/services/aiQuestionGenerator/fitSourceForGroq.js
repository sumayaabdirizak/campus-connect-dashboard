import { SYSTEM_INSTRUCTION, JSON_SHAPE_HINT, buildUserTurn } from './promptBuilders.js';

/** Groq free-tier TPM for openai/gpt-oss-120b (the current default model). */
export const GROQ_TPM_LIMIT = 8_000;
/** Fallback when count is unknown. */
export const GROQ_MAX_COMPLETION_TOKENS = 2_048;
/** Tokenizer / concurrent-usage headroom under the hard TPM cap. */
const GROQ_TPM_HEADROOM = 800;
/** PDF/code extracts tokenize denser than prose. */
const CHARS_PER_TOKEN = 2.8;

/**
 * Larger batches need more completion tokens or JSON truncates mid-array
 * (teachers then see "Generated 4 of 10"). Scale with count, leave room for input.
 */
export function completionTokensForCount(count) {
  const n = Math.max(1, Math.min(25, Number(count) || 10));
  // ~300–350 tokens per MCQ-style JSON item; cap so input still fits TPM.
  const wanted = Math.min(5_500, Math.max(2_048, Math.ceil(n * 340)));
  return wanted;
}

export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / CHARS_PER_TOKEN);
}

/**
 * Truncate source so system + user messages + max_completion fit Groq TPM.
 */
export function fitArgsForGroq(args) {
  const maxCompletionTokens = completionTokensForCount(args.count);
  const safeInputTokens = Math.max(
    1_200,
    GROQ_TPM_LIMIT - GROQ_TPM_HEADROOM - maxCompletionTokens
  );

  const systemContent = `${SYSTEM_INSTRUCTION}\n\n${JSON_SHAPE_HINT}`;
  const shell = buildUserTurn({ ...args, sourceMaterial: '' });
  const fixedTokens = estimateTokens(systemContent) + estimateTokens(shell) + 40;
  const sourceBudgetTokens = Math.max(400, safeInputTokens - fixedTokens);
  const sourceBudgetChars = Math.floor(sourceBudgetTokens * CHARS_PER_TOKEN);

  const original = String(args.sourceMaterial || '').trim();
  const sourceLenBefore = original.length;
  let source = original;
  let truncated = false;
  if (source.length > sourceBudgetChars) {
    truncated = true;
    source =
      source.slice(0, sourceBudgetChars).trimEnd() +
      '\n\n[Source truncated to fit the AI model context limit. Prefer a shorter excerpt if questions miss later sections.]';
  }

  const next = { ...args, sourceMaterial: source };
  const userTurn = buildUserTurn(next);
  const estInputTokens =
    estimateTokens(systemContent) + estimateTokens(userTurn);
  const estRequestedTpm = estInputTokens + maxCompletionTokens;

  return {
    args: next,
    truncated,
    sourceLenBefore,
    sourceLenAfter: source.length,
    estInputTokens,
    estRequestedTpm,
    sourceBudgetChars,
    maxCompletionTokens,
  };
}
