import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EvidenceTabs } from "@/components/run/Replay";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { EXPERIMENTS, MODELS, experiment, pct, totalCost, usd } from "@/lib/evidence";

export const dynamicParams = false;
export const generateStaticParams = () => EXPERIMENTS.map((e) => ({ id: e.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `${(await params).id} · Evidence` };
}

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const e = experiment((await params).id);
  if (!e) notFound();
  const measured = [e.run, e.verdict, e.rerun, e.control].every((x) => !x || x.measured);
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <Link href="/evidence" className="label link w-fit">← All evidence</Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="h2 mr-auto">{e.site} · {e.n.toLocaleString("en-US")} personas</h1>
          <Badge status={e.status}>{e.status === "ok" ? "OK" : "HELD"}</Badge>
        </div>
        <p className="max-w-prose text-muted-foreground">{e.summary}</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Buy" value={`${pct(e.run.counts!, e.n)}%`} note={e.rerun?.counts ? `→ ${pct(e.rerun.counts, e.n)}% after rewrite` : undefined} />
        <Stat label="Run time" value={`${e.run.seconds}s`} note={e.rerun ? `re-run ${e.rerun.seconds}s` : undefined} />
        <Stat label="Cost" value={usd(totalCost(e))} note={measured ? "measured usage" : "partly estimated"} />
        <Stat label="Recorded" value={e.recordedAt.slice(5)} note={e.recordedAt.slice(0, 4)} />
      </div>
      <p className="data text-muted-foreground">nano {MODELS.nano} · ultra {MODELS.ultra} · concurrency {MODELS.concurrency} · replays are paced from the recorded wall time</p>
      <EvidenceTabs e={e} />
    </main>
  );
}
