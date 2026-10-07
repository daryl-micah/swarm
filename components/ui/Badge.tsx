const tone = {
  ok: ["bg-green-soft", "bg-green", "OK"],
  held: ["bg-amber-soft", "bg-amber", "HELD"],
  blocked: ["bg-destructive-soft", "bg-destructive", "BLOCKED"],
} as const;

export function Badge({ status, children }: { status: keyof typeof tone; children?: React.ReactNode }) {
  const [bg, dot, text] = tone[status];
  return (
    <span className={`label inline-flex items-center gap-2 px-2 rounded-card ${bg}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {children ?? text}
    </span>
  );
}
