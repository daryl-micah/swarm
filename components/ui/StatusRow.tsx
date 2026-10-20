export type Status = "ok" | "held" | "blocked";

// card row with the 4px status bar and a required text label
export function StatusRow({ status, label, children, className = "", ...p }: { status: Status; label: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={`status-${status} bg-card border border-border rounded-card pl-6 pr-4 py-3 flex items-center gap-4 ${className}`}>
      <span className="label w-20 shrink-0">{label}</span>
      {children}
    </div>
  );
}
