"use client";
import { StatusRow } from "@/components/ui/StatusRow";
import { Tabs } from "@/components/ui/Tabs";
import type { Counts } from "@/lib/evidence";

type Side = { id: string; label: string; file: string; counts: Counts; n: number; quotes: string[]; status: "ok" | "blocked"; verdictLabel: string; note: string };

function Bar({ c, n }: { c: Counts; n: number }) {
  const w = (x: number) => `${(100 * x) / n}%`;
  return (
    <div className="flex flex-col gap-2">
      <div className="bar" role="img" aria-label={`${c.buy} buy, ${c.maybe} maybe, ${c.bounce} bounced of ${n}`}>
        <span className="bg-green" style={{ width: w(c.buy) }} /><span className="bg-amber" style={{ width: w(c.maybe) }} /><span className="bg-destructive" style={{ width: w(c.bounce) }} />
      </div>
      <span className="data">buy {c.buy} · maybe {c.maybe} · bounce {c.bounce} <span className="text-muted-foreground">of {n}</span></span>
    </div>
  );
}

export function Lab({ sides, prompt }: { sides: Side[]; prompt: string }) {
  return (
    <Tabs
      tabs={sides.map((s) => ({
        id: s.id,
        label: s.label,
        content: (
          <div className="flex flex-col gap-6">
            <StatusRow status={s.status} label={s.verdictLabel}><span className="small">{s.note}</span></StatusRow>
            <Bar c={s.counts} n={s.n} />
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {s.quotes.map((q) => <li key={q} className="small bg-card border border-border rounded-card p-4">“{q}”</li>)}
            </ul>
            {s.id === "v2" && <p className="data text-muted-foreground">prompt now includes: “{prompt}”</p>}
            <a className="link small w-fit" href={`/evidence/${s.file.replace(/\.sse$/, "")}`}>Replay this capture</a>
          </div>
        ),
      }))}
    />
  );
}
