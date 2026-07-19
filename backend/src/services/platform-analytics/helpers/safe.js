export async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
