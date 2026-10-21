"use client";

import { useMutation } from "convex/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { api } from "@/lib/convex-api";
import {
  guardianBookmarklet,
  parseGuardianImport,
} from "@/lib/guardian-import";
import {
  createGuestIdentity,
  createRoomSlug,
  readGuestIdentity,
} from "@/lib/guest";

export function ImportPuzzle() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const [payload, setPayload] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // React intentionally sanitizes javascript: URLs in JSX. Setting this
    // user-dragged bookmark only after hydration preserves that protection
    // everywhere else while allowing the explicit bookmarklet interaction.
    bookmarkletRef.current?.setAttribute("href", guardianBookmarklet);
  }, []);

  function validate(value: string) {
    setPayload(value);
    setError("");
    setPreview("");
    if (!value.trim()) return;
    try {
      const imported = parseGuardianImport(value);
      setPreview(
        `${imported.puzzle.name} · ${imported.puzzle.entries.length} clues`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that puzzle.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      setError("The Convex deployment URL has not been configured yet.");
      return;
    }
    try {
      const imported = parseGuardianImport(payload);
      const savedIdentity = readGuestIdentity();
      const identity =
        savedIdentity && !name.trim()
          ? savedIdentity
          : createGuestIdentity(name || savedIdentity?.name || "");
      if (!identity.name) throw new Error("Choose a display name.");

      setSubmitting(true);
      const slug = createRoomSlug();
      await createRoom({
        slug,
        sourceUrl: imported.sourceUrl,
        puzzle: imported.puzzle,
        ...identity,
      });
      router.push(`/room/${slug}`);
    } catch (cause) {
      setSubmitting(false);
      setError(cause instanceof Error ? cause.message : "Could not create the room.");
    }
  }

  return (
    <form className="import-card" onSubmit={submit}>
      <div className="instruction">
        <span className="instruction-number">1</span>
        <div>
          <h2>Save the importer</h2>
          <p>
            Drag this button to your bookmarks bar. It only reads the puzzle on
            the page you choose; our server never fetches Guardian pages.
          </p>
          <a
            ref={bookmarkletRef}
            className="button button-primary button-small bookmarklet"
            href="#bookmarklet"
            onClick={(event) => event.preventDefault()}
            title="Drag this link to your bookmarks bar"
          >
            Copy Guardian cryptic
          </a>
        </div>
      </div>

      <div className="instruction">
        <span className="instruction-number">2</span>
        <div>
          <h2>Open a Guardian crossword</h2>
          <p>
            Visit the puzzle, then click the bookmark you just saved.{" "}
            <a
              href="https://www.theguardian.com/crosswords/series/cryptic"
              target="_blank"
              rel="noreferrer"
            >
              Browse Guardian cryptics <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>

      <div className="instruction">
        <span className="instruction-number">3</span>
        <div>
          <h2>Paste and make your room</h2>
          <p>The copied puzzle stays inside the private room you create.</p>
        </div>
      </div>

      <div className="field">
        <label htmlFor="puzzle-data">Puzzle data</label>
        <textarea
          id="puzzle-data"
          value={payload}
          onChange={(event) => validate(event.target.value)}
          placeholder='Paste the JSON copied by “Copy Guardian cryptic”…'
          spellCheck={false}
          required
        />
        {preview && <span className="form-success">{preview}</span>}
      </div>

      <div className="field">
        <label htmlFor="display-name">Your display name</label>
        <input
          id="display-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Alex"
          maxLength={40}
        />
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="button button-primary import-submit"
        disabled={!preview || submitting}
      >
        {submitting ? "Creating room…" : "Create private room"}
        {!submitting && <ArrowRight size={18} aria-hidden="true" />}
      </button>
      <p className="legal-note">
        Cryptic Together is not affiliated with The Guardian. Puzzle content is
        copied by you for a private solving room and linked back to its source.
        Public or commercial reuse may require permission from Guardian
        Licensing.
      </p>
    </form>
  );
}

