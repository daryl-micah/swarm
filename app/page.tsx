import Link from "next/link";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { Lab } from "@/components/landing/Lab";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { EXPERIMENTS, MODELS, experiment, pct, totalCost, usd, type Experiment } from "@/lib/evidence";
import { readFrames, readJson } from "@/lib/evidence-server";
import type { Persona, Segment } from "@/lib/personas";
import { sectionTitle, type Reaction } from "@/lib/run";

// Everything below is read from recorded captures at build time.
function capture(file: string) {
  const fr = readFrames(file);
  const get = (e: string) => fr.find((f) => f.event === e)?.data;
  return {
    sources: fr.filter((f) => f.event === "research" && f.data.source).map((f) => f.data.source as { title: string; url: string }),
    sections: get("sections") as string[],
    segments: get("segments") as Segment[],
    personas: get("personas").personas as Persona[],
    seed: get("personas").seed as number,
    reactions: fr.filter((f) => f.event === "reaction").map((f) => f.data as Reaction),
  };
}

const json = (x: unknown) => JSON.stringify(x, null, 2);
const quotesOf = (rs: Reaction[], v: string, k: number) => rs.filter((r) => r.verdict === v).slice(0, k).map((r) => r.quote);

const FAQ: [string, string][] = [
  ["Is this real user research?", "No. The customers are simulated by a language model and the result is directional signal. It is useful for finding what a page fails to say before you spend money testing it on people."],
  ["Why re-run the same personas?", "Personas are sampled from the segments with a fixed seed, so the re-run asks the same people about the rewritten page. A control run of the unchanged page shows how much answers move by chance (about 3 points on the linear.app capture)."],
  ["Does the rewrite invent features?", "It is told not to. Every claim in a rewrite must already appear on your page; things customers asked for that the page does not state are listed as gaps instead."],
  ["What does a run cost and how long does it take?", "About $0.04 to $0.06 of Nemotron Nano per 100 personas, plus a few cents of Ultra for segments and the verdict. Nano is rate-limited to 100 requests a minute, so 200 personas take about 3 minutes."],
  ["What do you store?", "Nothing on the server. A run lives in your browser; you can download it as the same .sse format used on the evidence page."],
  ["Can I run 1,000 personas?", `Public runs are capped at 200 personas and 4 runs per hour. Self-host with your own Token Factory key to run more; the 1,000-persona capture took ${experiment("linear-n1000")!.run.seconds} seconds.`],
];

