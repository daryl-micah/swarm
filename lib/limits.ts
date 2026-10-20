// In-memory limits for the public deployment (single instance).
// A request carrying `x-demo-token: $DEMO_TOKEN` bypasses all of them and may run up to 1,000 personas.
export const MAX_PUBLIC_N = 200;
export const IP_PER_HOUR = 4; // swarm runs per IP
export const VERDICTS_PER_HOUR = 10;
export const DAILY_RUNS = 60;
export const MAX_ACTIVE = 2; // Nano is capped at 100 req/min, so concurrent runs throttle each other

const hits = new Map<string, number[]>();
const daily = { day: "", runs: 0 };
let active = 0;

const deny = (status: number, error: string) => Response.json({ error }, { status });

function perHour(key: string, max: number, now: number) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= max) return false;
  hits.set(key, [...recent, now]);
  return true;
}

// n = persona count for a swarm run; omit for a verdict call. Returns a Response to send back, or a release() to call when the run ends.
export function admit(req: Request, n?: number, now = Date.now()): Response | { release: () => void } {
  const token = process.env.DEMO_TOKEN;
  if (token && req.headers.get("x-demo-token") === token) return { release() {} };

  if (n !== undefined && n > MAX_PUBLIC_N) return deny(400, `Public runs are capped at ${MAX_PUBLIC_N} personas.`);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

  if (n === undefined) return perHour(`v:${ip}`, VERDICTS_PER_HOUR, now) ? { release() {} } : deny(429, "Too many verdict requests. Try again later.");

  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) Object.assign(daily, { day, runs: 0 });
  if (daily.runs >= DAILY_RUNS) return deny(429, "Today's demo budget is used up. Try again tomorrow.");
  if (active >= MAX_ACTIVE) return deny(429, "Swarm is busy with other runs. Try again in a minute.");
  if (!perHour(`s:${ip}`, IP_PER_HOUR, now)) return deny(429, `Limit is ${IP_PER_HOUR} runs per hour per visitor.`);

  daily.runs++;
  active++;
  let released = false;
  return { release: () => { if (!released) { released = true; active--; } } };
}

if (process.argv[1]?.endsWith("limits.ts")) {
  process.env.DEMO_TOKEN = "t";
  const req = (ip: string, token?: string) =>
    new Request("http://x", { headers: { "x-forwarded-for": ip, ...(token ? { "x-demo-token": token } : {}) } });
  const ok = (r: unknown) => !(r instanceof Response);
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const t0 = Date.parse("2026-10-20T10:00:00Z");

  assert(!ok(admit(req("1.1.1.1"), 201, t0)), "over-cap n rejected");
  assert(ok(admit(req("1.1.1.1", "t"), 1000, t0)), "demo token allows 1000");
  assert(!ok(admit(req("1.1.1.1", "bad"), 1000, t0)), "wrong token rejected");

  const a = admit(req("2.2.2.2"), 100, t0) as { release: () => void };
  const b = admit(req("3.3.3.3"), 100, t0) as { release: () => void };
  assert(ok(a) && ok(b), "two concurrent runs admitted");
  assert(!ok(admit(req("4.4.4.4"), 100, t0)), "third concurrent run rejected");
  a.release(); a.release(); // double release must not double-decrement
  const c = admit(req("4.4.4.4"), 100, t0) as { release: () => void };
  assert(ok(c), "slot freed after release");
  assert(!ok(admit(req("5.5.5.5"), 100, t0)), "still only 2 active after double release");
  b.release(); c.release();

  for (let i = 0; i < IP_PER_HOUR - 1; i++) (admit(req("6.6.6.6"), 10, t0) as { release: () => void }).release();
  (admit(req("6.6.6.6"), 10, t0) as { release: () => void }).release();
  assert(!ok(admit(req("6.6.6.6"), 10, t0)), "per-IP hourly limit");
  assert(ok(admit(req("6.6.6.6"), 10, t0 + 3_700_000)), "per-IP window slides");
  console.log("limits ok");
}
