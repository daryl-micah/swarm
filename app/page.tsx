"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { SwarmGrid, type Reaction } from "@/components/SwarmGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Persona, Segment } from "@/lib/personas";

type Verdict = { objections: { theme: string; count: number }[]; rewrites: { index: number; text: string }[]; gaps?: string[] };
type Phase = "idle" | "running" | "done" | "judging" | "verdict" | "rerunning" | "rerun";

// POST and call onEvent for each SSE event
async function stream(body: object, headers: HeadersInit, onEvent: (e: string, d: any) => void) {
  const r = await fetch("/api/swarm", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? `swarm ${r.status}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop()!;
    for (const f of frames) {
      const [, e, d] = /^event: (.*)\ndata: (.*)$/s.exec(f) ?? [];
      if (e) onEvent(e, JSON.parse(d));
    }
  }
}

const score = (m: Map<number, Reaction>, n: number) => (n ? Math.round((100 * [...m.values()].filter((r) => r.verdict === "buy").length) / n) : 0);

export default function Page() {
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [n, setN] = useState(200);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Map<number, Reaction>>(new Map());
  const [verdict, setVerdict] = useState<Verdict>();
  const [before, setBefore] = useState<number>();
  const [newSections, setNewSections] = useState<string[]>([]);
  const seed = useRef(0);
  // ?demo=<token> unlocks up to 1,000 personas and bypasses the public limits
  const [demo, setDemo] = useState("");
  useEffect(() => setDemo(new URLSearchParams(location.search).get("demo") ?? ""), []);
  const demoHeaders: HeadersInit = demo ? { "x-demo-token": demo } : {};

  const run = async (body: object, rerun = false) => {
    setError("");
    setReactions(new Map());
    if (!rerun) { setLog([]); setSegments([]); setPersonas([]); setVerdict(undefined); setBefore(undefined); }
    setPhase(rerun ? "rerunning" : "running");
    const acc = new Map<number, Reaction>();
    let flush = 0;
    try {
      await stream(body, demoHeaders, (e, d) => {
        if (e === "research") setLog((l) => [...l, d.source ? `${d.line}  ${d.source.title}` : d.line]);
        if (e === "sections") setSections(d);
        if (e === "segments") setSegments(d);
        if (e === "personas") { seed.current = d.seed; setPersonas(d.personas); }
        if (e === "reaction") {
          acc.set(d.id, d);
          if (!flush) flush = window.setTimeout(() => { flush = 0; setReactions(new Map(acc)); }, 100);
        }
        if (e === "error") throw new Error(d.message);
      });
      setReactions(new Map(acc));
      setPhase(rerun ? "rerun" : "done");
    } catch (e: any) {
      setError(e.message);
      setPhase("idle");
    }
  };

  const start = () => run({ url, audience, n });

  const judge = async () => {
    setPhase("judging");
    try {
      const r = await fetch("/api/verdict", { method: "POST", headers: { "content-type": "application/json", ...demoHeaders }, body: JSON.stringify({ sections, reactions: [...reactions.values()] }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `verdict ${r.status}`);
      setVerdict(await r.json());
      setPhase("verdict");
    } catch (e: any) {
      setError(e.message);
      setPhase("done");
    }
  };

  const rerun = () => {
    const next = [...sections];
    for (const w of verdict!.rewrites) next[w.index] = w.text;
    setBefore(score(reactions, personas.length));
    setNewSections(next);
    run({ sections: next, segments, seed: seed.current, n }, true);
  };

  const drops = useMemo(() => {
    const d = sections.map(() => 0);
    reactions.forEach((r) => { if (r.verdict !== "buy" && d[r.dropSection] !== undefined) d[r.dropSection]++; });
    return d;
  }, [reactions, sections]);

  const count = (v: string) => [...reactions.values()].filter((r) => r.verdict === v).length;
  const recent = [...reactions.values()].filter((r) => r.objection).slice(-5).reverse();
  const busy = phase === "running" || phase === "rerunning";
  const after = phase === "rerun" ? score(reactions, personas.length) : undefined;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-16 flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="label">Swarm</p>
        <h1>User research takes weeks.<br />Swarm takes a minute.</h1>
        <p className="max-w-[65ch] text-muted-foreground">
          Paste a landing page. Hundreds of simulated customers, grounded in live market research, react to it, then Swarm rewrites the weak sections and re-runs the same personas. Results are simulated, directional signal.
        </p>
      </header>

      <Card>
        <form className="grid gap-4 md:grid-cols-[2fr_2fr_1fr_auto] items-end" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <Input label="Landing page URL" type="url" required placeholder="https://yourproduct.com" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} />
          <Input label="Who is it for (optional)" placeholder="freelance designers" value={audience} onChange={(e) => setAudience(e.target.value)} disabled={busy} />
          <Input label={`Personas: ${n}`} type="range" min={10} max={demo ? 1000 : 200} step={10} value={n} onChange={(e) => setN(+e.target.value)} disabled={busy} />
          <Button type="submit" loading={busy}>{busy ? "Running…" : "Run swarm"}</Button>
        </form>
        {error && (
          <div role="alert" className="status-blocked mt-4 pl-4 flex items-center gap-4">
            <Badge status="blocked" /> <span className="small">{error}</span>
            <Button variant="secondary" onClick={start}>Retry</Button>
          </div>
        )}
      </Card>

      {phase === "idle" && !error && <p className="small text-muted-foreground">Research sources, segments and the swarm appear here once you run a page.</p>}

      {log.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3>Research</h3>
          <Card className="data flex flex-col gap-1 max-h-48 overflow-auto">{log.map((l, i) => <div key={i}>{l}</div>)}</Card>
        </section>
      )}

      {segments.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3>Segments</h3>
          <ul className="grid gap-4 md:grid-cols-3">
            {segments.map((s) => (
              <li key={s.name}><Card className="h-full"><p className="small font-semibold">{s.name}</p><p className="data text-muted-foreground">weight {s.weight}</p></Card></li>
            ))}
          </ul>
        </section>
      )}

      {personas.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="mr-auto">Swarm</h3>
            <Badge status="ok">BUY <span className="data">{count("buy")}</span></Badge>
            <Badge status="held">MAYBE <span className="data">{count("maybe")}</span></Badge>
            <Badge status="blocked">BOUNCED <span className="data">{count("bounce")}</span></Badge>
          </div>
          <Card><SwarmGrid names={personas.map((p) => p.name)} reactions={reactions} /></Card>
          <ul className="data text-muted-foreground flex flex-col gap-1" aria-live="polite">
            {recent.map((r) => <li key={r.id}>{personas[r.id]?.name}: {r.objection}</li>)}
          </ul>
        </section>
      )}

      {sections.length > 0 && reactions.size > 0 && (
        <section className="flex flex-col gap-4">
          <h3>Where they dropped off</h3>
          <Heatmap sections={sections} drops={drops} />
        </section>
      )}

      {phase === "done" && <div><Button onClick={judge}>Get verdict and rewrite</Button></div>}
      {phase === "judging" && <Card className="bg-muted">Clustering objections and rewriting…</Card>}

      {verdict && (
        <section className="flex flex-col gap-4">
          <h2>Verdict</h2>
          <ol className="flex flex-col gap-2">
            {verdict.objections.map((o) => (
              <li key={o.theme} className="status-held bg-card border border-border rounded-card pl-6 pr-4 py-3 flex gap-4">
                <span className="small flex-1">{o.theme}</span><span className="data">{o.count}</span>
              </li>
            ))}
          </ol>
          {!!verdict.gaps?.length && (
            <Card>
              <p className="label mb-3">Gaps the page does not answer</p>
              <ul className="small list-disc pl-6">{verdict.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </Card>
          )}
          {verdict.rewrites.map((w) => (
            <Card key={w.index}>
              <p className="label mb-3">Rewrite · section {w.index}</p>
              <p className="small whitespace-pre-wrap">{w.text}</p>
            </Card>
          ))}
          {phase === "verdict" && <div><Button onClick={rerun}>Re-run same personas on rewrite</Button></div>}
        </section>
      )}

      {phase === "rerun" && before !== undefined && after !== undefined && (
        <section className="flex flex-col gap-4">
          <h2>Before / after</h2>
          <Card className="data flex items-baseline gap-8">
            <span>{before}% buy</span><span>→</span><span>{after}% buy</span>
            <span className="label">{after - before >= 0 ? "+" : ""}{after - before} pts · same {personas.length} personas, seed {seed.current}</span>
          </Card>
        </section>
      )}
    </main>
  );
}
