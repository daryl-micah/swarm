import fs from "node:fs";
import path from "node:path";
import type { Frame } from "./run";

// reads a recorded capture at build/render time (server components only)
export function readFrames(file: string): Frame[] {
  const raw = fs.readFileSync(path.join(process.cwd(), "public/evidence", file), "utf8");
  return raw.split("\n\n").filter(Boolean).map((f) => {
    const [, event, data] = /^event: (.*)\ndata: (.*)$/s.exec(f)!;
    return { event, data: JSON.parse(data) };
  });
}

export const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/evidence", file), "utf8"));
