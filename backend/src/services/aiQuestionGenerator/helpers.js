export function resolveProvider() {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit === "groq" || explicit === "gemini") return explicit;
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) return "groq";
  return "gemini";
}

export function parseQuestionsJson(text) {
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

export function isAiEnabled() {
  const provider = resolveProvider();
  const key =
    provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  return !!(key && key.trim());
}
