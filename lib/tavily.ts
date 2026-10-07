async function tavily(path: string, body: object) {
  const r = await fetch(`https://api.tavily.com/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`tavily ${path} ${r.status}`);
  return r.json();
}

export type Source = { title: string; url: string; content: string };

export async function extract(url: string): Promise<string> {
  const j = await tavily("extract", { urls: [url] });
  const text = j.results?.[0]?.raw_content;
  if (!text) throw new Error("extract returned no content");
  return text;
}

export async function search(query: string): Promise<Source[]> {
  const j = await tavily("search", { query, max_results: 4 });
  return (j.results ?? []).map((x: any) => ({ title: x.title, url: x.url, content: String(x.content).slice(0, 600) }));
}

// split markdown into sections at headings; fall back to paragraph chunks
export function toSections(md: string): string[] {
  const parts = md.split(/\n(?=#{1,3} )/).map((s) => s.trim()).filter((s) => s.length > 40);
  if (parts.length > 1) return parts.slice(0, 14);
  return md.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 40).slice(0, 14);
}
