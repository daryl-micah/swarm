export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label text-muted-foreground">{label}</span>
      <span className="h2 tabular-nums">{value}</span>
      {note && <span className="data text-muted-foreground">{note}</span>}
    </div>
  );
}
