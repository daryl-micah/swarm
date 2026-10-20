// Client-safe shapes and helpers shared by the live run, evidence replays and the verdict route.

export type Reaction = { id: number; verdict: string; dropSection: number; objection: string; quote: string };
export type Verdict = { objections: { theme: string; count: number }[]; rewrites: { index: number; text: string }[]; gaps: string[] };
export type Frame = { event: string; data: any };

// the verdict model sometimes renames fields or returns gaps as one string
export function normalizeVerdict(v: any): Verdict {
  if (!Array.isArray(v?.objections) || !Array.isArray(v?.rewrites)) throw new Error("verdict model returned an unexpected shape");
  const gaps = Array.isArray(v.gaps) ? v.gaps : typeof v.gaps === "string" && v.gaps ? [v.gaps] : [];
  return { objections: v.objections, rewrites: v.rewrites.map((w: any) => ({ index: w.index, text: w.text ?? w.section })), gaps };
}

// parses an SSE body (live /api/swarm or a recorded .sse file) into frames
export async function* frames(body: ReadableStream<Uint8Array>): AsyncGenerator<Frame> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = done ? "" : parts.pop()!;
    for (const f of parts) {
      const [, event, data] = /^event: (.*)\ndata: (.*)$/s.exec(f) ?? [];
      if (event) yield { event, data: JSON.parse(data) };
    }
    if (done) return;
  }
}

// replays recorded frames at roughly `perSecond` reactions per second; stops early when aborted
export async function* paced(src: AsyncIterable<Frame>, perSecond: number, signal?: AbortSignal): AsyncGenerator<Frame> {
  for await (const f of src) {
    if (signal?.aborted) return;
    if (f.event === "reaction" || f.event === "research") await new Promise((r) => setTimeout(r, 1000 / perSecond));
    yield f;
  }
}

export const tally = (rs: Iterable<Reaction>) => {
  const c = { buy: 0, maybe: 0, bounce: 0, error: 0 };
  for (const r of rs) c[r.verdict as keyof typeof c] = (c[r.verdict as keyof typeof c] ?? 0) + 1;
  return c;
};

export const buyPct = (rs: Map<number, Reaction>, n: number) => (n ? Math.round((100 * tally(rs.values()).buy) / n) : 0);

// first line of a section, without markdown heading marks
export const sectionTitle = (s: string) => s.replace(/^#+\s*/, "").split("\n")[0].slice(0, 120);
