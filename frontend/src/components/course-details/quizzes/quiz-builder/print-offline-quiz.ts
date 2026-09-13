import type { Quiz, QuizQuestion } from '@/lib/course-details/services/quizzes-types';

/// Resolves once every `<img>` in `doc` has loaded (or failed), or `timeoutMs`
/// elapses — whichever comes first, so a slow/broken image never blocks
/// printing forever.
function waitForImages(doc: Document, timeoutMs: number): Promise<void> {
  const images = Array.from(doc.images);
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let remaining = pending.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };
    pending.forEach((img) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    setTimeout(resolve, timeoutMs);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/// Opens a self-contained printable handout in a new tab: questions with
/// blank A/B/C/D options (no answers revealed — safe to hand out), followed
/// by a separate Answer Key section for the teacher's own grading copy.
export function printOfflineQuiz(quiz: Quiz, questions: QuizQuestion[]) {
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);

  const questionsHtml = sorted
    .map((q, idx) => {
      const optionsHtml =
        q.question_type === 'SHORT_ANSWER'
          ? `<div class="blank-lines"><div></div><div></div><div></div></div>`
          : `<div class="options">${q.options
              .map(
                (o, i) =>
                  `<div class="option"><span class="letter">${String.fromCharCode(65 + i)}.</span> ${escapeHtml(o.option_text)}</div>`
              )
              .join('')}</div>`;
      return `
        <div class="question">
          <div class="q-head">
            <span class="q-num">${idx + 1}.</span>
            <span class="q-text">${escapeHtml(q.question_text)}</span>
            <span class="q-pts">${q.points} pt${q.points === 1 ? '' : 's'}</span>
          </div>
          ${optionsHtml}
        </div>`;
    })
    .join('');

  const answerKeyHtml = sorted
    .map((q, idx) => {
      const correctIdx = q.options?.findIndex((o) => o.is_correct) ?? -1;
      const answer = q.question_type === 'SHORT_ANSWER'
        ? '(manual)'
        : correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '—';
      return `<div class="key-item"><strong>${idx + 1}.</strong> ${answer}</div>`;
    })
    .join('');

  // A hidden iframe avoids popup blockers entirely (no new window/tab is
  // created) — print() runs against the iframe's own document, then we tear
  // it down once the print dialog closes.
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
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(quiz.title)}</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
        .letterhead { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .letterhead img { height: 52px; width: auto; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .intro { font-size: 14px; color: #333; margin-bottom: 12px; white-space: pre-wrap; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .question { margin-bottom: 22px; page-break-inside: avoid; }
        .q-head { display: flex; gap: 8px; align-items: baseline; font-weight: 600; margin-bottom: 8px; }
        .q-pts { margin-left: auto; font-weight: 400; color: #666; font-size: 13px; }
        .options { padding-left: 24px; }
        .option { margin-bottom: 6px; font-size: 14px; }
        .letter { font-weight: 600; margin-right: 4px; }
        .blank-lines div { border-bottom: 1px solid #999; height: 24px; margin: 0 24px 8px; }
        .answer-key { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; page-break-before: always; }
        .answer-key h2 { font-size: 16px; margin-bottom: 12px; }
        .key-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 16px; }
        .key-item { font-size: 14px; }
        @media print { .answer-key { page-break-before: always; } }
      </style>
    </head>
    <body>
      <div class="letterhead">
        <img src="${escapeHtml(`${window.location.origin}/assets/img/brand/jazeera-university.jpg`)}" alt="Jazeera University" />
      </div>
      <h1>${escapeHtml(quiz.title)}</h1>
      ${quiz.description?.trim() ? `<p class="intro">${escapeHtml(quiz.description.trim())}</p>` : ''}
      <div class="meta">${quiz.duration_minutes} min · ${sorted.length} question${sorted.length === 1 ? '' : 's'} · ${sorted.reduce((s, q) => s + q.points, 0)} pts total</div>
      ${questionsHtml}
      <div class="answer-key">
        <h2>Answer Key — Teacher Copy Only</h2>
        <div class="key-grid">${answerKeyHtml}</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();

  // Clean up once the print dialog is dismissed (afterprint fires in the
  // iframe's window).
  win.onafterprint = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  // The letterhead logo loads over the network — printing before it lands
  // ships a page with a missing/partial image. Wait for it (or a timeout).
  waitForImages(win.document, 2000).then(() => {
    win.focus();
    win.print();
    // Long-delay safety net only — must not fire while the (often async,
    // non-blocking) native print dialog is still open, or the print job
    // loses its source document. `afterprint` above is the real cleanup;
    // this just prevents an orphaned iframe if that event never fires.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 60_000);
  });
}
