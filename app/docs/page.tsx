import Link from "next/link";
import type { Metadata } from "next";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { EXPERIMENTS, MODELS, experiment, pct, usd } from "@/lib/evidence";
import { readFrames, readJson } from "@/lib/evidence-server";
import { DAILY_RUNS, IP_PER_HOUR, MAX_ACTIVE, MAX_PUBLIC_N, VERDICTS_PER_HOUR } from "@/lib/limits";

export const metadata: Metadata = { title: "Docs" };

const TOC = [
  ["quickstart", "Quickstart"],
  ["how", "How a run works"],
  ["method", "Methodology and limits"],
  ["models", "Models and cost"],
  ["api", "API"],
  ["events", "Stream events"],
  ["limits", "Rate limits"],
  ["selfhost", "Self-hosting"],
  ["evidence", "Evidence format"],
] as const;

const Code = ({ children }: { children: string }) => <pre className="data bg-card border border-border rounded-card p-4 overflow-x-auto">{children}</pre>;

function Doc({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 flex flex-col gap-4 border-t border-border pt-12">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const clip = (x: unknown, len = 400) => { const s = JSON.stringify(x); return s.length > len ? `${s.slice(0, len)}…` : s; };

export default function Docs() {
  const fr = readFrames("linear-n100.sse");
  const ex = (e: string) => fr.find((f) => f.event === e)?.data;
  const personas = ex("personas");
  const verdict = readJson("linear-n100-verdict.json");
  const main = experiment("linear-n100")!;
  const n1000 = experiment("linear-n1000")!;

  const events: { event: string; when: string; example: string }[] = [
    { event: "research", when: "each research step and each Tavily source", example: clip(fr.find((f) => f.event === "research" && f.data.source)?.data) },
    { event: "sections", when: "once, the page split at headings; the index is the unit for drop-off", example: `[${ex("sections").length} strings] ${clip(ex("sections")[1], 120)}` },
    { event: "segments", when: "once, Ultra's weighted buyer segments", example: clip(ex("segments")[0], 300) },
    { event: "personas", when: "once, the seed and every sampled persona", example: clip({ seed: personas.seed, personas: [personas.personas[0], "…"] }, 300) },
    { event: "reaction", when: "once per persona, in completion order", example: clip(ex("reaction")) },
    { event: "done", when: "the run finished", example: "{}" },
    { event: "error", when: "the run failed; the stream ends", example: '{"message":"tavily /extract 400"}' },
  ];

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-12 grid grid-cols-1 gap-12 lg:grid-cols-4">
      <nav aria-label="Docs" className="lg:sticky lg:top-8 self-start">
        <details open className="lg:hidden"><summary className="label cursor-pointer">On this page</summary><TocList /></details>
        <div className="hidden lg:block"><TocList /></div>
      </nav>

      <article className="lg:col-span-3 flex flex-col gap-12 min-w-0">
        <header className="flex flex-col gap-4">
          <p className="label text-muted-foreground">Docs</p>
          <h1 className="h2">How Swarm works, what it costs, and how far to trust it.</h1>
        </header>

        <Doc id="quickstart" title="Quickstart">
          <Code>{`npm install\ncp .env.example .env   # fill in the keys below\nnpm run dev            # http://localhost:3000`}</Code>
          <Table<[string, string]>
            rowKey={(r) => r[0]}
            cols={[{ key: "k", label: "Variable", cell: (r) => r[0] }, { key: "v", label: "Notes", cell: (r) => r[1] }]}
            rows={[
              ["NEBIUS_API_KEY", "Token Factory key"],
              ["NEBIUS_BASE_URL", "defaults to https://api.studio.nebius.com/v1/"],
              ["TAVILY_API_KEY", "Tavily key"],
              ["MODEL_NANO", `e.g. nvidia/${MODELS.nano}`],
              ["MODEL_ULTRA", `e.g. nvidia/${MODELS.ultra}`],
              ["NANO_CONCURRENCY", `parallel Nano calls, default ${MODELS.concurrency}`],
              ["DEMO_TOKEN", "optional; requests with this x-demo-token skip public limits and may run 1,000 personas"],
            ]}
          />
        </Doc>

        <Doc id="how" title="How a run works">
          <ol className="flex flex-col gap-3 max-w-prose list-decimal pl-6">
            <li><b>Research.</b> Tavily <code className="data">extract</code> pulls the page; three Tavily searches find competitors, reviews and complaints.</li>
            <li><b>Segments.</b> Nemotron Ultra proposes about 12 weighted buyer segments with budgets and pain points, grounded in that research.</li>
            <li><b>Personas.</b> <code className="data">samplePersonas(segments, n, seed)</code> draws N personas with a seeded RNG. No model call, so the same seed gives the same people.</li>
            <li><b>Swarm.</b> One Nemotron Nano call per persona returns a verdict, the section where they lost interest, an objection and a quote.</li>
            <li><b>Verdict.</b> Ultra clusters objections into ranked themes, lists gaps the page does not answer, and rewrites the three sections with the most drop-offs.</li>
            <li><b>Re-run.</b> The rewritten sections go back through the same personas. The score is the share of personas who would buy.</li>
          </ol>
        </Doc>

        <Doc id="method" title="Methodology and limits">
          <div className="flex flex-col gap-4 max-w-prose">
            <p>Swarm simulates customers. It finds what a page fails to say and which sections lose attention; it does not predict your real conversion rate.</p>
            <p><b>Noise.</b> Nano samples at temperature 1, so the same persona can answer differently twice. On the linear.app capture the unchanged page re-run on the same seed scored {pct(main.control!.counts!, main.n)}% against {pct(main.run.counts!, main.n)}% originally. Treat changes inside that swing as no change; the product labels them “within noise” when a control exists.</p>
            <p><b>Rewrites add no facts.</b> The verdict prompt forbids new features, prices, customers or numbers. Objections the page cannot answer are listed as gaps for you to decide on.</p>
            <p><b>Not every rewrite helps.</b> On plausible.io the rewrite cut bounces but buy fell from 73% to 67%. <Link className="link" href="/evidence/plausible-n100">See the capture</Link>.</p>
            <p><b>Prompt sensitivity.</b> The first persona prompt produced no buyers at all. <Link className="link" href="/evidence/linear-n30-v1-prompt">See the capture</Link>.</p>
          </div>
        </Doc>

        <Doc id="models" title="Models and cost">
          <Table<[string, string, string]>
            rowKey={(r) => r[0]}
            cols={[{ key: "m", label: "Model", cell: (r) => r[0] }, { key: "j", label: "Job", cell: (r) => r[1] }, { key: "p", label: "List price per 1M tokens", num: true, cell: (r) => r[2] }]}
            rows={[
              [MODELS.nano, "one call per persona", "$0.06 in / $0.24 out"],
              [MODELS.ultra, "segments, verdict", "$1 in / $3 out"],
            ]}
          />
          <p className="max-w-prose">Measured: 100 personas cost {usd(main.rerun!.cost)} of Nano; the verdict cost {usd(main.verdict!.cost)} of Ultra. The 1,000-persona run cost {usd(n1000.run.cost)} and took {n1000.run.seconds} s, limited by Nano's 100 requests per minute.</p>
        </Doc>

        <Doc id="api" title="API">
          <p className="max-w-prose"><code className="data">POST /api/swarm</code> streams <code className="data">text/event-stream</code>. Send a page for a full run, or sections, segments and a seed to re-run the same personas.</p>
          <Tabs
            tabs={[
              { id: "full", label: "Full run", content: <Code>{`curl -N localhost:3000/api/swarm \\\n  -H 'content-type: application/json' \\\n  -d '{"url":"https://linear.app","audience":"engineering managers","n":100}'\n\n# or {"text":"# Heading\\n...","n":100} for pasted page text`}</Code> },
              { id: "rerun", label: "Re-run", content: <Code>{`curl -N localhost:3000/api/swarm \\\n  -H 'content-type: application/json' \\\n  -d '{"sections":[...rewritten],"segments":[...from the run],"seed":${personas.seed},"n":100}'`}</Code> },
              { id: "verdict", label: "Verdict", content: <Code>{`curl localhost:3000/api/verdict \\\n  -H 'content-type: application/json' \\\n  -d '{"sections":[...],"reactions":[...]}'\n\n# → ${clip({ objections: verdict.objections.slice(0, 1), rewrites: [{ index: verdict.rewrites[0].index, text: "…" }], gaps: ["…"] }, 300)}`}</Code> },
            ]}
          />
        </Doc>

        <Doc id="events" title="Stream events">
          <p className="max-w-prose">Each frame is <code className="data">event: name</code> and one line of <code className="data">data: JSON</code>. Examples are from the recorded linear.app run.</p>
          <Table<(typeof events)[number]>
            rowKey={(r) => r.event}
            cols={[
              { key: "e", label: "Event", cell: (r) => r.event },
              { key: "w", label: "Sent", cell: (r) => <span className="small">{r.when}</span> },
              { key: "x", label: "Example data", cell: (r) => <span className="break-all">{r.example}</span> },
            ]}
            rows={events}
          />
        </Doc>

        <Doc id="limits" title="Rate limits">
          <Table<[string, string]>
            rowKey={(r) => r[0]}
            cols={[{ key: "l", label: "Limit", cell: (r) => r[0] }, { key: "v", label: "Value", num: true, cell: (r) => r[1] }]}
            rows={[
              ["Personas per public run", String(MAX_PUBLIC_N)],
              ["Swarm runs per visitor per hour", String(IP_PER_HOUR)],
              ["Verdicts per visitor per hour", String(VERDICTS_PER_HOUR)],
              ["Public runs per day", String(DAILY_RUNS)],
              ["Runs at the same time", String(MAX_ACTIVE)],
            ]}
          />
          <p className="max-w-prose small text-muted-foreground">Limits are in memory on a single instance and answer with HTTP 429 and a message. A request with the right <code className="data">x-demo-token</code> skips them.</p>
        </Doc>

        <Doc id="selfhost" title="Self-hosting">
          <Code>{`docker build -t swarm .\ndocker run -p 3000:3000 --env-file .env swarm`}</Code>
          <p className="max-w-prose">Use a long-lived host such as a container on Nebius AI Cloud; a 200-persona run streams for about three minutes, longer than many serverless timeouts.</p>
        </Doc>

        <Doc id="evidence" title="Evidence format">
          <p className="max-w-prose">Recorded runs are the raw stream saved to a file, the same format the product downloads with “Download run”. Verdicts are the JSON returned by <code className="data">/api/verdict</code>. There are {EXPERIMENTS.length} recorded experiments on the <Link className="link" href="/evidence">evidence page</Link>.</p>
          <Code>{`grep -A1 '^event: reaction' linear-n100.sse | head\n${fr.filter((f) => f.event === "reaction").slice(0, 2).map((f) => `event: reaction\ndata: ${clip(f.data, 160)}`).join("\n")}`}</Code>
        </Doc>
      </article>
    </main>
  );
}

function TocList() {
  return (
    <ol className="flex flex-col gap-2 pt-4 lg:pt-0">
      {TOC.map(([id, label], i) => (
        <li key={id}><a className="small text-muted-foreground hover:text-foreground" href={`#${id}`}><span className="data mr-2">0{i + 1}</span>{label}</a></li>
      ))}
    </ol>
  );
}
