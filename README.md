# Swarm

A focus group of hundreds of simulated customers, grounded in live market research, that reads your landing page, tells you where it loses people, rewrites the weak sections, and re-runs the **same** personas on the rewrite to show the conversion lift.

Built for the Nebius x NVIDIA Global AI Hackathon (Best Apps and Agents). Results are simulated, directional signal, not a substitute for real users.

## How it works

1. **Research.** Tavily `extract` pulls the page; Tavily `search` finds competitors, reviews and Reddit complaints.
2. **Segments.** Nemotron 3 Ultra proposes ~12 weighted buyer segments from that research.
3. **Personas.** Plain code samples N personas from the segments with a seeded RNG (no LLM call), so a re-run reuses identical personas.
4. **Swarm.** One Nemotron 3 Nano call per persona returns `buy | maybe | bounce`, the section where they dropped off, an objection and a quote. Calls run in parallel under a concurrency cap and stream to the UI over SSE.
5. **Verdict.** Ultra clusters objections into ranked themes and rewrites the three worst sections.
6. **Re-run.** The same seed and segments run against the rewritten page; the UI shows before/after buy %.

Inference runs on Nebius Token Factory (OpenAI-compatible API).

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:3000
```

| Variable | Notes |
|---|---|
| `NEBIUS_API_KEY` | Token Factory key |
| `NEBIUS_BASE_URL` | defaults to `https://api.studio.nebius.com/v1/` |
| `TAVILY_API_KEY` | Tavily key |
| `MODEL_NANO` | e.g. `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| `MODEL_ULTRA` | e.g. `nvidia/Nemotron-3-Ultra-550b-a55b` |
| `NANO_CONCURRENCY` | optional, parallel Nano calls, default 16 |

List the model ids your key can use with `curl $NEBIUS_BASE_URL/models -H "Authorization: Bearer $NEBIUS_API_KEY"`.

## Scripts

- `npm run build` / `npm start`: production build and server. Use a long-lived host (a container) rather than short serverless timeouts, since a run streams for up to a minute or more.
- `npm run check`: self-check for seeded persona sampling and the concurrency limiter.

## License

MIT

## Evidence

Raw captures of real runs against `https://linear.app` on Token Factory (Nano `NVIDIA-Nemotron-3-Nano-30B-A3B`, Ultra `Nemotron-3-Ultra-550b-a55b`, Nano concurrency 16). List reactions with `grep -A1 '^event: reaction' <file>`.

| Capture | Personas | Wall time | buy / maybe / bounce | Cost |
|---|---|---|---|---|
| [`evidence/linear-n30-v1-prompt.sse`](evidence/linear-n30-v1-prompt.sse) | 30 | 39s | 0 / 18 / 12 (first Nano prompt, too hedged) | ~$0.02 (est.) |
| [`evidence/linear-n100.sse`](evidence/linear-n100.sse) | 100 | 72s | 25 / 46 / 29 | ~$0.07 (est.) |
| [`evidence/linear-n1000.sse`](evidence/linear-n1000.sse) | 1,000 | 637s | 285 / 420 / 295 | $0.58 (measured) |
| [`evidence/linear-n1000-verdict.json`](evidence/linear-n1000-verdict.json) | verdict on the 1,000 | ~20s | 15 ranked objection themes, 11 gaps the page doesn't answer, 3 rewrites that add no facts | $0.02 (measured) |

The 1,000-persona run completed with no errors or 429s. Measured usage: Nano 1,000 calls, 6.06M input and 0.83M output tokens ($0.56); Ultra segments 4.1k in / 2.4k out ($0.01); Ultra verdict 8.7k in / 6.9k out ($0.03). Prices are the Token Factory list prices (Nano $0.06 in / $0.24 out per 1M tokens, Ultra $1 / $3). The 30 and 100 runs predate usage logging, so their cost is scaled from the 1,000-run per-call averages.

Token Factory limits Nano to 100 requests/min and 800k tokens/min, so 1,000 personas takes about 10 minutes until those limits are raised.
