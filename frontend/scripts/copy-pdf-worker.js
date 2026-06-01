#!/usr/bin/env node
/**
 * Copies the pdf.js worker from node_modules into public/ so the app can
 * serve it locally instead of fetching it from a CDN. Must stay in sync with
 * the installed pdfjs-dist version — this script runs automatically on every
 * `npm install` via the `postinstall` hook in package.json.
 */

const { copyFileSync, mkdirSync } = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

try {
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log('[copy-pdf-worker] pdf.worker.min.mjs → public/');
} catch (e) {
  console.warn('[copy-pdf-worker] Could not copy pdf.js worker:', e.message);
}
