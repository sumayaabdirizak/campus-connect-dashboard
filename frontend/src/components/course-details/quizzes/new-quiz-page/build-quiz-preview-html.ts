import type { DraftQuestion } from '../quiz-builder/types';
import {
  buildPaperSections,
  optionLetter,
  paperOptions,
  paperQuizTitle,
  type PaperSection
} from './quiz-paper-format';

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

function renderSection(section: PaperSection): string {
  const items = section.items
    .map(({ number, question }) => {
      const heading = `<p class="q-text"><strong>${number}.</strong> ${escapeHtml(question.question_text || 'Untitled question')}</p>`;
      if (!section.isChoice) {
        return `
        <div class="question short">
          ${heading}
          <div class="answer-lines"><div></div><div></div><div></div></div>
        </div>`;
      }
      const optionsHtml = paperOptions(question)
        .map(
          (o, oi) =>
            `<div class="option">${optionLetter(oi)}. ${escapeHtml(o.option_text || '—')}</div>`
        )
        .join('');
      return `
        <div class="question">
          ${heading}
          <div class="options">${optionsHtml}</div>
        </div>`;
    })
    .join('');

  return `
    <section class="section">
      <h2>Section ${section.letter}: ${escapeHtml(section.title)}</h2>
      ${items}
    </section>`;
}

/// Shared HTML for Print / Download — printed exam paper layout.
export function buildQuizPreviewHtml(data: QuizPreviewData): string {
  const body =
    data.questions.length === 0
      ? `<p class="empty">No questions added yet</p>`
      : buildPaperSections(data.questions).map(renderSection).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(paperQuizTitle(data.title))}</title>
      <style>
        @page { margin: 18mm; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          max-width: 780px;
          margin: 0 auto;
          padding: 24px 20px;
          color: #111;
          font-size: 14px;
          line-height: 1.45;
        }
        .brand-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 18px;
        }
        .brand { font-weight: 700; font-size: 15px; color: #3b82f6; }
        .doc-type { font-weight: 700; font-size: 15px; }
        .letterhead { display: flex; justify-content: center; margin-bottom: 12px; }
        .letterhead img { height: 52px; width: auto; }
        .paper-title {
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 16px;
        }
        .student-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .line {
          display: inline-block;
          min-width: 180px;
          border-bottom: 1px solid #111;
          vertical-align: baseline;
        }
        .line.id { min-width: 140px; }
        hr.rule {
          border: none;
          border-top: 1px solid #111;
          margin: 0 0 20px;
        }
        .section { margin-bottom: 28px; page-break-inside: avoid; }
        .section h2 {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 14px;
        }
        .question { margin-bottom: 16px; page-break-inside: avoid; }
        .q-text { margin: 0 0 6px; }
        .options { padding-left: 22px; }
        .option { margin-bottom: 3px; }
        .answer-lines { padding-left: 22px; margin-top: 8px; }
        .answer-lines div {
          border-bottom: 1px solid #9ca3af;
          height: 22px;
          margin-bottom: 6px;
        }
        .empty { color: #888; font-style: italic; text-align: center; padding: 40px 0; }
        @media print {
          .brand-row { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="brand-row">
        <span class="brand">Campus Connect</span>
        <span class="doc-type">Quiz</span>
      </div>

      <div class="letterhead">
        <img src="${escapeHtml(`${window.location.origin}/assets/img/brand/jazeera-university.jpg`)}" alt="Jazeera University" />
      </div>
      <h1 class="paper-title">${escapeHtml(paperQuizTitle(data.title))}</h1>
      <div class="student-row">
        <span>Name: <span class="line"></span></span>
        <span>ID: <span class="line id"></span></span>
      </div>
      <hr class="rule" />

      ${body}
    </body>
    </html>
  `;
}

/// Prints via a hidden iframe (no popup blocker, no new tab).
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

/// Downloads the same preview as a standalone .html file.
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
