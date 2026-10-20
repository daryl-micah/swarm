"use client";
import { useCallback, useState } from "react";
import type { Persona, Segment } from "@/lib/personas";
import type { Frame, Reaction, Verdict } from "@/lib/run";

export type Phase = "idle" | "running" | "done" | "judging" | "verdict" | "rerunning" | "rerun";

export type RunState = {
  phase: Phase;
  error: string;
  log: { line: string; source?: { title: string; url: string } }[];
  sections: string[];
  segments: Segment[];
  personas: Persona[];
  seed: number;
  reactions: Map<number, Reaction>;
  first?: Map<number, Reaction>; // the original run, kept once a re-run starts
  verdict?: Verdict;
  rewritten: string[]; // sections with the verdict's rewrites applied
};

const init: RunState = { phase: "idle", error: "", log: [], sections: [], segments: [], personas: [], seed: 0, reactions: new Map(), rewritten: [] };

// One run's state, fed by any frame source: the live /api/swarm stream or a recorded capture.
export function useRun() {
  const [s, set] = useState<RunState>(init);
  const patch = useCallback((p: Partial<RunState>) => set((x) => ({ ...x, ...p })), []);

  // rerun = feed reactions for the rewritten page into the same personas; an aborted source leaves state alone
  const consume = useCallback(async (src: AsyncIterable<Frame>, rerun = false, signal?: AbortSignal) => {
    set((x) => (rerun
      ? { ...x, phase: "rerunning", error: "", first: x.reactions, reactions: new Map() }
      : { ...init, phase: "running" }));
    const acc = new Map<number, Reaction>();
    let timer = 0;
    try {
      for await (const { event, data } of src) {
        if (signal?.aborted) break;
        if (event === "research") set((x) => ({ ...x, log: [...x.log, data] }));
        else if (event === "sections") patch({ sections: data });
        else if (event === "segments") patch({ segments: data });
        else if (event === "personas") patch({ seed: data.seed, personas: data.personas });
        else if (event === "reaction") {
          acc.set(data.id, data);
          // batch grid updates: hundreds of reactions would otherwise re-render per event
          timer ||= window.setTimeout(() => { timer = 0; if (!signal?.aborted) patch({ reactions: new Map(acc) }); }, 100);
        } else if (event === "error") throw new Error(data.message);
      }
      clearTimeout(timer);
      if (signal?.aborted) return false;
      patch({ reactions: new Map(acc), phase: rerun ? "rerun" : "done" });
      return true;
    } catch (e: any) {
      clearTimeout(timer);
      if (signal?.aborted) return false;
      // a failed re-run restores the original run so the verdict can be retried
      set((x) => (rerun
        ? { ...x, reactions: x.first ?? new Map(acc), first: undefined, error: e.message, phase: "verdict" }
        : { ...x, reactions: new Map(acc), error: e.message, phase: "idle" }));
      return false;
    }
  }, [patch]);

  const applyVerdict = useCallback((verdict: Verdict) => {
    set((x) => {
      const rewritten = [...x.sections];
      for (const w of verdict.rewrites) if (w.text && rewritten[w.index] !== undefined) rewritten[w.index] = w.text;
      return { ...x, verdict, rewritten, phase: "verdict", error: "" };
    });
  }, []);

  const reset = useCallback(() => set(init), []);

  return { s, patch, consume, applyVerdict, reset };
}
