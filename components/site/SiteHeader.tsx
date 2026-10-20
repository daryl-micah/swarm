"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/evidence", "Evidence"], ["/docs", "Docs"]] as const;

export function SiteHeader() {
  const path = usePathname();
  const nav = LINKS.map(([href, label]) => (
    <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} className="tab small py-2">{label}</Link>
  ));
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-[1120px] px-6 h-16 flex items-center gap-6">
        <Link href="/" className="h3 mr-auto">Swarm</Link>
        <nav aria-label="Main" className="hidden sm:flex items-center gap-6">{nav}</nav>
        <Link href="/run" className="btn btn-primary hidden sm:inline-flex">Run your page</Link>
        <details className="sm:hidden relative">
          <summary className="btn btn-secondary list-none cursor-pointer">Menu</summary>
          <nav aria-label="Main" className="absolute right-0 mt-2 z-10 bg-card border border-border rounded-card p-4 flex flex-col gap-2 w-48">
            {nav}
            <Link href="/run" className="btn btn-primary">Run your page</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
