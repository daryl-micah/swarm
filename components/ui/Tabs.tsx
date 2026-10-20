"use client";
import { useId, useRef, useState } from "react";

type Tab = { id: string; label: React.ReactNode; content: React.ReactNode };

// WAI-ARIA tabs: arrow keys / Home / End move between tabs
export function Tabs({ tabs, initial, onChange }: { tabs: Tab[]; initial?: string; onChange?: (id: string) => void }) {
  const base = useId();
  const [active, setActive] = useState(initial ?? tabs[0].id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (i: number) => { setActive(tabs[i].id); onChange?.(tabs[i].id); refs.current[i]?.focus(); };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((next + tabs.length) % tabs.length);
  };
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-6 border-b border-border overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`${base}-t-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`${base}-p-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onKey(e, i)}
            className="tab label py-3 whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-p-${t.id}`} aria-labelledby={`${base}-t-${t.id}`} hidden={active !== t.id} tabIndex={0}>
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}
