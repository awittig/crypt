import type { Metadata } from "next";
import Link from "next/link";

import { ImportPuzzle } from "@/components/import-puzzle";

export const metadata: Metadata = {
  title: "Import a puzzle",
  description: "Create a private collaborative room from a Guardian cryptic.",
};

export default function ImportPage() {
  return (
    <main>
      <nav className="site-nav">
        <Link href="/" className="wordmark">
          <span aria-hidden="true" className="wordmark-grid">CT</span>
          Cryptic Together
        </Link>
      </nav>
      <div className="center-page">
        <div className="import-shell">
          <header className="import-header">
            <p className="eyebrow">Create a private room</p>
            <h1>Bring your cryptic.</h1>
            <p>
              A tiny browser bookmark copies the puzzle you are viewing. Paste
              it here, send one private link, and solve in sync.
            </p>
          </header>
          <ImportPuzzle />
        </div>
      </div>
    </main>
  );
}

