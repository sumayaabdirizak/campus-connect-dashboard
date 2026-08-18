import type { DraftQuestion } from '../quiz-builder/types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface QuizPreviewData {
  title: string;
  description: string;
  mode: 'online' | 'offline';
  is_draft: boolean;
  duration_minutes: number;
  passing_score: number;
  questions: DraftQuestion[];
  totalPoints: number;
  createdByName: string;
}

/// Shared HTML for both Print and Download on the "Add new quiz" preview
/// panel — a letterhead-style summary of the quiz as currently configured,
/// including any locally-staged (not yet saved) questions.
export function buildQuizPreviewHtml(data: QuizPreviewData): string {
  const questionsHtml =
    data.questions.length === 0
      ? `<p class="empty">No questions added yet</p>`
      : data.questions
          .map((q, idx) => {
            const optionsHtml =
              q.question_type === 'SHORT_ANSWER'
                ? `<p class="short-answer-note">Short answer — graded manually</p>`
                : `<div class="options">${q.options
                    .map(
                      (o) =>
                        `<div class="option${o.is_correct ? ' correct' : ''}">${o.is_correct ? '✓ ' : ''}${escapeHtml(o.option_text || '—')}</div>`
                    )
                    .join('')}</div>`;
            return `
              <div class="question">
                <div class="q-head">
                  <span class="q-num">${idx + 1}.</span>
                  <span class="q-text">${escapeHtml(q.question_text || 'Untitled question')}</span>
                  <span class="q-pts">${q.points} pt${q.points === 1 ? '' : 's'}</span>
                </div>
                ${optionsHtml}
              </div>`;
          })
          .join('');

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(data.title || 'New Quiz')}</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
        .letterhead { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { font-weight: 700; font-size: 18px; color: #2563eb; }
        .doc-type { font-weight: 700; font-size: 20px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta-row { color: #666; font-size: 13px; margin-bottom: 20px; }
        .cols { display: flex; gap: 40px; margin-bottom: 20px; font-size: 13px; }
        .cols div { flex: 1; }
        .cols h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: #666; margin: 0 0 6px; }
        .cols p { margin: 2px 0; }
        hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
        .question { margin-bottom: 18px; page-break-inside: avoid; }
        .q-head { display: flex; gap: 8px; align-items: baseline; font-weight: 600; margin-bottom: 6px; }
        .q-pts { margin-left: auto; font-weight: 400; color: #666; font-size: 13px; }
        .options { padding-left: 24px; }
        .option { margin-bottom: 4px; font-size: 14px; color: #444; }
        .option.correct { color: #059669; font-weight: 600; }
        .short-answer-note { padding-left: 24px; font-size: 13px; color: #888; font-style: italic; margin: 0; }
        .empty { color: #888; font-style: italic; }
        .totals { margin-top: 24px; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; max-width: 280px; margin-left: auto; font-size: 13px; }
        .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
        .totals .row.total { font-weight: 700; border-top: 1px solid #ddd; margin-top: 4px; padding-top: 6px; }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <span class="brand">Campus Connect</span>
        <span class="doc-type">Quiz</span>
      </div>
      <h1>${escapeHtml(data.title || 'New Quiz')}</h1>
      <div class="meta-row">${data.is_draft ? 'Draft' : 'Published'} · ${data.mode === 'offline' ? 'Offline (printed handout)' : 'Online'} · Date: ${today}</div>

      <div class="cols">
        <div>
          <h3>Created By</h3>
          <p>${escapeHtml(data.createdByName)}</p>
          <p>Campus Connect LMS</p>
        </div>
        <div>
          <h3>Quiz Details</h3>
          <p>Duration: ${data.duration_minutes} min</p>
          <p>Pass Score: ${data.passing_score}%</p>
        </div>
      </div>
      <hr>

      ${questionsHtml}

      <div class="totals">
        <div class="row"><span>Questions</span><strong>${data.questions.length}</strong></div>
        <div class="row"><span>Duration</span><strong>${data.duration_minutes} min</strong></div>
        <div class="row"><span>Pass Score</span><strong>${data.passing_score}%</strong></div>
        <div class="row total"><span>Total Points</span><strong>${data.totalPoints}</strong></div>
      </div>
    </body>
    </html>
  `;
}

/// Prints via a hidden iframe (no popup blocker, no new tab) — same
/// technique used by the offline-quiz handout printer.
export function printQuizPreview(data: QuizPreviewData) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  win.document.open();
  win.document.write(buildQuizPreviewHtml(data));
  win.document.close();

  win.onafterprint = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 60_000);
  }, 100);
}

/// Downloads the same preview as a standalone .html file the teacher can
/// open, share, or print-to-PDF themselves.
export function downloadQuizPreview(data: QuizPreviewData) {
  const html = buildQuizPreviewHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.title || 'quiz').replace(/[^a-z0-9]+/gi, '_')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
