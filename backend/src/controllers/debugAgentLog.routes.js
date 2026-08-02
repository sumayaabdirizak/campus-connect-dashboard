import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';

const router = Router();
const DEBUG_LOG = path.resolve(process.cwd(), '../debug-c4b419.log');

/** Dev-only ingest so the browser can write the same NDJSON debug file. */
router.post('/agent-log', (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const line = JSON.stringify({
      sessionId: 'c4b419',
      runId: body.runId || 'ui-verify',
      hypothesisId: body.hypothesisId || 'F',
      location: body.location || 'fe',
      message: body.message || 'fe-log',
      data: body.data ?? null,
      timestamp: Date.now(),
    });
    appendFileSync(DEBUG_LOG, `${line}\n`);
  } catch {
    /* ignore */
  }
  res.status(204).end();
});

export default router;
