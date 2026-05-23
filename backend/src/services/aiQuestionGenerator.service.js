import { GoogleGenAI, Type } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// AI question generation service.
//
// Uses Google's Gemini API (free tier: 15 req/min, 1500 req/day on
// gemini-2.0-flash) to draft quiz questions from a teacher's prompt + optional
// source material. The model returns a strict JSON object matching our
// response schema — no markdown wrapping, no "here you go" preamble — which
// we then surface to the teacher for review in a preview dialog. The
// teacher cherry-picks which rows actually persist via the existing bulk
// import endpoint, so generation has zero database side-effects.
//
// Why Gemini + responseSchema (vs free-form prose with JSON.parse):
//   - Gemini's `responseSchema` is a hard constraint at decode time. The
//     decoder can only emit tokens consistent with the schema, so we never
//     get back "Sure! Here are your questions: ```json…" or a half-emitted
//     bracket. This matches the guarantee we'd get from Claude's
//     `output_config.format` — we get the same shape from either provider.
//   - The free tier is wide enough for a real classroom (1500 req/day),
//     and gemini-2.0-flash is fast enough that the teacher doesn't sit
//     waiting more than a few seconds for 20 questions.
// ─────────────────────────────────────────────────────────────────────────────

// gemini-2.0-flash is the current free-tier sweet spot: fast, supports
// responseSchema, and good enough at structured generation for educational
// content. The pinned version means we lock to known behavior — no surprise
// drift mid-semester if Google ships a new alias.
const MODEL_ID = "gemini-2.0-flash";

/// Lazy client — created on first call so the rest of the app keeps booting
/// when GEMINI_API_KEY isn't set. We re-check the env on every request so a
/// dev who sets the key after `npm start` doesn't need to restart.
let _client = null;
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    const err = new Error(
      "AI generation is disabled: set GEMINI_API_KEY in the backend .env (get a free key at https://aistudio.google.com/apikey)"
    );
    err.status = 503;
    throw err;
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: key });
  }
  return _client;
}

// ─── Response schema ────────────────────────────────────────────────────────
//
// Mirrors `CreateBankQuestionInput` on the frontend. The Gemini schema
// vocabulary is a subset of JSON Schema — supports `Type.OBJECT`,
// `Type.ARRAY`, `Type.STRING`, `Type.NUMBER`, `Type.BOOLEAN`, plus `enum`,
// `properties`, `required`, `items`, `description`. It does NOT support
// numeric/length constraints (`minimum`, `maxLength`, etc.), so server-side
// Joi validation re-runs after the model returns — that catches anything
// the schema couldn't express (e.g. "MCQ needs at least 2 options").
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

// ─── System instruction ─────────────────────────────────────────────────────
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

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate N quiz questions via Gemini.
 *
 * Same exported shape as the previous Anthropic implementation so the route
 * handler and frontend stay unchanged across the provider swap.
 *
 * @param {object}   args
 * @param {string}   args.prompt          Teacher's natural-language instruction.
 * @param {string?}  args.sourceMaterial  Optional pasted material (chapter, notes, etc.).
 * @param {number}   args.count           Target number of questions (1-25).
 * @param {string[]} args.questionTypes   Subset of ["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]
 *                                        the teacher wants in the mix. Empty = model decides.
 * @param {string?}  args.difficulty      "easy" | "medium" | "hard" | "mixed".
 * @param {string?}  args.courseTitle     For prompt context only.
 * @returns {Promise<{questions: object[], usage: object}>}
 */
export async function generateQuizQuestions({
  prompt,
  sourceMaterial,
  count,
  questionTypes,
  difficulty,
  courseTitle,
}) {
  const client = getClient();

  // Assemble the user turn from the teacher's instruction + optional source
  // material. The system instruction stays constant (pedagogical guidance);
  // anything per-request belongs in the user content.
  const userParts = [];
  if (courseTitle) {
    userParts.push(`Course: ${courseTitle}`);
  }
  userParts.push(`Number of questions: ${count}`);
  if (questionTypes && questionTypes.length > 0) {
    userParts.push(
      `Question types to use (mix as appropriate): ${questionTypes.join(", ")}`
    );
  } else {
    userParts.push("Question types: choose an appropriate mix");
  }
  if (difficulty && difficulty !== "mixed") {
    userParts.push(`Target difficulty: ${difficulty}`);
  } else {
    userParts.push("Difficulty: mix of easy / medium / hard, roughly balanced");
  }
  userParts.push("");
  userParts.push(`Teacher's instructions:\n${prompt}`);
  if (sourceMaterial && sourceMaterial.trim()) {
    userParts.push("");
    userParts.push(
      "Source material — ground every question in this content; do not invent facts it doesn't support:"
    );
    userParts.push("---");
    userParts.push(sourceMaterial.trim());
    userParts.push("---");
  }
  const userTurn = userParts.join("\n");

  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL_ID,
      contents: userTurn,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Together these two fields are Gemini's "structured output" mode:
        // the decoder is constrained at every token to keep the running
        // prefix valid against the schema, so the response text is
        // guaranteed to parse as JSON of the right shape.
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // Slightly above the default temperature — quiz questions benefit
        // from some variety in phrasing and distractor choice. Schema mode
        // still constrains the shape, so we're only loosening word choice.
        temperature: 0.7,
        // Generous cap for ~20 questions with ~5 options + explanations.
        // gemini-2.0-flash supports up to 8192; we don't need the headroom
        // but it gives the model room if explanations run long.
        maxOutputTokens: 8192,
      },
    });
  } catch (e) {
    // Gemini surfaces auth, rate-limit, and quota errors with descriptive
    // messages. We re-wrap with a status code so the route handler can
    // pick the right HTTP code without parsing prose.
    const msg = e?.message || String(e);
    const err = new Error(`Gemini API error: ${msg}`);
    // 429 quotas are retryable; bad keys are not. Heuristic match — the SDK
    // doesn't yet expose a typed status field consistently across versions.
    if (/quota|rate limit|429/i.test(msg)) err.status = 429;
    else if (/api key|unauthor|401|403/i.test(msg)) err.status = 502;
    else err.status = 502;
    throw err;
  }

  // `response.text` is the convenience accessor for the first candidate's
  // text part. With responseSchema set, this is guaranteed to be JSON.
  const text = response?.text;
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
    // Should be impossible with responseSchema, but defensive coding pays
    // for itself here — better to surface a clear 502 than to blow up the
    // controller with an unhandled parse error.
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

  // Normalize the usage shape to the same keys the previous provider used,
  // so any telemetry the controller logs stays consistent across swaps.
  // Gemini fields: promptTokenCount, candidatesTokenCount, totalTokenCount.
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

/// Cheap check the route handler uses to short-circuit with 503 if the key
/// isn't configured. Avoids constructing a request that can't succeed.
export function isAiEnabled() {
  const key = process.env.GEMINI_API_KEY;
  return !!(key && key.trim());
}
