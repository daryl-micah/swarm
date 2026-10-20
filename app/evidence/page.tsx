import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { EXPERIMENTS, MODELS, pct, totalCost, usd, type Experiment } from "@/lib/evidence";

export const metadata: Metadata = { title: "Evidence" };

export default function EvidenceIndex() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="label text-muted-foreground">Evidence</p>
        <h1 className="h2">Every number on this site comes from one of these runs.</h1>
        <p className="max-w-prose text-muted-foreground">
          Raw server-sent event captures of real runs on Nebius Token Factory, with {MODELS.nano} for personas and {MODELS.ultra} for segments and verdicts, Nano concurrency {MODELS.concurrency}. Open one to replay it in the product UI, or download the file.
        </p>
      </header>
      <Table<Experiment>
        rowKey={(e) => e.id}
        rowClass={(e) => `status-${e.status}`}
        cols={[
          { key: "status", label: "Status", cell: (e) => <Badge status={e.status}>{e.status === "ok" ? "OK" : "HELD"}</Badge> },
          { key: "run", label: "Run", cell: (e) => <Link className="link" href={`/evidence/${e.id}`}>{e.id}</Link> },
          { key: "n", label: "Personas", num: true, cell: (e) => e.n.toLocaleString("en-US") },
          { key: "buy", label: "Buy %", num: true, cell: (e) => `${pct(e.run.counts!, e.n)}%` },
          { key: "after", label: "After rewrite", num: true, cell: (e) => (e.rerun?.counts ? `${pct(e.rerun.counts, e.n)}%` : "—") },
          { key: "time", label: "Run time", num: true, cell: (e) => `${e.run.seconds}s` },
          { key: "cost", label: "Cost", num: true, cell: (e) => usd(totalCost(e)) },
          { key: "date", label: "Recorded", cell: (e) => e.recordedAt },
        ]}
        rows={EXPERIMENTS}
      />
      <ul className="flex flex-col gap-4 max-w-prose">
        {EXPERIMENTS.map((e) => <li key={e.id} className="small"><span className="data">{e.id}</span>: {e.summary}</li>)}
      </ul>
    </main>
  );
}
