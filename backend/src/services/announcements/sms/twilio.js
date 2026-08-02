export function redactPhone(phone) {
  const s = String(phone ?? "").replace(/\s+/g, "");
  if (s.length <= 4) return "***";
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

export function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export const TWILIO_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.TWILIO_REQUEST_TIMEOUT_MS ?? 15_000),
);

export const TWILIO_MAX_ATTEMPTS = Math.max(
  1,
  Math.min(5, Number(process.env.TWILIO_MAX_ATTEMPTS ?? 3)),
);

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} to E.164 preferred
 * @param {string} body
 */
export async function sendViaTwilio(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: String(from), Body: body.slice(0, 1400) });

  let lastErr;
  for (let attempt = 1; attempt <= TWILIO_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TWILIO_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: controller.signal,
      });
      if (res.ok) return;
      const text = await res.text().catch(() => "");
      const err = new Error(`Twilio HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (res.status < 500 || res.status >= 600) throw err;
      lastErr = err;
    } catch (err) {
      lastErr = err;
      const isAbort = err?.name === "AbortError";
      const isNetwork = err?.name === "TypeError" || err?.code === "ECONNRESET";
      const isHttp5xx = typeof err?.message === "string" && /Twilio HTTP 5\d\d/.test(err.message);
      if (!(isAbort || isNetwork || isHttp5xx)) throw err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < TWILIO_MAX_ATTEMPTS) {
      const base = 250 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 100);
      await sleep(base + jitter);
    }
  }
  throw lastErr ?? new Error("Twilio request failed after retries");
}
