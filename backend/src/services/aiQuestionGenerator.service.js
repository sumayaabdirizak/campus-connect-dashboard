import { GoogleGenAI, Type } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// AI question generation service.
//
// Drafts quiz questions from a teacher's prompt + optional source material and
// returns a strict JSON object matching our question shape — no markdown
// wrapping, no preamble — which we surface to the teacher for review. The
// teacher cherry-picks which rows persist, so generation has zero database
// side-effects.
//
// Two interchangeable providers, selected by env (see resolveProvider):
//   • Groq   — free, fast, OpenAI-compatible. Default when GROQ_API_KEY is set.
//              Uses JSON mode (`response_format: json_object`) + a schema hint
//              in the system prompt; we re-validate the shape with Joi at the
//              controller layer.
//   • Gemini — Google's free tier. Uses `responseSchema` (a hard decode-time
//              constraint). Subject to regional free-tier availability.
//
// Both return the SAME `{ questions, usage }` shape, so the route handler and
// frontend never need to know which provider ran.
//
// To switch providers, set in backend/.env:
//   AI_PROVIDER=groq            # or "gemini"; omit to auto-detect
//   GROQ_API_KEY=...            # https://console.groq.com/keys
//   GROQ_MODEL=...              # optional; defaults below
//   GEMINI_API_KEY=...          # https://aistudio.google.com/apikey
// ─────────────────────────────────────────────────────────────────────────────

// Gemini: pinned to a known free-tier model so behavior doesn't drift.
const GEMINI_MODEL_ID = "gemini-2.0-flash";

// Groq: a strong, fast, free model that's good at structured generation.
// Override with GROQ_MODEL if Groq retires this alias.
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/// Decide which provider to use. Explicit AI_PROVIDER wins; otherwise we
/// prefer Groq when its key is present (it's the recommended default), and
/// fall back to Gemini. Re-evaluated on every call so a dev can flip the env
/// without restarting.
function resolveProvider() {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit === "groq" || explicit === "gemini") return explicit;
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) return "groq";
  return "gemini";
}

// ─── Gemini client (lazy) ─────────────────────────────────────────────────────
let _geminiClient = null;
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    const err = new Error(
      "AI generation is disabled: set GEMINI_API_KEY in the backend .env (free key at https://aistudio.google.com/apikey), or use Groq by setting GROQ_API_KEY + AI_PROVIDER=groq"
    );
    err.status = 503;
    throw err;
  }
  if (!_geminiClient) {
    _geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return _geminiClient;
}

// ─── Response schema (Gemini) ─────────────────────────────────────────────────
//
// The Gemini schema vocabulary is a subset of JSON Schema. It does NOT support
// numeric/length constraints, so server-side Joi validation re-runs after the
// model returns — that catches anything the schema couldn't express (e.g. "MCQ
// needs at least 2 options").
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: "The generated questions, in the order they should appear.",
      items: {
        type: Type.OBJECT,
        properties: {
          question_text: {
            type: Type.STRING,
            description:
              "The full question text. Plain text — no markdown headings, no leading numbering ('1.', 'Q1:'). Phrase as a complete, unambiguous question.",
          },
          question_type: {
            type: Type.STRING,
            enum: ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"],
            description:
              "MCQ = multiple choice, TRUE_FALSE = true/false, SHORT_ANSWER = free text the teacher will grade manually.",
          },
          points: {
            type: Type.NUMBER,
            description:
              "Suggested point value. 1 for basic recall, 2-3 for application or analysis. Default to 1 when unsure.",
          },
          topic: {
            type: Type.STRING,
            description:
              "A short topic label (1-3 words) the teacher can use to filter the bank. Be consistent — re-use the same label across related questions.",
          },
          difficulty: {
            type: Type.STRING,
            enum: ["easy", "medium", "hard"],
            description:
              "easy = direct recall, medium = application, hard = synthesis or multi-step reasoning.",
          },
          explanation: {
            type: Type.STRING,
            description:
              "One-to-two sentence explanation of why the correct answer is correct. Shown to students after submission. May be empty for SHORT_ANSWER.",
          },
          options: {
            type: Type.ARRAY,
            description:
              "For MCQ: 3-5 plausible options, exactly one marked correct. For TRUE_FALSE: exactly two options ('True', 'False'), one correct. For SHORT_ANSWER: an empty array.",
            items: {
              type: Type.OBJECT,
              properties: {
                option_text: {
                  type: Type.STRING,
                  description: "The choice text shown to the student.",
                },
                is_correct: {
                  type: Type.BOOLEAN,
                  description: "Whether this option is the correct answer.",
                },
              },
              required: ["option_text", "is_correct"],
            },
          },
        },
        required: [
          "question_text",
          "question_type",
          "points",
          "topic",
          "difficulty",
          "explanation",
          "options",
        ],
      },
    },
  },
  required: ["questions"],
};

