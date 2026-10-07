# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first (behavioral rules, git hygiene: never commit/push unless asked). `PLAN.md` is the product plan and milestones; `DESIGN.md` is the binding frontend ruleset. Both are gitignored, as is `.env`.

## Commands

- `npm run dev` / `npm run build` / `npm start` — Next.js 15 (App Router), Tailwind v4
- `npm run check` — runs the `lib/personas.ts` self-check (seed determinism + concurrency cap). This is the only test; there is no lint script.
- `npx tsc --noEmit` — typecheck
- Env (`.env`, see `.env.example`): `NEBIUS_API_KEY`, `NEBIUS_BASE_URL`, `TAVILY_API_KEY`, `MODEL_NANO`, `MODEL_ULTRA`, optional `NANO_CONCURRENCY` (default 16). Token Factory model ids come from `GET $NEBIUS_BASE_URL/models`.
- Every real run spends Token Factory/Tavily quota. Don't trigger pipeline runs for routine testing; run only when it answers a specific question.

## Architecture

Swarm simulates a focus group on a landing page: Tavily research → Ultra builds buyer segments → code samples seeded personas → one Nano call per persona → Ultra clusters objections and rewrites weak sections → same personas re-run on the rewrite for a before/after score.

- `app/api/swarm/route.ts` — the pipeline, streamed as SSE (`research`, `sections`, `segments`, `personas`, `reaction`, `done`, `error`) via `lib/sse.ts`. Takes either `{url|text, audience, n}` (full run) or `{sections, segments, seed, n}` (re-run on rewritten copy; skips research).
- `app/api/verdict/route.ts` — Ultra: reactions → ranked objection themes + rewrites of the 3 worst sections (non-streaming JSON).
- `lib/personas.ts` — personas are *not* LLM-generated: `samplePersonas(segments, n, seed)` is deterministic (mulberry32), which is what makes the before/after comparison fair. The client keeps `segments` and `seed` and sends them back for the re-run. Also holds `pMap` (concurrency limiter).
- `lib/llm.ts` — OpenAI SDK pointed at Token Factory; `json()` retries 429/5xx/bad JSON with backoff. `lib/tavily.ts` — raw `fetch` to Tavily `extract`/`search`, plus `toSections` (splits extract markdown at headings; section index is the unit for drop-off).
- `app/page.tsx` — single client component, a phase state machine (`idle → running → done → judging → verdict → rerunning → rerun`). It parses SSE by hand and batches reaction state updates every 100ms. Conversion score = % `buy`.

## Frontend rules (enforced by DESIGN.md)

- Colors only via CSS variables defined in `app/globals.css`; no hex, arbitrary Tailwind values, gradients, or `box-shadow`/shadow utilities elsewhere (status bars, focus ring, media shadow are classes in `globals.css`). Accent is NVIDIA green. The only allowed arbitrary value is the `max-w-[1120px]` page width.
- Reusable primitives live in `components/ui/`; reuse them rather than restyling.
- Status is `ok`/`held`/`blocked` with a text label next to the colour, never colour alone. Data views need loading/empty/error states.
- Run the grep checks at the bottom of `DESIGN.md` before calling UI work done (adjust `src` to `app components lib`).
