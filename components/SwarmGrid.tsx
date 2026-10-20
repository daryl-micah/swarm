"use client";
import { useRef } from "react";
import type { Persona } from "@/lib/personas";
import type { Reaction } from "@/lib/run";

const cls: Record<string, string> = { buy: "bg-green", maybe: "bg-amber", bounce: "bg-destructive", error: "bg-border" };
const word: Record<string, string> = { buy: "buy", maybe: "maybe", bounce: "bounced", error: "failed" };

type Props = {
  personas: Persona[];
  reactions: Map<number, Reaction>;
  grouped?: boolean; // one row block per segment
  selected?: number;
  onSelect?: (id: number) => void; // makes cells interactive
};

// One cell per persona. Interactive grids are a single tab stop; arrow keys move between cells.
export function SwarmGrid({ personas, reactions, grouped, selected, onSelect }: Props) {
  const refs = useRef(new Map<number, HTMLButtonElement>());
  const order = grouped ? [...personas].sort((a, b) => a.segment.localeCompare(b.segment) || a.id - b.id) : personas;
  const groups = grouped ? Object.entries(Object.groupBy(order, (p) => p.segment)) : [["", order] as const];
  const focusId = selected ?? order[0]?.id;

  const onKey = (e: React.KeyboardEvent, id: number) => {
    const i = order.findIndex((p) => p.id === id);
    const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: order.length - 1 }[e.key];
    if (j === undefined || !order[j]) return;
    e.preventDefault();
    onSelect!(order[j].id);
    refs.current.get(order[j].id)?.focus();
  };

  const cell = (p: Persona) => {
    const r = reactions.get(p.id);
    const color = r ? cls[r.verdict] ?? "bg-border" : "bg-muted";
    const name = `${p.name}, ${p.segment}: ${r ? word[r.verdict] ?? r.verdict : "waiting"}`;
    if (!onSelect) return <span key={p.id} title={r ? `${p.name}: ${r.quote}` : p.name} className={`cell aspect-square rounded-sm ${color}`} />;
    return (
      <button
        key={p.id}
        ref={(el) => { if (el) refs.current.set(p.id, el); else refs.current.delete(p.id); }}
        type="button"
        aria-label={name}
        aria-pressed={selected === p.id}
        tabIndex={p.id === focusId ? 0 : -1}
        onClick={() => onSelect(p.id)}
        onKeyDown={(e) => onKey(e, p.id)}
        className={`cell aspect-square rounded-sm ${color} ${selected === p.id ? "outline-2 outline-foreground outline-offset-1" : ""}`}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4" role="group" aria-label={`${personas.length} personas`}>
      {groups.map(([seg, ps]) => (
        <div key={seg} className="flex flex-col gap-2">
          {grouped && <p className="label text-muted-foreground">{seg} · {ps!.length}</p>}
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(16px, 1fr))" }}>{ps!.map(cell)}</div>
        </div>
      ))}
    </div>
  );
}
