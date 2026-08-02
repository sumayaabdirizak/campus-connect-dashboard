import { buildUserTurn } from './promptBuilders.js';
import { resolveProvider, isAiEnabled } from './helpers.js';
import { fitArgsForGroq } from './fitSourceForGroq.js';
import { generateWithGroq } from './providers/groq.js';
import { generateWithGemini } from './providers/gemini.js';

export async function generateQuizQuestions(args) {
  const provider = resolveProvider();
  let fitted = args;
  let sourceTruncated = false;

  if (provider === 'groq') {
    const fit = fitArgsForGroq(args);
    fitted = fit.args;
    sourceTruncated = fit.truncated;
  }

  const userTurn = buildUserTurn(fitted);
  const result =
    provider === 'groq'
      ? await generateWithGroq(userTurn)
      : await generateWithGemini(userTurn);
  return { ...result, sourceTruncated };
}

export { isAiEnabled };
