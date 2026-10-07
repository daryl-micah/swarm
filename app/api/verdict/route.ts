import { json, ULTRA } from "@/lib/llm";

export const maxDuration = 120;

type Reaction = { verdict: string; dropSection: number; objection: string };

export async function POST(req: Request) {
  const { sections, reactions }: { sections: string[]; reactions: Reaction[] } = await req.json();
  const bad = reactions.filter((r) => r.verdict !== "buy" && r.objection).slice(0, 300);
  const drops = sections.map((_, i) => bad.filter((r) => r.dropSection === i).length);
  const out = await json<{ objections: { theme: string; count: number }[]; rewrites: { index: number; text: string }[]; gaps: string[] }>(
    ULTRA,
    'You are a conversion copywriter. Reply with ONLY the JSON object described at the end of the user message; no other keys.',
    `RULES: Never invent product claims. Every feature, number, price, integration, customer, certification, version and link in a rewrite must already appear in the SECTIONS; reword, reorder, clarify and cut, but add no facts. If an objection asks for something the page does not state, do not address it in the copy; list it in gaps. Keep markdown.\nTASK: cluster the objections into ranked themes with counts, and rewrite the 3 sections with the most drops.\n\nSECTIONS:\n${sections.map((s, i) => `[${i}] (drops: ${drops[i]}) ${s}`).join("\n\n")}\n\nOBJECTIONS:\n${bad.map((r) => `- ${r.objection}`).join("\n")}\n\nOUTPUT FORMAT, exactly these three keys: {"objections":[{"theme":string,"count":number}],"rewrites":[{"index":number,"text":string}],"gaps":[string]}`,
    0.5,
  );
  if (!Array.isArray(out.objections) || !Array.isArray(out.rewrites)) throw new Error("verdict model returned an unexpected shape");
  // the model sometimes names the rewrite field "section"
  out.rewrites = out.rewrites.map((w: any) => ({ index: w.index, text: w.text ?? w.section }));
  return Response.json(out);
}
