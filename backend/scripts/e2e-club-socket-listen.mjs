/**
 * Independent listener proving the club socket events actually arrive.
 * Logs in as a real user via HTTP (separate from any browser session —
 * proves this isn't reusing the applicant's cookie jar), opens its own
 * socket.io-client connection with that token, and records every
 * club:* / notification:new event it receives over a fixed window.
 *
 * Run this, then perform the real action (browser click, or the
 * paired e2e script) while it's listening.
 */
import { io } from 'socket.io-client';

const BASE = process.env.E2E_API_BASE_URL || 'http://localhost:4000/api';
const SOCKET_URL = process.env.E2E_SOCKET_URL || 'http://localhost:4000';
const PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';
const email = process.argv[2];
const listenSeconds = Number(process.argv[3] || 20);

if (!email) {
  console.error('usage: node e2e-club-socket-listen.mjs <email> [seconds]');
  process.exit(1);
}

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}
function parseSetCookie(cookies) {
  const jar = {};
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const [name, ...rest] = pair.split('=');
    jar[name.trim()] = rest.join('=');
  }
  return jar;
}

async function main() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`login failed: ${res.status} ${JSON.stringify(body)}`);
  const cookies = parseSetCookie(extractCookies(res));
  const token = cookies.auth_token;
  if (!token) throw new Error('no auth_token cookie in login response');
  console.log(`[listener] authenticated as ${email} (${body.user?.role}), opening socket...`);

  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  const events = [];
  const record = (name) => (payload) => {
    const entry = { name, payload, t: Date.now() };
    events.push(entry);
    console.log(`[EVENT] ${name}`, JSON.stringify(payload));
  };

  for (const name of [
    'notification:new',
    'club:joined',
    'club:join-rejected',
    'club:approved',
    'club:removed',
    'club:promoted',
    'club:invited',
  ]) {
    socket.on(name, record(name));
  }

  socket.on('connect', () => console.log(`[listener] socket connected, id=${socket.id}, listening ${listenSeconds}s...`));
  socket.on('connect_error', (e) => console.error('[listener] connect_error', e.message));

  await new Promise((resolve) => setTimeout(resolve, listenSeconds * 1000));
  socket.disconnect();
  console.log(`\n[listener] window closed. ${events.length} event(s) received.`);
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
