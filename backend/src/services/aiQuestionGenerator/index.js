import { buildUserTurn } from "./promptBuilders.js";
import { resolveProvider, isAiEnabled } from "./helpers.js";
import { generateWithGroq } from "./providers/groq.js";
import { generateWithGemini } from "./providers/gemini.js";

export async function generateQuizQuestions(args) {
  const userTurn = buildUserTurn(args);
  const provider = resolveProvider();
  return provider === "groq"
    ? generateWithGroq(userTurn)
    : generateWithGemini(userTurn);
}

export { isAiEnabled };
