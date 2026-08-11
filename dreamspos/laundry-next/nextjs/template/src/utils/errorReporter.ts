// Lightweight error reporter utility
// - Logs to console
// - Stores recent errors in localStorage for later inspection
// - Provides a hook to forward errors to a backend if needed

export type ErrorReport = {
  message: string
  stack?: string
  componentStack?: string
  url: string
  userAgent: string
  time: string
  extra?: Record<string, unknown>
}

const STORAGE_KEY = 'app:lastErrors'
const MAX_STORED = 10

export function reportError(err: unknown, extra?: Record<string, unknown>): ErrorReport {
  const error = normalizeError(err)
  // Lightweight de-duplication: avoid reporting the same error repeatedly within a short window
  const dedupeKey = buildDedupeKey(error, extra)
  if (shouldSkipDuplicate(dedupeKey)) {
    return {
      message: error.message,
      stack: error.stack,
      componentStack: typeof extra?.componentStack === 'string' ? (extra!.componentStack as string) : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
      extra,
    }
  }
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: typeof extra?.componentStack === 'string' ? (extra!.componentStack as string) : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    time: new Date().toISOString(),
    extra,
  }

  // Console logging
  // Keep a single line summary plus verbose object for easy grep
  // eslint-disable-next-line no-console
  console.error('[AppError]', report.message, { report })

  // Persist a small rolling buffer for support/debug
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ErrorReport[]
    const next = [report, ...prev].slice(0, MAX_STORED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }

  // Hook: forward to your monitoring backend (Sentry, LogRocket, custom)
  // Example (disabled by default):
  // fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })

  return report
}

export function getStoredErrorReports(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ErrorReport[]
  } catch {
    return []
  }
}

function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  try {
    return new Error(JSON.stringify(err))
  } catch {
    return new Error('Unknown error')
  }
}

// --- Internal de-duplication helpers ---
const DEDUPE_WINDOW_MS = 3000
let lastKey: string | null = null
let lastTime = 0

function buildDedupeKey(error: Error, extra?: Record<string, unknown>): string {
  const source = typeof extra?.source === 'string' ? extra.source : 'unknown'
  const message = error.message || 'unknown'
  const topStackLine = (error.stack || '').split('\n')[1] || ''
  const componentStack = typeof extra?.componentStack === 'string' ? extra.componentStack : ''
  return [source, message, topStackLine.trim(), componentStack.trim()].join('|')
}

function shouldSkipDuplicate(key: string): boolean {
  const now = Date.now()
  if (key === lastKey && now - lastTime < DEDUPE_WINDOW_MS) {
    return true
  }
  lastKey = key
  lastTime = now
  return false
}
