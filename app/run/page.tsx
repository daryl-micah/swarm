"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RunView, StageRail } from "@/components/run/RunView";
import { useRun } from "@/components/run/useRun";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { frames, normalizeVerdict, type Frame } from "@/lib/run";

// measured on recorded runs: ~0.65 s and ~$0.0006 of Nano per persona, plus ~25 s / $0.01 of research and segments
const SEC_PER_PERSONA = 0.65;
const estimate = (n: number) => ({ min: Math.max(1, Math.round((25 + n * SEC_PER_PERSONA) / 60)), usd: (0.01 + n * 0.0006).toFixed(2) });

export default function RunPage() {
  const { s, patch, consume, applyVerdict } = useRun();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [pasting, setPasting] = useState(false);
  const [audience, setAudience] = useState("");
  const [n, setN] = useState(200);
  const [held, setHeld] = useState(false); // last error was a rate limit, not a failure
  const recorded = useRef<Frame[]>([]);
  // ?demo=<token> unlocks up to 1,000 personas and bypasses the public limits
  const [demo, setDemo] = useState("");
  useEffect(() => setDemo(new URLSearchParams(location.search).get("demo") ?? ""), []);
  const headers = { "content-type": "application/json", ...(demo ? { "x-demo-token": demo } : {}) };

  const post = async (path: string, body: object) => {
    const r = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
    setHeld(r.status === 429);
    if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? `${path} failed with ${r.status}`);
    return r;
  };

  // live frames, also kept so the visitor can download the run
  async function* live(body: object) {
    for await (const f of frames((await post("/api/swarm", body)).body!)) {
      recorded.current.push(f);
      yield f;
    }
  }

  const start = () => {
    recorded.current = [];
    consume(live(pasting ? { text, audience, n } : { url, audience, n }));
  };

  const judge = async () => {
    patch({ phase: "judging", error: "" });
    try {
      const r = await post("/api/verdict", { sections: s.sections, reactions: [...s.reactions.values()] });
      applyVerdict(normalizeVerdict(await r.json()));
    } catch (e: any) {
      patch({ phase: "done", error: e.message });
    }
  };

  const rerun = () => {
    recorded.current.push({ event: "rerun", data: {} });
    consume(live({ sections: s.rewritten, segments: s.segments, seed: s.seed, n: s.personas.length }), true);
  };

  const download = () => {
    const extra: Frame[] = s.verdict ? [{ event: "verdict", data: s.verdict }] : [];
    const body = [...recorded.current, ...extra].map((f) => `event: ${f.event}\ndata: ${JSON.stringify(f.data)}\n\n`).join("");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([body], { type: "text/event-stream" })), download: `swarm-${s.seed}.sse` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const busy = s.phase === "running" || s.phase === "rerunning" || s.phase === "judging";
  const est = estimate(n);
  const remaining = s.personas.length - s.reactions.size;
  const extractFailed = /extract|no content|sections/i.test(s.error) && !pasting;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="label text-muted-foreground">Run your page</p>
        <h1 className="h2">Put your landing page in front of {n} customers.</h1>
        <p className="max-w-prose text-muted-foreground">
          Swarm researches your market, builds buyer segments, and has each simulated customer read your page. Results are simulated, directional signal. Want to see a finished run first? <Link className="link" href="/evidence">Replay a recorded one</Link>.
        </p>
      </header>

      <Card className="flex flex-col gap-6">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(); }}>
          {pasting ? (
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="page-text" className="label">Page text (markdown, headings split sections)</label>
              <textarea id="page-text" required rows={6} className="input h-auto py-2 data" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
            </div>
          ) : (
            <Input label="Landing page URL" type="url" required placeholder="https://yourproduct.com" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} />
          )}
          <Input label="Who is it for (optional)" placeholder="freelance designers" value={audience} onChange={(e) => setAudience(e.target.value)} disabled={busy} />
          <div className="flex flex-col gap-1">
            <Input label={`Personas: ${n}`} type="range" min={10} max={demo ? 1000 : 200} step={10} value={n} onChange={(e) => setN(+e.target.value)} disabled={busy} />
            <span className="data text-muted-foreground">≈ {est.min} min · ≈ ${est.usd} of inference</span>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Button type="submit" loading={s.phase === "running"}>{s.phase === "running" ? "Running…" : "Run swarm"}</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setPasting((p) => !p)}>{pasting ? "Use a URL instead" : "Paste text instead"}</Button>
          </div>
        </form>
        {s.error && (
          <Alert
            status={held ? "held" : "blocked"}
            action={extractFailed ? <Button variant="secondary" onClick={() => setPasting(true)}>Paste text instead</Button> : <Button variant="secondary" onClick={s.phase === "verdict" ? rerun : s.phase === "done" ? judge : start}>Retry</Button>}
          >
            {s.error}
          </Alert>
        )}
      </Card>

      {s.phase === "idle" && !s.personas.length ? (
        <p className="small text-muted-foreground">Research sources, segments and the swarm appear here once you run a page. Public runs are capped at 200 personas and 4 runs per hour.</p>
      ) : (
        <>
          <div className="lg:sticky top-0 z-10 bg-background py-4 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-64"><StageRail s={s} /></div>
            {(s.phase === "done" || s.phase === "verdict" || s.phase === "rerun") && <Button variant="secondary" onClick={download}>Download run</Button>}
          </div>
          <RunView s={s} onJudge={judge} onRerun={rerun} etaSeconds={remaining * SEC_PER_PERSONA} />
        </>
      )}
    </main>
  );
}
