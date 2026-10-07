export function Card({ className = "", ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={`bg-card border border-border rounded-card p-6 ${className}`} />;
}
