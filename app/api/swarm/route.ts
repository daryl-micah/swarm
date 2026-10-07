import { json, NANO, ULTRA } from "@/lib/llm";
import { pMap, samplePersonas, type Segment } from "@/lib/personas";
import { sse } from "@/lib/sse";
import { extract, search, toSections } from "@/lib/tavily";

export const maxDuration = 300;
const CAP = Number(process.env.NANO_CONCURRENCY ?? 16);

type Body = { url?: string; text?: string; audience?: string; n?: number; seed?: number; sections?: string[]; segments?: Segment[] };

export async function POST(req: Request) {
  const b: Body = await req.json();
  const n = Math.min(Math.max(b.n ?? 200, 1), 1000);
  const seed = b.seed ?? Math.floor(Math.random() * 1e9);

  return sse(async (send) => {
    let sections = b.sections;
    let segments = b.segments;

    if (!sections || !segments) {
      let md = b.text ?? "";
      if (!md) {
        send("research", { line: `extract ${b.url}` });
        md = await extract(b.url!);
      }
      sections = toSections(md);
      send("research", { line: `${sections.length} sections found` });
      send("sections", sections);

      const hint = b.audience || `${new URL(b.url ?? "http://x").hostname.replace(/^www\./, "").split(".")[0]} ${sections[0].replace(/[#*\[\]()]/g, " ").replace(/\s+/g, " ").slice(0, 80)}`;
      const queries = [`${hint} competitors alternatives`, `${hint} reviews complaints`, `reddit ${hint} frustrations`];
      const found = (await Promise.all(queries.map((q) => search(q).catch(() => [])))).flat();
      for (const s of found) send("research", { line: `search hit`, source: { title: s.title, url: s.url } });

      segments = (
        await json<{ segments: Segment[] }>(
          ULTRA,
          'You design buyer segments for a focus group. Return JSON {"segments":[{"name":string,"weight":number,"painPoints":string[],"budget":[number,number]}]} with about 12 segments. Budget is monthly USD. Ground pain points in the research.',
          `PAGE:\n${md.slice(0, 6000)}\n\nRESEARCH:\n${found.map((s) => `- ${s.title}: ${s.content}`).join("\n")}`,
          0.5,
        )
      ).segments;
    }
    send("segments", segments);

    const personas = samplePersonas(segments, n, seed);
    send("personas", { seed, personas });

    const page = sections.map((s, i) => `[${i}] ${s}`).join("\n\n");
    await pMap(personas, CAP, async (p) => {
      try {
        const r = await json<{ verdict: string; dropSection: number; objection: string; quote: string }>(
          NANO,
          'You are a customer reading a landing page. Stay in character and decide from your own budget, skepticism and pain point. Be honest, not polite or hedging: pick "buy" when the page clearly solves your pain point at a price you can afford, "bounce" when it clearly does not, and "maybe" only when truly torn. Expect a realistic spread of all three. Return JSON {"verdict":"buy"|"maybe"|"bounce","dropSection":index of the section where you lost interest or -1,"objection":short phrase,"quote":one sentence in your voice}.',
          `You: ${p.name}, ${p.segment}. Budget $${p.budget}/mo. Skepticism ${p.skepticism} (0-1). Tech-savvy ${p.techSavvy} (0-1). You care most about: ${p.painPoint}.\n\nPAGE SECTIONS:\n${page}`,
          1,
        );
        send("reaction", { id: p.id, ...r });
      } catch (e: any) {
        send("reaction", { id: p.id, verdict: "error", dropSection: -1, objection: "", quote: String(e?.message ?? e) });
      }
    });
    send("done", {});
  });
}
