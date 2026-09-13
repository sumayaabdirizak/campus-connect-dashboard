/**
 * Free a TCP listen port once (before `npm run dev`).
 * Windows: netstat + taskkill. POSIX: lsof/fuser when available.
 * Safe to no-op when the port is already free.
 */
import { execSync } from "node:child_process";

const port = Number(process.argv[2] || process.env.PORT || 4000);
if (!Number.isFinite(port) || port <= 0) {
  console.error("[free-port] invalid port");
  process.exit(1);
}

function pidsListeningOnWindows(p) {
  try {
    const out = execSync(`netstat -ano`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      // Match *:4000 or 0.0.0.0:4000 or [::]:4000
      if (!new RegExp(`[:\\]]${p}\\s`).test(line) && !line.includes(`:${p} `)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function freeWindows(p) {
  const pids = pidsListeningOnWindows(p);
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
      console.log(`[free-port] killed PID ${pid} (was listening on ${p})`);
    } catch (e) {
      console.warn(`[free-port] could not kill PID ${pid}:`, e?.message || e);
    }
  }
  if (pids.length === 0) console.log(`[free-port] port ${p} is free`);
}

function freePosix(p) {
  try {
    const out = execSync(`lsof -tiTCP:${p} -sTCP:LISTEN`, { encoding: "utf8" }).trim();
    const pids = out.split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
        console.log(`[free-port] sent SIGTERM to PID ${pid} (port ${p})`);
      } catch (e) {
        console.warn(`[free-port] could not signal PID ${pid}:`, e?.message || e);
      }
    }
    if (pids.length === 0) console.log(`[free-port] port ${p} is free`);
  } catch {
    console.log(`[free-port] port ${p} is free (or lsof unavailable)`);
  }
}

if (process.platform === "win32") freeWindows(port);
else freePosix(port);
