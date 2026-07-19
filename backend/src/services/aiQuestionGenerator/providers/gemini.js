import { GoogleGenAI } from "@google/genai";
import { RESPONSE_SCHEMA, SYSTEM_INSTRUCTION } from "../promptBuilders.js";
import { parseQuestionsJson } from "../helpers.js";

const GEMINI_MODEL_ID = "gemini-2.0-flash";

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

export async function generateWithGemini(userTurn) {
  const client = getGeminiClient();

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: userTurn,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
