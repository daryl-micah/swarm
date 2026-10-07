export type Segment = {
  name: string;
  weight: number;
  painPoints: string[];
  budget: [number, number]; // monthly $ range
};

export type Persona = {
  id: number;
  name: string;
  segment: string;
  budget: number;
  skepticism: number; // 0..1
  techSavvy: number; // 0..1
  painPoint: string;
};

// mulberry32: tiny seeded RNG, same seed -> same sequence
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Ava", "Liam", "Noor", "Mateo", "Yuki", "Priya", "Omar", "Elena", "Kofi", "Sofia", "Jonas", "Mei", "Raj", "Zara", "Tom", "Ines"];
const LAST = ["Chen", "Okafor", "Silva", "Novak", "Haddad", "Kim", "Rossi", "Patel", "Müller", "Nguyen", "Cohen", "Reyes"];

export function samplePersonas(segments: Segment[], n: number, seed: number): Persona[] {
  const r = rng(seed);
  const total = segments.reduce((s, x) => s + x.weight, 0);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return Array.from({ length: n }, (_, id) => {
    let x = r() * total;
    const seg = segments.find((s) => (x -= s.weight) < 0) ?? segments[segments.length - 1];
    const [lo, hi] = seg.budget;
    return {
      id,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      segment: seg.name,
      budget: Math.round(lo + r() * (hi - lo)),
      skepticism: Math.round(r() * 100) / 100,
      techSavvy: Math.round(r() * 100) / 100,
      painPoint: pick(seg.painPoints),
    };
  });
}

// runs fn over items with at most `limit` in flight; results keep input order
export async function pMap<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

if (process.argv[1]?.endsWith("personas.ts")) (async () => {
  const segs: Segment[] = [
    { name: "a", weight: 3, painPoints: ["x", "y"], budget: [10, 50] },
    { name: "b", weight: 1, painPoints: ["z"], budget: [100, 200] },
  ];
  const p1 = samplePersonas(segs, 50, 7);
  assert(JSON.stringify(p1) === JSON.stringify(samplePersonas(segs, 50, 7)), "same seed -> same personas");
  assert(JSON.stringify(p1) !== JSON.stringify(samplePersonas(segs, 50, 8)), "different seed differs");
  let live = 0, peak = 0;
  await pMap(Array.from({ length: 30 }, (_, i) => i), 4, async () => {
    peak = Math.max(peak, ++live);
    await new Promise((r) => setTimeout(r, 5));
    live--;
  });
  assert(peak <= 4, `concurrency cap exceeded: ${peak}`);
  console.log("personas ok, peak concurrency", peak);
})();

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}