// Plain-text schema hint for providers (Groq) that use JSON mode but don't
// enforce a schema at decode time. The word "JSON" must appear in the prompt
// for OpenAI-compatible JSON mode to engage.
const JSON_SHAPE_HINT = `Return ONLY a single JSON object — no markdown, no prose — of exactly this shape:
{
  "questions": [
    {
      "question_text": "string — plain text, no leading numbering",
      "question_type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER",
      "points": number,
      "topic": "string — 1-3 word label, reused across related questions",
      "difficulty": "easy" | "medium" | "hard",
      "explanation": "string — 1-2 sentences on why the answer is correct (may be empty for SHORT_ANSWER)",
      "options": [ { "option_text": "string", "is_correct": boolean } ]
    }
  ]
}
Rules: For MCQ provide 3-5 options with exactly ONE is_correct: true. For TRUE_FALSE provide exactly two options ("True" and "False") with one correct. For SHORT_ANSWER "options" MUST be an empty array [].`;

// ─── System instruction (shared) ──────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are an expert educator helping a teacher generate quiz questions for their course. You produce questions that are:

• Pedagogically sound — each question targets a specific learning objective. Avoid trick questions; avoid "all of the above" / "none of the above" patterns.
• Unambiguous — exactly one defensible correct answer for MCQ and True/False. If a question could be interpreted two ways, rewrite it.
• Plausibly distractor-rich — wrong MCQ options should be wrong for a clear reason a student might genuinely believe, not obvious throwaways. A student who half-studied should find them tempting.
• Calibrated to the requested difficulty — easy = recall, medium = application of a concept, hard = synthesis across multiple ideas or multi-step reasoning.
• Self-contained — the question stem must include everything needed to answer. Do not reference "the lecture", "the slide", "the figure above", or "this week's reading".
• Topic-tagged consistently — when generating multiple questions in the same batch, reuse the same short topic label for related questions so the bank filter stays useful.

When the teacher provides source material, ground every question in the material — do not invent facts the material doesn't support. When no material is provided, generate questions on the requested topic from your general knowledge, and prefer broadly-agreed-upon content (textbook definitions) over edge cases.

For each question, write a short explanation (1-2 sentences) of why the correct answer is correct. This is shown to the student on the review screen after they submit, and helps them learn from mistakes.

Always return the requested number of questions; if you cannot generate that many distinct, high-quality questions on the topic, return as many good ones as you can rather than padding with weak duplicates.`;

// ─── Shared prompt builder ────────────────────────────────────────────────────
/// Assemble the user turn from the teacher's instruction + optional source
/// material. Provider-agnostic — both Gemini and Groq consume the same text.
function buildUserTurn({ prompt, sourceMaterial, count, questionTypes, difficulty, courseTitle }) {
  const parts = [];
  if (courseTitle) parts.push(`Course: ${courseTitle}`);
  parts.push(`Number of questions: ${count}`);
  if (questionTypes && questionTypes.length > 0) {
    parts.push(`Question types to use (mix as appropriate): ${questionTypes.join(", ")}`);
  } else {
    parts.push("Question types: choose an appropriate mix");
  }
  if (difficulty && difficulty !== "mixed") {
    parts.push(`Target difficulty: ${difficulty}`);
  } else {
    parts.push("Difficulty: mix of easy / medium / hard, roughly balanced");
  }
  parts.push("");
  parts.push(`Teacher's instructions:\n${prompt}`);
  if (sourceMaterial && sourceMaterial.trim()) {
    parts.push("");
    parts.push(
      "Source material — ground every question in this content; do not invent facts it doesn't support:"
    );
    parts.push("---");
    parts.push(sourceMaterial.trim());
    parts.push("---");
  }
  return parts.join("\n");
}

