"use client";
import { useCallback, useEffect, useState } from "react";
import { rng } from "@/lib/personas";
import SwarmGrid, { Verdict } from "./SwarmGrid";

const N = 200;
const OBJECTIONS = ["No pricing visible", "Who else uses this?", "Unclear what it replaces", "Too many steps to try"];

// scripted sample run: replays a canned outcome, not a live call
function script(seed: number): Verdict[] {
  const r = rng(seed);
  return Array.from({ length: N }, () => { const x = r(); return x < 0.18 ? "buy" : x < 0.5 ? "maybe" : "bounce"; });
}

export default function HeroDemo() {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(0);
  const plan = script(42);

  const replay = useCallback(() => { setDone(0); setRun((n) => n + 1); }, []);
  useEffect(() => {
    const t = setInterval(() => setDone((d) => (d >= N ? d : d + 4)), 80);
    return () => clearInterval(t);
  }, [run]);

  const shown = plan.map((v, i) => (i < done ? v : null));
  const count = (v: Verdict) => shown.filter((x) => x === v).length;
  const finished = done >= N;

  return (
    <div className="rounded-card border border-border bg-card" style={{ boxShadow: "var(--media-shadow)" }}>
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        <section className="p-5">
          <p className="font-mono text-xs text-muted-fg">01 · Page</p>
          <h3 className="mt-1 font-medium">Extract</h3>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5">{`tavily.extract(url)
→ 7 sections
tavily.search ×3
→ 11 sources`}</pre>
        </section>
        <section className="p-5">
          <p className="font-mono text-xs text-muted-fg">02 · Swarm</p>
          <h3 className="mt-1 font-medium">Simulate</h3>
          <div className="mt-3"><SwarmGrid verdicts={shown} /></div>
          <p className="mt-3 font-mono text-xs text-muted-fg">
            {done}/{N} · <span className="text-green">{count("buy")} buy</span> · <span className="text-amber">{count("maybe")} maybe</span> · <span className="text-red">{count("bounce")} bounce</span>
          </p>
        </section>
        <section className="p-5">
          <p className="font-mono text-xs text-muted-fg">03 · Verdict</p>
          <h3 className="mt-1 font-medium">Rewrite &amp; re-run</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {OBJECTIONS.map((o, i) => (
              <li key={o} className={`rounded-md bg-muted px-3 py-2 ${i < 2 ? "status-bar-blocked" : "status-bar-held"}`}>{o}</li>
            ))}
          </ul>
          <p className={`mt-3 font-mono text-sm transition-opacity ${finished ? "opacity-100" : "opacity-30"}`}>
            sample lift: <span className="text-accent">18% → 31%</span>
          </p>
        </section>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="font-mono text-xs text-muted-fg">simulated · directional signal</span>
        <button onClick={replay} className="font-mono text-xs text-accent hover:underline">↻ replay</button>
      </div>
    </div>
  );
}
