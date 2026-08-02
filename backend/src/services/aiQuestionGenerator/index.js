import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { buildUserTurn } from './promptBuilders.js';
import { resolveProvider, isAiEnabled } from './helpers.js';
import { fitArgsForGroq } from './fitSourceForGroq.js';
import { generateWithGroq } from './providers/groq.js';
import { generateWithGemini } from './providers/gemini.js';

// #region agent log
const DEBUG_LOG = path.resolve(
  process.cwd().endsWith('backend') ? '../debug-c4b419.log' : 'debug-c4b419.log'
);
function dbg(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId: 'c4b419',
    runId: 'ui-verify',
    hypothesisId,
    location: 'aiQuestionGenerator/index.js',
    message,
    data,
    timestamp: Date.now(),
  });
  try {
    appendFileSync(DEBUG_LOG, `${line}\n`);
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7804/ingest/31870779-47f0-4312-b278-1c6da891de23', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'c4b419',
    },
    body: line,
  }).catch(() => {});
}
// #endregion

export async function generateQuizQuestions(args) {
  const provider = resolveProvider();
  let fitted = args;
  let sourceTruncated = false;
  let fitMeta = null;

  if (provider === 'groq') {
    const fit = fitArgsForGroq(args);
    fitted = fit.args;
    sourceTruncated = fit.truncated;
    fitMeta = {
      sourceLenBefore: fit.sourceLenBefore,
      sourceLenAfter: fit.sourceLenAfter,
      estRequestedTpm: fit.estRequestedTpm,
    };
  }

  // #region agent log
  dbg('D', 'generate after fit', {
    provider,
    sourceTruncated,
    sourceLen: String(args.sourceMaterial || '').length,
    ...fitMeta,
  });
  // #endregion

  const userTurn = buildUserTurn(fitted);
  try {
    const result =
      provider === 'groq'
        ? await generateWithGroq(userTurn)
        : await generateWithGemini(userTurn);
    // #region agent log
    dbg('E', 'generate success', {
      provider,
      questionCount: result.questions?.length ?? 0,
      usage: result.usage || null,
    });
    // #endregion
    return { ...result, sourceTruncated };
  } catch (e) {
    // #region agent log
    dbg('E', 'generate failed', {
      provider,
      status: e?.status || null,
      message: String(e?.message || e).slice(0, 240),
    });
    // #endregion
    throw e;
  }
}

export { isAiEnabled };
