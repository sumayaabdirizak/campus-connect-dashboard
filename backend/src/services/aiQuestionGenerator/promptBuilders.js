import { Type } from "@google/genai";

// Gemini schema mapping
export const RESPONSE_SCHEMA = {
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

// Plain-text schema hint for Groq
export const JSON_SHAPE_HINT = `Return ONLY a single JSON object — no markdown, no prose — of exactly this shape:
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

// Shared system instructions
export const SYSTEM_INSTRUCTION = `You are an expert educator helping a teacher generate quiz questions for their course. You produce questions that are:

• Pedagogically sound — each question targets a specific learning objective. Avoid trick questions; avoid "all of the above" / "none of the above" patterns.
• Unambiguous — exactly one defensible correct answer for MCQ and True/False. If a question could be interpreted two ways, rewrite it.
• Plausibly distractor-rich — wrong MCQ options should be wrong for a clear reason a student might genuinely believe, not obvious throwaways. A student who half-studied should find them tempting.
• Calibrated to the requested difficulty — easy = recall, medium = application of a concept, hard = synthesis across multiple ideas or multi-step reasoning.
• Self-contained — the question stem must include everything needed to answer. Do not reference "the lecture", "the slide", "the figure above", or "this week's reading".
• Topic-tagged consistently — when generating multiple questions in the same batch, reuse the same short topic label for related questions so the bank filter stays useful.

Source material is ALWAYS provided and is the ONLY allowed knowledge source. Ground every question strictly in that material — do not invent facts, do not use general world knowledge, and do not introduce concepts the material does not support. When the teacher asks for an exact count, return that many questions grounded in the material (keep explanations short). Only return fewer if the material truly cannot support more distinct questions.

For each question, write a short explanation (1 sentence) of why the correct answer is correct, citing ideas from the source. This is shown to the student on the review screen after they submit, and helps them learn from mistakes.

Always prefer grounded quality; never pad with weak duplicates or unsupported content.`;

// Assemble the prompt parameters
export function buildUserTurn({ prompt, sourceMaterial, count, questionTypes, difficulty, courseTitle }) {
  const parts = [];
  if (courseTitle) parts.push(`Course: ${courseTitle}`);
  parts.push(`Number of questions: ${count}`);
  parts.push(
    `IMPORTANT: The "questions" array MUST contain exactly ${count} items — not fewer. Prefer shorter explanations (one sentence) so the full set fits.`
  );
  if (questionTypes && questionTypes.length > 0) {
    parts.push(
      `Question types required (use only these): ${questionTypes.join(", ")}. Follow any exact per-type counts in the teacher's instructions.`
    );
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
  parts.push("");
  parts.push(
    "Source material (REQUIRED) — use ONLY this content. Do not use outside knowledge:"
  );
  parts.push("---");
  parts.push(String(sourceMaterial || "").trim());
  parts.push("---");
  return parts.join("\n");
}