// ─── Gemini implementation ────────────────────────────────────────────────────
async function generateWithGemini(userTurn) {
  const client = getGeminiClient();

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: userTurn,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Gemini's structured-output mode: the decoder is constrained at every
        // token so the response is guaranteed to parse as JSON of this shape.
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });
  } catch (e) {
    const msg = e?.message || String(e);
    const err = new Error(`Gemini API error: ${msg}`);
    if (/quota|rate limit|429/i.test(msg)) err.status = 429;
    else err.status = 502;
    throw err;
  }

  const text = response?.text;
  const parsed = parseQuestionsJson(text);
  const um = response.usageMetadata || {};
  return {
    questions: parsed.questions,
    usage: {
      input_tokens: um.promptTokenCount,
      output_tokens: um.candidatesTokenCount,
      total_tokens: um.totalTokenCount,
    },
  };
}

// ─── Groq implementation (OpenAI-compatible, no extra dependency) ─────────────
async function generateWithGroq(userTurn) {
  const key = process.env.GROQ_API_KEY;
  if (!key || !key.trim()) {
    const err = new Error(
      "AI generation is disabled: set GROQ_API_KEY in the backend .env (free key at https://console.groq.com/keys)"
    );
    err.status = 503;
    throw err;
  }
  const model = (process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL).trim();

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
        temperature: 0.7,
        max_tokens: 8192,
        // OpenAI-compatible JSON mode — the model must emit a valid JSON
        // object. The schema isn't enforced at decode time (unlike Gemini),
        // so JSON_SHAPE_HINT describes the shape and Joi re-validates after.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${SYSTEM_INSTRUCTION}\n\n${JSON_SHAPE_HINT}` },
          { role: "user", content: userTurn },
        ],
      }),
    });
  } catch (e) {
    // Network-level failure (DNS, timeout). Retryable on the client.
    const err = new Error(`Groq API error: ${e?.message || String(e)}`);
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const err = new Error(`Groq API error (${res.status}): ${bodyText || res.statusText}`);
    // 429 = rate limited (retryable); 401/403 = bad key (not retryable, but we
    // surface as 502 so it reads as a server-config problem to the teacher).
    if (res.status === 429) err.status = 429;
    else err.status = 502;
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

/// Shared parse + shape guard for either provider's text payload. Throws a
/// 502-shaped error on anything unexpected so the route returns a readable
/// message instead of an unhandled exception.
function parseQuestionsJson(text) {
  if (!text) {
    const err = new Error(
      "Model returned no content — try a shorter prompt or fewer questions"
    );
    err.status = 502;
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const err = new Error("Model response was not valid JSON");
    err.status = 502;
    err.cause = e;
    throw err;
  }
  if (!parsed || !Array.isArray(parsed.questions)) {
    const err = new Error("Model response missing `questions` array");
    err.status = 502;
    throw err;
  }
  return parsed;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate N quiz questions via the configured provider (Groq or Gemini).
 *
 * Stable exported shape so the route handler and frontend stay unchanged
 * regardless of which provider runs.
 *
 * @param {object}   args
 * @param {string}   args.prompt          Teacher's natural-language instruction.
 * @param {string?}  args.sourceMaterial  Optional pasted material (chapter, notes, etc.).
 * @param {number}   args.count           Target number of questions (1-25).
 * @param {string[]} args.questionTypes   Subset of ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"].
 * @param {string?}  args.difficulty      "easy" | "medium" | "hard" | "mixed".
 * @param {string?}  args.courseTitle     For prompt context only.
 * @returns {Promise<{questions: object[], usage: object}>}
 */
export async function generateQuizQuestions(args) {
  const userTurn = buildUserTurn(args);
  const provider = resolveProvider();
  return provider === "groq"
    ? generateWithGroq(userTurn)
    : generateWithGemini(userTurn);
}

/// Cheap check the route handler uses to short-circuit with 503 if no key is
/// configured for the selected provider. Avoids constructing a request that
/// can't succeed.
export function isAiEnabled() {
  const provider = resolveProvider();
  const key =
    provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  return !!(key && key.trim());
}
