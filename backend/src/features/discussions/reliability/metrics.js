const counters = new Map();
const timers = new Map();

function incCounter(name, by = 1) {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

function observeDuration(name, durationMs) {
  const bucket = timers.get(name) ?? { count: 0, sumMs: 0, maxMs: 0 };
  bucket.count += 1;
  bucket.sumMs += durationMs;
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  timers.set(name, bucket);
}

export function metricCount(name, by = 1) {
  incCounter(name, by);
}

export function metricTimerStart() {
  return Date.now();
}

export function metricTimerEnd(name, startedAt) {
  const elapsed = Math.max(0, Date.now() - startedAt);
  observeDuration(name, elapsed);
  return elapsed;
}

export function getDiscussionMetricsSnapshot() {
  const counterObj = Object.fromEntries(counters.entries());
  const timerObj = {};
  for (const [name, value] of timers.entries()) {
    timerObj[name] = {
      count: value.count,
      avgMs: value.count > 0 ? Number((value.sumMs / value.count).toFixed(2)) : 0,
      maxMs: value.maxMs,
    };
  }
  return {
    counters: counterObj,
    timers: timerObj,
    capturedAt: new Date().toISOString(),
  };
}

