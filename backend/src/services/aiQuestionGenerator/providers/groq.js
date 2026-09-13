import { SYSTEM_INSTRUCTION, JSON_SHAPE_HINT } from "../promptBuilders.js";
import { parseQuestionsJson } from "../helpers.js";
import { GROQ_MAX_COMPLETION_TOKENS } from "../fitSourceForGroq.js";

// Groq deprecated llama-3.3-70b-versatile (2026-06-17) for free/developer
// tier usage; openai/gpt-oss-120b is their recommended replacement at the
// same capability tier. Override with GROQ_MODEL if you need a different one.
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function generateWithGroq(userTurn, opts = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key || !key.trim()) {
    const err = new Error(
      "AI generation is disabled: set GROQ_API_KEY in the backend .env (free key at https://console.groq.com/keys)"
    );
    err.status = 503;
    throw err;
  }
  const model = (process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL).trim();
  const systemContent = `${SYSTEM_INSTRUCTION}\n\n${JSON_SHAPE_HINT}`;
  const maxTokens = opts.maxTokens || GROQ_MAX_COMPLETION_TOKENS;

  let res;
  try {
    res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userTurn },
        ],
      }),
    });
  } catch (e) {
    const err = new Error(`Groq API error: ${e?.message || String(e)}`);
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const rateLimited =
      res.status === 429 ||
      /rate_limit_exceeded|tokens per minute|TPM/i.test(bodyText);
    const tooLarge =
      res.status === 413 || /Request too large|payload.*large|context.?length/i.test(bodyText);

    if (rateLimited) {
      const err = new Error(
        "The AI rate limit was hit. Wait a few seconds and try again."
      );
      err.status = 429;
      throw err;
    }
    if (tooLarge) {
      const err = new Error(
        "Source material is too large for the AI model. Try a shorter document or excerpt, then generate again."
      );
      err.status = 413;
      throw err;
    }
    const err = new Error(
      `Groq API error (${res.status}): ${bodyText || res.statusText}`
    );
    err.status = 502;
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    const err = new Error("Groq response was not valid JSON");
    err.status = 502;
    err.cause = e;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  const parsed = parseQuestionsJson(text);
  const u = data.usage || {};
  return {
    questions: parsed.questions,
    usage: {
      input_tokens: u.prompt_tokens,
      output_tokens: u.completion_tokens,
      total_tokens: u.total_tokens,
    },
  };
}
