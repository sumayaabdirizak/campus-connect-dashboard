import { SYSTEM_INSTRUCTION, JSON_SHAPE_HINT, buildUserTurn } from './promptBuilders.js';

/** Groq free-tier TPM for llama-3.3-70b-versatile. */
export const GROQ_TPM_LIMIT = 12_000;
/**
 * Groq TPM "Requested" ≈ prompt tokens + max_completion_tokens.
 * Keep completion modest so source still fits.
 */
export const GROQ_MAX_COMPLETION_TOKENS = 2_048;
/** Tokenizer / concurrent-usage headroom under the hard TPM cap. */
const GROQ_TPM_HEADROOM = 1_500;
/** Max estimated prompt tokens after fit. */
const GROQ_SAFE_INPUT_TOKENS =
  GROQ_TPM_LIMIT - GROQ_TPM_HEADROOM - GROQ_MAX_COMPLETION_TOKENS;
/** PDF/code extracts tokenize denser than prose. */
const CHARS_PER_TOKEN = 2.8;

export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / CHARS_PER_TOKEN);
}

/**
 * Truncate source so system + user messages + max_completion fit Groq TPM.
 * @returns {{ args: object, truncated: boolean, sourceLenBefore: number, sourceLenAfter: number, estInputTokens: number, estRequestedTpm: number, sourceBudgetChars: number }}
 */
export function fitArgsForGroq(args) {
  const systemContent = `${SYSTEM_INSTRUCTION}\n\n${JSON_SHAPE_HINT}`;
  const shell = buildUserTurn({ ...args, sourceMaterial: '' });
  const fixedTokens = estimateTokens(systemContent) + estimateTokens(shell) + 40;
  const sourceBudgetTokens = Math.max(500, GROQ_SAFE_INPUT_TOKENS - fixedTokens);
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
  const estRequestedTpm = estInputTokens + GROQ_MAX_COMPLETION_TOKENS;

  return {
    args: next,
    truncated,
    sourceLenBefore,
    sourceLenAfter: source.length,
    estInputTokens,
    estRequestedTpm,
    sourceBudgetChars,
    maxCompletionTokens: GROQ_MAX_COMPLETION_TOKENS,
  };
}
