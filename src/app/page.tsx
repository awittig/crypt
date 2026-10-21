import { ArrowRight, MessageCircle, MousePointer2, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="site-nav">
        <Link href="/" className="wordmark">
          <span aria-hidden="true" className="wordmark-grid">CT</span>
          Cryptic Together
        </Link>
        <Link href="/import" className="button button-small button-ghost">
          Start a room
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">The weekend ritual, shared</p>
          <h1>Two heads are better than one across.</h1>
          <p className="hero-lede">
            Bring a Guardian cryptic into a private room, invite a friend, and
            watch every letter, clue, and bright idea appear in real time.
          </p>
          <div className="hero-actions">
            <Link href="/import" className="button button-primary">
              Start solving <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="button button-ghost">
              How it works
            </a>
          </div>
        </div>
        <div className="hero-puzzle" aria-hidden="true">
          <div className="mini-grid">
            {["C", "R", "Y", "P", "T", "I", "C", "", "T", "O", "G", "E", "T", "H", "E", "R"].map(
              (letter, index) => (
                <span className={letter ? "" : "blocked"} key={index}>
                  {letter}
                </span>
              ),
            )}
          </div>
          <div className="pencil-note">“Perhaps it’s an anagram?”</div>
        </div>
      </section>

      <section className="steps-section" id="how-it-works">
        <p className="eyebrow">No accounts, no fuss</p>
        <h2>From clue to collaboration in three steps.</h2>
        <div className="steps">
          <article>
            <MousePointer2 aria-hidden="true" />
            <span>01</span>
            <h3>Copy the puzzle</h3>
            <p>Use our bookmarklet on the Guardian crossword page.</p>
          </article>
          <article>
            <Users aria-hidden="true" />
            <span>02</span>
            <h3>Share one link</h3>
            <p>Your private, unlisted room opens instantly.</p>
          </article>
          <article>
            <MessageCircle aria-hidden="true" />
            <span>03</span>
            <h3>Solve together</h3>
            <p>See live letters, cursors, participants, and chat.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <span>Cryptic Together is an independent collaboration tool.</span>
        <span>Guardian puzzles remain © Guardian News &amp; Media.</span>
      </footer>
    </main>
  );
}
