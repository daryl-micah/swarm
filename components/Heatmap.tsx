import { StatusRow } from "@/components/ui/StatusRow";
import { sectionTitle, type Reaction } from "@/lib/run";

// Drop-offs per page section. Expanding a row shows the section text and the quotes of personas who left there.
export function Heatmap({ sections, reactions }: { sections: string[]; reactions: Map<number, Reaction> }) {
  const left = [...reactions.values()].filter((r) => r.verdict === "maybe" || r.verdict === "bounce");
  const drops = sections.map((_, i) => left.filter((r) => r.dropSection === i));
  const max = Math.max(1, ...drops.map((d) => d.length));
  return (
    <ol className="flex flex-col gap-2">
      {sections.map((s, i) => {
        const level = drops[i].length / max;
        const [status, label] = level > 0.66 ? (["blocked", "LOSES"] as const) : level > 0.33 ? (["held", "LEAKS"] as const) : (["ok", "HOLDS"] as const);
        return (
          <li key={i}>
            <details className="group">
              <summary className="list-none cursor-pointer rounded-card">
                <StatusRow status={status} label={label}>
                  <span className="data text-muted-foreground w-8 shrink-0">§{i}</span>
                  <span className="small truncate flex-1 min-w-0">{sectionTitle(s) || "(untitled section)"}</span>
                  <span className="data w-12 text-right">{drops[i].length}</span>
                </StatusRow>
              </summary>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
                <pre className="data whitespace-pre-wrap text-muted-foreground max-h-64 overflow-auto">{s.slice(0, 1500)}</pre>
                <ul className="small flex flex-col gap-2">
                  {drops[i].slice(0, 6).map((r) => <li key={r.id}>“{r.quote}”</li>)}
                  {!drops[i].length && <li className="text-muted-foreground">Nobody left at this section.</li>}
                </ul>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
