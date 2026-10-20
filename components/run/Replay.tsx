"use client";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { pct, type Experiment } from "@/lib/evidence";
import { frames, normalizeVerdict, paced } from "@/lib/run";
import { RunView, StageRail } from "./RunView";
import { useRun } from "./useRun";

const SPEEDS = [["1", "Real time"], ["10", "10×"], ["max", "Instant"]] as const;

// Plays a recorded experiment through the same view as a live run: run → verdict → re-run.
export function Replay({ e }: { e: Experiment }) {
  const { s, consume, applyVerdict, patch } = useRun();
  const [speed, setSpeed] = useState<string>("10");
  const [take, setTake] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    const perSecond = (step: { seconds: number }) => (speed === "max" ? 2000 : (Number(speed) * e.n) / step.seconds);
    const play = async (file: string, step: { seconds: number }, rerun = false) => {
      const r = await fetch(`/evidence/${file}`, { signal: ac.signal });
      return consume(paced(frames(r.body!), perSecond(step), ac.signal), rerun, ac.signal);
    };
    (async () => {
      if (!(await play(e.run.file, e.run))) return;
      if (!e.verdict || ac.signal.aborted) return;
      patch({ phase: "judging" });
      const v = await fetch(`/evidence/${e.verdict.file}`, { signal: ac.signal }).then((r) => r.json());
      if (ac.signal.aborted) return;
      applyVerdict(normalizeVerdict(v));
      if (e.rerun) await play(e.rerun.file, e.rerun, true);
    })().catch((err) => { if (!ac.signal.aborted) patch({ error: String(err?.message ?? err) }); });
    return () => ac.abort();
  }, [e, speed, take, consume, applyVerdict, patch]);

  const control = e.control?.counts ? pct(e.control.counts, e.n) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="lg:sticky top-0 z-10 bg-background py-4 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-64"><StageRail s={s} /></div>
        <div className="flex items-center gap-2" role="group" aria-label="Replay speed">
          {SPEEDS.map(([k, label]) => (
            <Button key={k} variant={speed === k ? "primary" : "secondary"} aria-pressed={speed === k} onClick={() => setSpeed(k)}>{label}</Button>
          ))}
          <Button variant="secondary" onClick={() => setTake((t) => t + 1)}>Replay</Button>
        </div>
      </div>
      {s.error && <Alert action={<Button variant="secondary" onClick={() => setTake((t) => t + 1)}>Retry</Button>}>Could not load this capture: {s.error}</Alert>}
      <RunView s={s} control={control} />
    </div>
  );
}

// First frames of the raw capture, as recorded
export function RawCapture({ file }: { file: string }) {
  const [text, setText] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/evidence/${file}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((t) => setText(t.slice(0, 12000)), (e) => setError(e.message));
  }, [file]);
  if (error) return <Alert>Could not load {file}: {error}</Alert>;
  if (text === undefined) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-2">
      <pre className="data bg-card border border-border rounded-card p-4 max-h-96 overflow-auto whitespace-pre-wrap">{text}</pre>
      <span className="data text-muted-foreground">First 12 kB shown. <a className="link" href={`/evidence/${file}`} download>Download {file}</a></span>
    </div>
  );
}

export function EvidenceTabs({ e }: { e: Experiment }) {
  const files = [e.run, e.verdict, e.rerun, e.control].filter((x) => !!x).map((x) => x!.file);
  return (
    <Tabs
      tabs={[
        { id: "replay", label: "Replay", content: <Replay e={e} /> },
        ...files.map((f) => ({ id: f, label: f, content: <RawCapture file={f} /> })),
      ]}
    />
  );
}
