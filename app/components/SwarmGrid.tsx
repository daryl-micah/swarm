export type Verdict = "buy" | "maybe" | "bounce" | null;

const COLOR = { buy: "bg-green", maybe: "bg-amber", bounce: "bg-red" } as const;

export default function SwarmGrid({ verdicts, quotes }: { verdicts: Verdict[]; quotes?: string[] }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(14px, 1fr))" }}>
      {verdicts.map((v, i) => (
        <span
          key={i}
          title={quotes?.[i] ?? v ?? "waiting"}
          className={`aspect-square rounded-full transition-colors duration-300 ${v ? COLOR[v] : "bg-muted border border-border"}`}
        />
      ))}
    </div>
  );
}
