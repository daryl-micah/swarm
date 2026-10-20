import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: { default: "Swarm", template: "%s · Swarm" },
  description: "A focus group of hundreds of simulated customers that reads your landing page, shows where it loses people, and measures the rewrite.",
};

const theme = `document.documentElement.classList.toggle("dark",matchMedia("(prefers-color-scheme: dark)").matches)`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: theme }} /></head>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only btn btn-secondary">Skip to content</a>
        <SiteHeader />
        <div id="main" className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
