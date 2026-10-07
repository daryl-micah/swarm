export type Reaction = { id: number; verdict: string; dropSection: number; objection: string; quote: string };

const cls: Record<string, string> = { buy: "bg-green", maybe: "bg-amber", bounce: "bg-destructive", error: "bg-border" };

export function SwarmGrid({ names, reactions }: { names: string[]; reactions: Map<number, Reaction> }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(16px, 1fr))" }} role="list" aria-label="Personas">
      {names.map((n, id) => {
        const r = reactions.get(id);
        return (
          <div key={id} role="listitem" title={r ? `${n}: ${r.quote}` : n} className={`cell aspect-square rounded-sm ${r ? cls[r.verdict] ?? "bg-border" : "bg-muted"}`} />
        );
      })}
    </div>
  );
}
