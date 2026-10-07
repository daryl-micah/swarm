import { json, ULTRA } from "@/lib/llm";

export const maxDuration = 120;

type Reaction = { verdict: string; dropSection: number; objection: string };

export async function POST(req: Request) {
  const { sections, reactions }: { sections: string[]; reactions: Reaction[] } = await req.json();
  const bad = reactions.filter((r) => r.verdict !== "buy" && r.objection).slice(0, 300);
  const drops = sections.map((_, i) => bad.filter((r) => r.dropSection === i).length);
  const out = await json<{ objections: { theme: string; count: number }[]; rewrites: { index: number; text: string }[] }>(
    ULTRA,
    'You are a conversion copywriter. Cluster the objections into ranked themes, then rewrite the 3 sections with the most drop-offs to address them, keeping markdown and the product\'s real claims. Return JSON {"objections":[{"theme":string,"count":number}],"rewrites":[{"index":number,"text":string}]}.',
    `SECTIONS:\n${sections.map((s, i) => `[${i}] (drops: ${drops[i]}) ${s}`).join("\n\n")}\n\nOBJECTIONS:\n${bad.map((r) => `- ${r.objection}`).join("\n")}`,
    0.5,
  );
  return Response.json(out);
}
