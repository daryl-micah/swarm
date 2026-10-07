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
