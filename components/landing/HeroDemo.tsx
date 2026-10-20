"use client";
import { useEffect, useState } from "react";
import { SwarmGrid } from "@/components/SwarmGrid";
import { useRun } from "@/components/run/useRun";
import { Badge } from "@/components/ui/Badge";
import { StatusRow } from "@/components/ui/StatusRow";
import { frames, paced, tally } from "@/lib/run";

type Props = { file: string; site: string; objections: { theme: string; count: number }[]; footer: string; lift: { before: number; after: number; control: number } };

// Replays a recorded run (not a script) in three panels: page → swarm → verdict.
export function HeroDemo({ file, site, objections, footer, lift }: Props) {
  const { s, consume } = useRun();
  const [take, setTake] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    fetch(`/evidence/${file}`, { signal: ac.signal })
      .then((r) => consume(paced(frames(r.body!), reduce ? 5000 : 14, ac.signal), false, ac.signal))
      .catch(() => {});
    return () => ac.abort();
  }, [file, take, consume]);

  const c = tally(s.reactions.values());
  const sources = s.log.filter((l) => l.source);
  const done = s.phase === "done";

  return (
    <div className="bg-card border border-border rounded-card shadow-media">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        <section className="p-6 flex flex-col gap-3 min-w-0" aria-label="Stage 1, page">
          <span className="label text-muted-foreground">01 · Page</span>
          <h3>Research</h3>
          <div className="data flex flex-col gap-1 min-h-48">
            <span>tavily.extract {site}</span>
            {s.sections.length > 0 && <span className="text-muted-foreground">→ {s.sections.length} sections</span>}
            {sources.slice(0, 6).map((l, i) => <span key={i} className="truncate text-muted-foreground">+ {l.source!.title}</span>)}
          </div>
        </section>
        <section className="p-6 flex flex-col gap-3 min-w-0" aria-label="Stage 2, swarm">
          <span className="label text-muted-foreground">02 · Swarm</span>
          <h3>Simulate</h3>
          {s.personas.length ? <SwarmGrid personas={s.personas} reactions={s.reactions} /> : <div className="bg-muted rounded-card h-32" aria-hidden />}
          <div className="flex flex-wrap gap-2" aria-live="polite">
            <Badge status="ok">BUY {c.buy}</Badge><Badge status="held">MAYBE {c.maybe}</Badge><Badge status="blocked">BOUNCED {c.bounce}</Badge>
          </div>
        </section>
        <section className="p-6 flex flex-col gap-3 min-w-0" aria-label="Stage 3, verdict">
          <span className="label text-muted-foreground">03 · Verdict</span>
          <h3>Rewrite and re-run</h3>
          <ol className={`flex flex-col gap-2 transition-opacity ${done ? "opacity-100" : "opacity-40"}`}>
            {objections.slice(0, 3).map((o) => (
              <li key={o.theme}><StatusRow status="held" label={`×${o.count}`} className="py-2"><span className="small">{o.theme}</span></StatusRow></li>
            ))}
          </ol>
          <p className={`data transition-opacity ${done ? "opacity-100" : "opacity-40"}`}>
            buy {lift.before}% → <span className="font-semibold">{lift.after}%</span> after rewrite · control {lift.control}%
          </p>
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-3">
        <span className="data text-muted-foreground mr-auto">{footer}</span>
        <button type="button" onClick={() => setTake((t) => t + 1)} className="btn btn-secondary">Replay</button>
      </div>
    </div>
  );
}
