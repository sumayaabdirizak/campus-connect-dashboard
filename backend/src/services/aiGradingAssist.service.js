import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const ASSIGNMENT_UPLOAD_DIR = './uploads/assignments';

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/// Schema the model must conform to. Lives in `output_config.format` so the
/// model returns parsed JSON deterministically — no string-matching, no JSON
/// repair fallback.
const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    suggested_grade: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description: 'Numeric grade 0-100. Use the rubric in the assignment description if present; otherwise base on overall quality.',
    },
    suggested_feedback: {
      type: 'string',
      description: 'Constructive feedback to the student. 80-200 words. Highlights strengths, weaknesses, and one concrete improvement.',
    },
    reasoning_summary: {
      type: 'string',
      description: 'One sentence summarising why this grade was chosen — surfaced to the teacher as audit context, NOT to the student.',
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'How confident the model is in this assessment.',
    },
  },
  required: ['suggested_grade', 'suggested_feedback', 'reasoning_summary', 'confidence'],
  additionalProperties: false,
};

/// Resolve the submission's `content_url` to something the model can read.
/// - PDF file on disk → base64 document block
/// - HTTPS link → fetch text/html or text/* and pass as text block (best effort)
/// - Anything else → null (caller falls back to URL-only context)
async function buildSubmissionBlock(contentUrl) {
  if (!contentUrl) return null;

  // Locally-stored uploaded PDF?
  if (/\/uploads\/assignments\//.test(contentUrl)) {
    const filename = contentUrl.split('/').pop();
    if (!filename) return null;
    const filepath = path.join(ASSIGNMENT_UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    if (filename.toLowerCase().endsWith('.pdf')) {
      const data = fs.readFileSync(filepath).toString('base64');
      return {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data },
      };
    }
    // Text-y files (.md, .txt, .py, etc.) — read inline up to 200 KB.
    try {
      const stat = fs.statSync(filepath);
      if (stat.size <= 200 * 1024) {
        const text = fs.readFileSync(filepath, 'utf8');
        return { type: 'text', text: `<student-submission filename="${filename}">\n${text}\n</student-submission>` };
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  // Remote URL: try to fetch text content. Skip if non-text or oversized.
  try {
    const res = await fetch(contentUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') || '').toLowerCase();
    if (!mime.startsWith('text/') && !mime.includes('json') && !mime.includes('javascript')) {
      return null;
    }
    const text = await res.text();
    const truncated = text.length > 60_000 ? text.slice(0, 60_000) + '\n…[truncated]' : text;
    return { type: 'text', text: `<student-submission url="${contentUrl}">\n${truncated}\n</student-submission>` };
  } catch {
    return null;
  }
}

/**
 * Ask Claude to grade a single submission. Returns a parsed suggestion or
 * throws a descriptive Error. The caller stores nothing — this is a draft for
 * the teacher to accept or discard.
 *
 * @param {{
 *   assignment: { title: string; description: string | null; lateWindowMinutes: number },
 *   submission: { content_url: string; is_late: boolean; submitted_at: Date },
 *   student: { full_name: string }
 * }} args
 */
export async function suggestGradeForSubmission({ assignment, submission, student }) {
  const c = getClient();
  if (!c) {
    throw new Error('AI grading is not configured — set ANTHROPIC_API_KEY on the backend');
  }

  const submissionBlock = await buildSubmissionBlock(submission.content_url);

  const systemPrompt = [
    'You are a constructive university-level grading assistant.',
    "Your job: read the assignment description (which doubles as a rubric) and the student's submission, then propose a numeric grade and feedback the teacher can review.",
    'You are NEVER the final grader — your output is a draft that a teacher will accept, edit, or discard.',
    'Be honest: do not inflate grades, but also do not punish trivial issues. Acknowledge what the student did well before listing what to improve.',
    'Calibrate to the rubric in the description when it exists; otherwise use a balanced judgement against typical expectations.',
  ].join(' ');

  const userBlocks = [];
  userBlocks.push({
    type: 'text',
    text:
      `<assignment>\n<title>${assignment.title}</title>\n` +
      `<description>\n${assignment.description ?? '(no description provided)'}\n</description>\n` +
      `<late-window-minutes>${assignment.lateWindowMinutes}</late-window-minutes>\n` +
      `</assignment>\n\n` +
      `<context>\n<student-name>${student.full_name}</student-name>\n` +
      `<submitted-at>${new Date(submission.submitted_at).toISOString()}</submitted-at>\n` +
      `<was-late>${submission.is_late ? 'yes' : 'no'}</was-late>\n</context>`,
  });
  if (submissionBlock) {
    userBlocks.push(submissionBlock);
  } else {
    userBlocks.push({
      type: 'text',
      text: `<submission-url>${submission.content_url}</submission-url>\n(Could not inline the submission — base your assessment on the URL only.)`,
    });
  }
  userBlocks.push({
    type: 'text',
    text:
      'Return the grade (0-100), feedback for the student (80-200 words), a one-sentence reasoning summary for the teacher, and a confidence level.',
  });

  const response = await c.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: SUGGESTION_SCHEMA },
    },
    system: systemPrompt,
    messages: [{ role: 'user', content: userBlocks }],
  });

  // With output_config.format = json_schema, the first text block is the
  // model's parsed JSON. Pull it out and parse defensively.
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('AI returned no text content');
  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (e) {
    throw new Error(`AI returned unparseable JSON: ${e.message}`);
  }

  return {
    suggestedGrade: Math.max(0, Math.min(100, Math.round(parsed.suggested_grade))),
    suggestedFeedback: String(parsed.suggested_feedback ?? '').trim(),
    reasoningSummary: String(parsed.reasoning_summary ?? '').trim(),
    confidence: parsed.confidence,
    model: response.model,
    usage: response.usage,
  };
}