export default function Landing() {
  const main = experiment("linear-n100")!;
  const v1 = experiment("linear-n30-v1-prompt")!;
  const c = capture(main.run.file);
  const c1 = capture(v1.run.file);
  const verdict = readJson(main.verdict!.file) as { objections: { theme: string; count: number }[] };
  // a buyer, and a maybe and a bounce that name the section where they left
  const byVerdict = (v: string) => c.reactions.find((r) => r.verdict === v && (v === "buy" || r.dropSection >= 0))!;
  const theatre = [
    ["ok", "OK · BUY", byVerdict("buy")],
    ["held", "HELD · MAYBE", byVerdict("maybe")],
    ["blocked", "BLOCKED · BOUNCED", byVerdict("bounce")],
  ] as const;
  const lift = { before: pct(main.run.counts!, main.n), after: pct(main.rerun!.counts!, main.n), control: pct(main.control!.counts!, main.n) };
  const seg = c.segments[0];

  const steps: [string, string, string][] = [
    ["Research", "Tavily extracts the page and searches for competitors, reviews and complaints in the niche.", `source: ${c.sources[0].title}\n${c.sources[0].url}\n+ ${c.sources.length - 1} more`],
    ["Segment", "Nemotron Ultra turns the research into about a dozen weighted buyer segments with budgets and pain points.", json({ ...seg, painPoints: seg.painPoints.slice(0, 2) })],
    ["Simulate", "Code samples personas from the segments with a seed. One Nemotron Nano call per persona reads the page and answers.", json({ persona: c.personas[1], reaction: c.reactions.find((r) => r.id === 1) })],
    ["Judge", "Ultra clusters the objections, ranks them, and rewrites the three sections where most people left, adding no new claims.", verdict.objections.slice(0, 3).map((o) => `${String(o.count).padStart(3)}  ${o.theme}`).join("\n")],
    ["Re-run", "The same seed and segments run against the rewrite, plus a control on the unchanged page.", `seed ${c.seed} · n ${main.n}\nbefore   ${lift.before}% buy\nafter    ${lift.after}% buy\ncontrol  ${lift.control}% buy`],
  ];

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-16 md:pb-24 flex flex-col gap-12">
        <div className="flex flex-col gap-6">
          <h1>User research takes weeks.<br />Swarm takes a few minutes.</h1>
          <p className="max-w-prose text-muted-foreground">
            Hundreds of simulated customers, grounded in live market research, read your landing page, tell you where they leave, and then read the rewrite.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#demo" className="btn btn-primary">Replay a real run</a>
            <Link href="/run" className="btn btn-secondary">Run your page</Link>
          </div>
        </div>
        <div id="demo" className="scroll-mt-8">
          <HeroDemo
            file={main.run.file}
            site={main.site}
            objections={verdict.objections}
            lift={lift}
            footer={`recorded ${main.recordedAt} · ${main.n} × ${MODELS.nano} · ${usd(totalCost(main))} for run, verdict, re-run and control · simulated, directional signal`}
          />
        </div>
      </section>

      {/* Steps */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-12">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">How it works</span><h2>Five steps, one stream.</h2></div>
          <ol className="flex flex-col gap-6">
            {steps.map(([verb, body, artifact], i) => (
              <li key={verb} className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                <div className="flex flex-col gap-3">
                  <span className="label text-muted-foreground">0{i + 1}</span>
                  <h3>{verb}</h3>
                  <p className="text-muted-foreground max-w-prose">{body}</p>
                </div>
                <pre className="data bg-card border border-border rounded-card p-4 overflow-x-auto whitespace-pre-wrap break-all max-h-64">{artifact}</pre>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Lab */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">Lab</span><h2>Watch a prompt fail.</h2>
            <p className="text-muted-foreground max-w-prose">Our first persona prompt let the model hedge: on linear.app nobody bought. Switch between the two recorded runs.</p>
          </div>
          <Lab
            prompt={'Be honest, not polite or hedging: pick "buy" when the page clearly solves your pain point at a price you can afford, "bounce" when it clearly does not, and "maybe" only when truly torn.'}
            sides={[
              { id: "v1", label: "Prompt v1", file: v1.run.file, counts: v1.run.counts!, n: v1.n, quotes: quotesOf(c1.reactions, "maybe", 3), status: "blocked", verdictLabel: "HEDGED", note: `0 of ${v1.n} bought. The swarm said maybe ${v1.run.counts!.maybe} times, which tells you nothing.` },
              { id: "v2", label: "Prompt v2", file: main.run.file, counts: main.run.counts!, n: main.n, quotes: [quotesOf(c.reactions, "buy", 1)[0], quotesOf(c.reactions, "maybe", 1)[0], quotesOf(c.reactions, "bounce", 1)[0]], status: "ok", verdictLabel: "SPREAD", note: "A spread across all three answers, each with a reason you can act on." },
            ]}
          />
        </div>
      </section>

      {/* Theatre */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">Theatre</span><h2>Three customers, three answers.</h2></div>
          <Tabs
            tabs={theatre.map(([status, label, r]) => {
              const p = c.personas[r.id];
              return {
                id: status,
                label,
                content: (
                  <div className={`grid grid-cols-1 gap-6 md:grid-cols-3 status-${status} pl-4`}>
                    <Card className="flex flex-col gap-2">
                      <p className="label text-muted-foreground">Persona #{p.id}</p>
                      <p className="small font-semibold">{p.name}</p>
                      <p className="data text-muted-foreground">{p.segment} · ${p.budget}/mo · skepticism {p.skepticism} · tech {p.techSavvy}</p>
                      <p className="small">Cares about: {p.painPoint}</p>
                    </Card>
                    <pre className="data bg-card border border-border rounded-card p-4 overflow-x-auto whitespace-pre-wrap break-all">{json(r)}</pre>
                    <Card className="flex flex-col gap-2">
                      <p className="label text-muted-foreground">{r.dropSection >= 0 ? `Left at section ${r.dropSection}` : "Read to the end"}</p>
                      <p className="small">{r.dropSection >= 0 ? sectionTitle(c.sections[r.dropSection]) : "No drop-off section: this persona would buy."}</p>
                      <p className="small text-muted-foreground">“{r.quote}”</p>
                    </Card>
                  </div>
                ),
              };
            })}
          />
        </div>
      </section>

      {/* Evidence log */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">Evidence log</span><h2>Recorded runs, real costs.</h2></div>
          <Table<Experiment>
            rowKey={(e) => e.id}
            rowClass={(e) => `status-${e.status}`}
            cols={[
              { key: "s", label: "Status", cell: (e) => <Badge status={e.status}>{e.status === "ok" ? "OK" : "HELD"}</Badge> },
              { key: "id", label: "Capture", cell: (e) => <Link className="link" href={`/evidence/${e.id}`}>{e.id}</Link> },
              { key: "n", label: "Personas", num: true, cell: (e) => e.n.toLocaleString("en-US") },
              { key: "c", label: "Buy / maybe / bounce", num: true, cell: (e) => `${e.run.counts!.buy} / ${e.run.counts!.maybe} / ${e.run.counts!.bounce}` },
              { key: "t", label: "Wall time", num: true, cell: (e) => `${e.run.seconds}s` },
              { key: "$", label: "Cost", num: true, cell: (e) => usd(totalCost(e)) },
            ]}
            rows={EXPERIMENTS}
          />
          <Link href="/evidence" className="link small w-fit">Open the evidence page</Link>
        </div>
      </section>

      {/* Architecture */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">Architecture</span><h2>One stream from page to verdict.</h2></div>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-5" aria-label="Request flow">
            {[
              ["Browser", "POST /api/swarm, reads server-sent events"],
              ["Tavily", "extract the page · 3 searches for competitors, reviews, complaints"],
              ["Nemotron Ultra", "research → ~12 weighted segments"],
              ["Seeded sampler", "plain code, mulberry32 · same seed, same personas"],
              [`Nemotron Nano ×N`, `concurrency ${MODELS.concurrency} · 100 req/min · one JSON answer each`],
            ].map(([t, d], i) => (
              <li key={t} className="flex md:flex-col items-stretch gap-2">
                <Card className="flex-1 flex flex-col gap-2"><span className="label text-muted-foreground">0{i + 1}</span><span className="small font-semibold">{t}</span><span className="data text-muted-foreground">{d}</span></Card>
              </li>
            ))}
          </ol>
          <p className="data text-muted-foreground">POST /api/verdict → Nemotron Ultra: objection themes, gaps, 3 rewrites. Runs as one Next.js container on Nebius; inference on Nebius Token Factory.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section border-t border-border">
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col gap-8">
          <div className="flex flex-col gap-3"><span className="label text-muted-foreground">FAQ</span><h2>Short answers.</h2></div>
          <div className="flex flex-col max-w-prose">
            {FAQ.map(([q, a]) => (
              <details key={q} className="border-b border-border py-4">
                <summary className="h3 cursor-pointer">{q}</summary>
                <p className="text-muted-foreground pt-4">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
