export function Heatmap({ sections, drops }: { sections: string[]; drops: number[] }) {
  const max = Math.max(1, ...drops);
  return (
    <ol className="flex flex-col gap-2">
      {sections.map((s, i) => {
        const level = drops[i] / max;
        const status = level > 0.66 ? "status-blocked" : level > 0.33 ? "status-held" : "status-ok";
        const label = level > 0.66 ? "BLOCKED" : level > 0.33 ? "HELD" : "OK";
        return (
          <li key={i} className={`${status} bg-card border border-border rounded-card pl-6 pr-4 py-3 flex items-center gap-4`}>
            <span className="label w-20 shrink-0">{label}</span>
            <span className="small truncate flex-1">{s.replace(/^#+\s*/, "").split("\n")[0]}</span>
            <span className="data w-12 text-right">{drops[i]}</span>
          </li>
        );
      })}
    </ol>
  );
}
