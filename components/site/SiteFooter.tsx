import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1120px] px-6 py-12 flex flex-col md:flex-row gap-6 small text-muted-foreground">
        <div className="flex flex-col gap-2 mr-auto">
          <span className="h3 text-foreground">Swarm</span>
          <span>Runs on Nebius Token Factory · Nemotron 3 Nano and Ultra · Tavily</span>
          <span>Simulated customers. Directional signal, not a substitute for real users.</span>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          <Link className="link" href="/run">Run your page</Link>
          <Link className="link" href="/evidence">Evidence</Link>
          <Link className="link" href="/docs">Docs</Link>
        </nav>
        <span className="data">MIT licence</span>
      </div>
    </footer>
  );
}
