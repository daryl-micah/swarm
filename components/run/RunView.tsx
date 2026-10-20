"use client";
import { useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { SwarmGrid } from "@/components/SwarmGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { StatusRow } from "@/components/ui/StatusRow";
import { buyPct, sectionTitle, tally, type Reaction } from "@/lib/run";
import type { RunState } from "./useRun";

type Props = {
  s: RunState;
  onJudge?: () => void; // live only: the replay viewer has no buttons
  onRerun?: () => void;
  control?: number; // buy % of the unchanged page re-run on the same seed, when recorded
  etaSeconds?: number;
};

const STAGES = ["Research", "Segments", "Swarm", "Verdict", "Re-run"] as const;

function stages(s: RunState): ("pending" | "active" | "done")[] {
  const swarmDone = ["done", "judging", "verdict", "rerunning", "rerun"].includes(s.phase);
  const st = (done: boolean, active: boolean) => (done ? "done" : active ? "active" : "pending");
  const running = s.phase === "running";
  return [
    st(s.segments.length > 0, running && !s.segments.length && !s.sections.length),
    st(s.segments.length > 0, running && s.sections.length > 0 && !s.segments.length),
    st(swarmDone, running && s.personas.length > 0),
    st(!!s.verdict, s.phase === "judging"),
    st(s.phase === "rerun", s.phase === "rerunning"),
  ];
}

export function StageRail({ s }: { s: RunState }) {
  const st = stages(s);
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Run progress">
      {STAGES.map((name, i) => (
        <li key={name} aria-current={st[i] === "active" ? "step" : undefined} className={`flex flex-col gap-1 border-t-2 pt-2 ${st[i] === "pending" ? "border-border text-muted-foreground" : st[i] === "active" ? "border-accent" : "border-foreground"}`}>
          <span className="label">0{i + 1}</span>
          <span className="small hidden sm:block">{name}</span>
          <span className="label text-muted-foreground">{st[i] === "active" ? "RUNNING" : st[i] === "done" ? "DONE" : "—"}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({ n, title, children, aside }: { n: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-3 mr-auto"><span className="label text-muted-foreground">{n}</span><h3>{title}</h3></div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Counters({ reactions, n, eta }: { reactions: Map<number, Reaction>; n: number; eta?: number }) {
  const c = tally(reactions.values());
  const w = (x: number) => `${(100 * x) / Math.max(1, n)}%`;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Answered" value={`${reactions.size}/${n}`} note={eta ? `≈ ${Math.ceil(eta / 60)} min left` : undefined} />
        <Stat label="Buy" value={c.buy} note={`${buyPct(reactions, n)}%`} />
        <Stat label="Maybe" value={c.maybe} />
        <Stat label="Bounced" value={c.bounce} note={c.error ? `${c.error} failed` : undefined} />
      </div>
      <div className="bar" role="img" aria-label={`${c.buy} buy, ${c.maybe} maybe, ${c.bounce} bounced of ${n}`}>
        <span className="bg-green" style={{ width: w(c.buy) }} /><span className="bg-amber" style={{ width: w(c.maybe) }} /><span className="bg-destructive" style={{ width: w(c.bounce) }} /><span className="bg-border" style={{ width: w(c.error) }} />
      </div>
    </div>
  );
}

const verdictBadge = (v?: string) =>
  v === "buy" ? <Badge status="ok">BUY</Badge> : v === "maybe" ? <Badge status="held">MAYBE</Badge> : v === "bounce" ? <Badge status="blocked">BOUNCED</Badge> : <span className="label text-muted-foreground">{v === "error" ? "FAILED" : "WAITING"}</span>;

function PersonaPanel({ s, id }: { s: RunState; id: number }) {
  const p = s.personas[id];
  const r = s.reactions.get(id);
  const before = s.first?.get(id);
  if (!p) return null;
  return (
    <Card className="flex flex-col gap-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4">
        <p className="small font-semibold mr-auto">{p.name}</p>
        {before && <>{verdictBadge(before.verdict)}<span className="data">→</span></>}
        {verdictBadge(r?.verdict)}
      </div>
      <dl className="data grid grid-cols-2 gap-2">
        <dt className="text-muted-foreground">segment</dt><dd>{p.segment}</dd>
        <dt className="text-muted-foreground">budget</dt><dd>${p.budget}/mo</dd>
        <dt className="text-muted-foreground">skepticism</dt><dd>{p.skepticism}</dd>
        <dt className="text-muted-foreground">tech-savvy</dt><dd>{p.techSavvy}</dd>
        <dt className="text-muted-foreground">pain point</dt><dd>{p.painPoint}</dd>
        {r && r.dropSection >= 0 && <><dt className="text-muted-foreground">left at</dt><dd>§{r.dropSection} {sectionTitle(s.sections[r.dropSection] ?? "")}</dd></>}
      </dl>
      {r && r.verdict !== "error" && <p className="small">“{r.quote}”</p>}
      {r?.objection && r.verdict !== "buy" && <p className="data text-muted-foreground">objection: {r.objection}</p>}
    </Card>
  );
}

function Segments({ s }: { s: RunState }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {s.segments.map((g) => {
        const ps = s.personas.filter((p) => p.segment === g.name);
        const rs = ps.map((p) => s.reactions.get(p.id)).filter((r): r is Reaction => !!r);
        const buy = rs.filter((r) => r.verdict === "buy").length;
        return (
          <li key={g.name}>
            <Card className="h-full flex flex-col gap-2">
              <p className="small font-semibold">{g.name}</p>
              <p className="data text-muted-foreground">weight {g.weight} · {ps.length} personas · ${g.budget[0]}–{g.budget[1]}/mo</p>
              {rs.length > 0 && <p className="data">{Math.round((100 * buy) / rs.length)}% buy <span className="text-muted-foreground">of {rs.length} answered</span></p>}
              <p className="small text-muted-foreground">{g.painPoints[0]}</p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function VerdictView({ s }: { s: RunState }) {
  const v = s.verdict!;
  const max = Math.max(1, ...v.objections.map((o) => o.count));
  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-2">
        {v.objections.slice(0, 8).map((o, i) => (
          <li key={o.theme}>
            <StatusRow status={i < 3 ? "blocked" : "held"} label={`#${i + 1}`}>
              <span className="small flex-1">{o.theme}</span>
              <span className="bar w-24 hidden sm:flex" aria-hidden><span className="bg-foreground" style={{ width: `${(100 * o.count) / max}%` }} /></span>
              <span className="data w-8 text-right">{o.count}</span>
            </StatusRow>
          </li>
        ))}
      </ol>
      {v.gaps.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p className="label">Not on the page, so not in the rewrite</p>
          <ul className="small list-disc pl-6 flex flex-col gap-1">{v.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </Card>
      )}
      {v.rewrites.map((w) => (
        <div key={w.index} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-3"><p className="label text-muted-foreground">§{w.index} before</p><p className="small whitespace-pre-wrap max-h-80 overflow-auto">{s.sections[w.index]}</p></Card>
          <Card className="flex flex-col gap-3"><p className="label">§{w.index} after</p><p className="small whitespace-pre-wrap max-h-80 overflow-auto">{w.text}</p></Card>
        </div>
      ))}
    </div>
  );
}

function BeforeAfter({ s, control }: { s: RunState; control?: number }) {
  const n = s.personas.length;
  const before = buyPct(s.first!, n), after = buyPct(s.reactions, n), d = after - before;
  const flips = new Map<string, number>();
  for (const [id, r] of s.reactions) {
    const b = s.first!.get(id)?.verdict;
    if (b && b !== r.verdict) flips.set(`${b} → ${r.verdict}`, (flips.get(`${b} → ${r.verdict}`) ?? 0) + 1);
  }
  const noise = control !== undefined ? Math.abs(control - before) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Before" value={`${before}%`} note="buy" />
        <Stat label="After rewrite" value={`${after}%`} note="buy" />
        <Stat label="Change" value={`${d >= 0 ? "+" : ""}${d} pts`} note={`same ${n} personas · seed ${s.seed}`} />
        {control !== undefined && <Stat label="Control" value={`${control}%`} note={`unchanged page, same seed · noise ±${noise} pts`} />}
      </div>
      {noise !== undefined && (
        <StatusRow status={Math.abs(d) > noise ? "ok" : "held"} label={Math.abs(d) > noise ? "ABOVE NOISE" : "WITHIN NOISE"}>
          <span className="small">{Math.abs(d) > noise ? `The ${d >= 0 ? "lift" : "drop"} of ${Math.abs(d)} points is larger than the ${noise}-point swing from re-running the unchanged page.` : `A ${Math.abs(d)}-point change is inside the ${noise}-point run-to-run swing. Treat it as no change.`}</span>
        </StatusRow>
      )}
      <Card className="flex flex-col gap-3">
        <p className="label">Personas who changed their answer</p>
        <ul className="data flex flex-wrap gap-x-8 gap-y-2">
          {[...flips].sort((a, b) => b[1] - a[1]).map(([k, c]) => <li key={k}>{k} <span className="text-muted-foreground">×</span>{c}</li>)}
          {!flips.size && <li className="text-muted-foreground">Nobody changed their answer.</li>}
        </ul>
      </Card>
    </div>
  );
}

export function RunView({ s, onJudge, onRerun, control, etaSeconds }: Props) {
  const [selected, setSelected] = useState<number>();
  const n = s.personas.length;
  const recent = [...s.reactions.values()].filter((r) => r.objection && r.verdict !== "buy").slice(-4).reverse();
  const running = s.phase === "running";

  return (
    <div className="flex flex-col gap-12">
      <Section n="01" title="Research">
        {s.log.length ? (
          <Card className="data flex flex-col gap-1 max-h-48 overflow-auto">
            {s.log.map((l, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-muted-foreground shrink-0">{l.source ? "source" : "step"}</span>
                {l.source ? <a className="link truncate" href={l.source.url} target="_blank" rel="noreferrer">{l.source.title}</a> : <span>{l.line}</span>}
              </div>
            ))}
          </Card>
        ) : running ? <Skeleton className="h-24" /> : null}
      </Section>

      {(s.segments.length > 0 || (running && s.sections.length > 0)) && (
        <Section n="02" title="Segments" aside={s.segments.length > 0 && <span className="data text-muted-foreground">{s.segments.length} segments from the research</span>}>
          {s.segments.length ? <Segments s={s} /> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
        </Section>
      )}

      {n > 0 && (
        <Section n="03" title={s.first ? "Swarm · re-run on the rewrite" : "Swarm"}>
          <Counters reactions={s.reactions} n={n} eta={s.phase === "running" || s.phase === "rerunning" ? etaSeconds : undefined} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
            <Card className="lg:col-span-2"><SwarmGrid personas={s.personas} reactions={s.reactions} grouped selected={selected} onSelect={setSelected} /></Card>
            <div className="flex flex-col gap-4">
              {selected !== undefined ? <PersonaPanel s={s} id={selected} /> : <p className="small text-muted-foreground">Select a persona to see who they are and why they answered that way.</p>}
              <ul className="data text-muted-foreground flex flex-col gap-2" aria-live="polite" aria-label="Latest objections">
                {recent.map((r) => <li key={r.id}>{s.personas[r.id]?.name}: {r.objection}</li>)}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {s.sections.length > 0 && s.reactions.size > 0 && (
        <Section n="03" title="Where they left">
          <Heatmap sections={s.first ? s.rewritten : s.sections} reactions={s.reactions} />
        </Section>
      )}

      {(s.phase === "done" || s.phase === "judging" || s.verdict) && (
        <Section n="04" title="Verdict" aside={onJudge && s.phase === "done" && <Button onClick={onJudge}>Get verdict and rewrite</Button>}>
          {s.verdict ? <VerdictView s={s} /> : s.phase === "judging" ? (
            <div className="flex flex-col gap-2" aria-busy="true"><span className="small text-muted-foreground">Nemotron Ultra is clustering objections and rewriting the three weakest sections…</span><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-40" /></div>
          ) : <p className="small text-muted-foreground">Ranked objections and rewrites of the three weakest sections appear here.</p>}
        </Section>
      )}

      {s.verdict && (
        <Section n="05" title="Before and after" aside={onRerun && s.phase === "verdict" && <Button onClick={onRerun}>Re-run same personas on the rewrite</Button>}>
          {s.phase === "rerun" && s.first ? <BeforeAfter s={s} control={control} /> : s.phase === "rerunning" ? <p className="small text-muted-foreground">Re-running the same personas on the rewritten page…</p> : <p className="small text-muted-foreground">Re-run the same {n} personas on the rewritten page to measure the change.</p>}
        </Section>
      )}
    </div>
  );
}
