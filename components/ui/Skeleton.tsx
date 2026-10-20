export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bg-muted rounded-card ${className}`} />;
}
