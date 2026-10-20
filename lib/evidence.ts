// Manifest of recorded real runs in public/evidence. Single source for the landing log, /evidence and /docs.
// Costs are Token Factory list prices applied to logged usage; `measured: false` means scaled from per-call averages.

export type Counts = { buy: number; maybe: number; bounce: number };
export type Step = { file: string; seconds: number; cost: number; measured: boolean; counts?: Counts };

export type Experiment = {
  id: string;
  site: string;
  n: number;
  recordedAt: string;
  status: "ok" | "held";
  summary: string;
  run: Step;
  verdict?: Step;
  rerun?: Step;
  control?: Step; // the unchanged page re-run with the same seed: run-to-run noise
};

export const MODELS = { nano: "NVIDIA-Nemotron-3-Nano-30B-A3B", ultra: "Nemotron-3-Ultra-550b-a55b", concurrency: 16 };

export const EXPERIMENTS: Experiment[] = [
  {
    id: "linear-n100",
    site: "linear.app",
    n: 100,
    recordedAt: "2026-10-08",
    status: "ok",
    summary: "Rewrite lifted buy from 25% to 35%. The unchanged page re-run on the same seed scored 22%, so run-to-run noise is about 3 points.",
    run: { file: "linear-n100.sse", seconds: 72, cost: 0.07, measured: false, counts: { buy: 25, maybe: 46, bounce: 29 } },
    verdict: { file: "linear-n100-verdict.json", seconds: 22, cost: 0.025, measured: true },
    rerun: { file: "linear-n100-rerun.sse", seconds: 80, cost: 0.052, measured: true, counts: { buy: 35, maybe: 41, bounce: 24 } },
    control: { file: "linear-n100-control.sse", seconds: 72, cost: 0.056, measured: true, counts: { buy: 22, maybe: 44, bounce: 34 } },
  },
  {
    id: "plausible-n100",
    site: "plausible.io",
    n: 100,
    recordedAt: "2026-10-20",
    status: "held",
    summary: "Rewrite cut bounces from 9 to 5 but buy fell from 73% to 67%. The page already converts; the rewrite did not help.",
    run: { file: "plausible-n100.sse", seconds: 99, cost: 0.043, measured: true, counts: { buy: 73, maybe: 18, bounce: 9 } },
    verdict: { file: "plausible-n100-verdict.json", seconds: 8, cost: 0.012, measured: true },
    rerun: { file: "plausible-n100-rerun.sse", seconds: 66, cost: 0.037, measured: true, counts: { buy: 67, maybe: 28, bounce: 5 } },
  },
  {
    id: "linear-n1000",
    site: "linear.app",
    n: 1000,
    recordedAt: "2026-10-08",
    status: "ok",
    summary: "1,000 personas, no errors or 429s. Wall time is set by Nano's 100 requests/min limit.",
    run: { file: "linear-n1000.sse", seconds: 637, cost: 0.57, measured: true, counts: { buy: 285, maybe: 420, bounce: 295 } },
    verdict: { file: "linear-n1000-verdict.json", seconds: 20, cost: 0.03, measured: true },
  },
  {
    id: "linear-n30-v1-prompt",
    site: "linear.app",
    n: 30,
    recordedAt: "2026-10-08",
    status: "held",
    summary: "First Nano prompt. Personas hedged: 0 buy, 18 maybe. Kept as the baseline that motivated the current prompt.",
    run: { file: "linear-n30-v1-prompt.sse", seconds: 39, cost: 0.02, measured: false, counts: { buy: 0, maybe: 18, bounce: 12 } },
  },
];

export const experiment = (id: string) => EXPERIMENTS.find((e) => e.id === id);

export const totalCost = (e: Experiment) => [e.run, e.verdict, e.rerun, e.control].reduce((s, x) => s + (x?.cost ?? 0), 0);
export const pct = (c: Counts, n: number) => Math.round((100 * c.buy) / n);
export const usd = (x: number) => `$${x < 0.1 ? x.toFixed(3) : x.toFixed(2)}`;
