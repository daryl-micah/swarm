import { Badge } from "./Badge";

export function Alert({ status = "blocked", children, action }: { status?: "held" | "blocked"; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="alert" className={`status-${status} bg-card border border-border rounded-card pl-6 pr-4 py-3 flex flex-wrap items-center gap-4`}>
      <Badge status={status} />
      <span className="small flex-1">{children}</span>
      {action}
    </div>
  );
}
