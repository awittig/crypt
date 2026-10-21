"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  Send,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { api } from "@/lib/convex-api";
import {
  adjacentCell,
  buildCrosswordIndex,
  cellKey,
  firstEntryForCell,
} from "@/lib/crossword";
import {
  createGuestIdentity,
  readGuestIdentity,
  type GuestIdentity,
} from "@/lib/guest";
import type { CrosswordEntry } from "@/lib/types";

const stripMarkup = (value: string) => value.replace(/<[^>]*>/g, "");

export function RoomSolver({ slug }: { slug: string }) {
  const roomData = useQuery(api.rooms.getRoom, { slug });
  const joinRoom = useMutation(api.rooms.joinRoom);
  const updatePresence = useMutation(api.rooms.updatePresence);
  const updateCell = useMutation(api.rooms.updateCell);
  const sendMessage = useMutation(api.rooms.sendMessage);

  const [identity, setIdentity] = useState<GuestIdentity | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [activeCell, setActiveCell] = useState<string>();
  const [activeEntry, setActiveEntry] = useState<string>();
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [checking, setChecking] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatScope, setChatScope] = useState<"room" | "clue">("room");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const lastUpdateRef = useRef(0);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const puzzle = roomData?.room.puzzle;
  const roomId = roomData?.room._id;
  const index = useMemo(
    () => (puzzle ? buildCrosswordIndex(puzzle) : null),
    [puzzle],
  );
  const values = useMemo(
    () => new Map(roomData?.cells.map((cell) => [cell.key, cell]) ?? []),
    [roomData?.cells],
  );
  const effectiveActiveCell = activeCell ?? index?.cells[0]?.key;
  const effectiveActiveEntry =
    activeEntry ?? index?.cells[0]?.entryIds[0];
  const chatChannel =
    chatScope === "clue" ? effectiveActiveEntry : undefined;
  const messages =
    useQuery(api.rooms.getMessages, { slug, channel: chatChannel }) ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readGuestIdentity();
      if (saved) setIdentity(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!identity || !roomId) return;
    void joinRoom({ slug, ...identity }).catch(() => {
      setJoinError("Could not connect to this room.");
    });
  }, [identity, joinRoom, roomId, slug]);

  useEffect(() => {
    if (!identity || !roomId) return;
    const heartbeat = () =>
      void updatePresence({
        slug,
        ...identity,
        selectedCell: effectiveActiveCell,
        activeEntry: effectiveActiveEntry,
      }).catch(() => undefined);
    heartbeat();
    const timer = window.setInterval(heartbeat, 15_000);
    return () => window.clearInterval(timer);
  }, [
    effectiveActiveCell,
    effectiveActiveEntry,
    identity,
    roomId,
    slug,
    updatePresence,
  ]);

  useEffect(() => {
    if (!identity || !roomData?.cells.length) return;
    const newest = [...roomData.cells].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (
      newest.updatedAt > lastUpdateRef.current &&
      newest.editorSessionId !== identity.sessionId
    ) {
      setAnnouncement(`${newest.editorName} entered ${newest.value || "a blank"}.`);
    }
    lastUpdateRef.current = Math.max(lastUpdateRef.current, newest.updatedAt);
  }, [identity, roomData?.cells]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (roomData === undefined) {
    return <RoomState title="Opening the grid…" detail="Connecting to the room." />;
  }

  if (roomData === null || !puzzle || !index) {
    return (
      <RoomState
        title="Room not found"
        detail="This private link may be incomplete or the room no longer exists."
      />
    );
  }

  if (!identity) {
    return (
      <div className="room-page">
        <RoomNav participants={roomData.participants} />
        <div className="join-wrap">
          <form
            className="join-card"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const created = createGuestIdentity(joinName);
                if (!created.name) throw new Error("Choose a display name.");
                setIdentity(created);
              } catch (cause) {
                setJoinError(
                  cause instanceof Error ? cause.message : "Could not join the room.",
                );
              }
            }}
          >
            <p className="eyebrow">You have been invited</p>
            <h1>Join “{puzzle.name}”</h1>
            <p>Your name and a color help your friend see where you are working.</p>
            <div className="field">
              <label htmlFor="join-name">Display name</label>
              <input
                id="join-name"
                autoFocus
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                maxLength={40}
                required
              />
            </div>
            {joinError && <p className="form-error">{joinError}</p>}
            <button className="button button-primary import-submit" type="submit">
              Join the room
            </button>
          </form>
        </div>
      </div>
    );
  }

  const guestArgs = { slug, ...identity };
  const currentEntry = effectiveActiveEntry
    ? index.entriesById.get(effectiveActiveEntry)
    : undefined;
  const total = index.cells.length;
  const filled = [...values.values()].filter((cell) => cell.value).length;
  const progress = total ? Math.round((filled / total) * 100) : 0;
  const hasSolutions = puzzle.entries.some((entry) => Boolean(entry.solution));

  function activateCell(key: string, toggleDirection = false) {
    const cell = index!.cellsByKey.get(key);
    if (!cell) return;
    let nextEntry: string | undefined;
    if (
      toggleDirection &&
      key === effectiveActiveCell &&
      cell.entryIds.length > 1
    ) {
      const currentIndex = cell.entryIds.indexOf(effectiveActiveEntry ?? "");
      nextEntry = cell.entryIds[(currentIndex + 1) % cell.entryIds.length];
    } else {
      nextEntry = firstEntryForCell(index!, key, direction);
    }
    const entry = nextEntry ? index!.entriesById.get(nextEntry) : undefined;
    setActiveCell(key);
    setActiveEntry(nextEntry);
    if (entry) setDirection(entry.direction);
  }

  function focusCell(key?: string) {
    if (!key) return;
    activateCell(key);
    window.requestAnimationFrame(() => inputRefs.current.get(key)?.focus());
  }

  function moveWithinEntry(step: number) {
    if (!effectiveActiveEntry || !effectiveActiveCell) return;
    const cells = index!.entryCells.get(effectiveActiveEntry) ?? [];
    const current = cells.findIndex((cell) => cell.key === effectiveActiveCell);
    const target = cells[current + step];
    if (target) focusCell(target.key);
  }

  async function writeCell(key: string, value: string) {
    await updateCell({ ...guestArgs, key, value });
  }

  function handleCellKey(
    event: KeyboardEvent<HTMLInputElement>,
    key: string,
  ) {
    const moves: Record<string, [number, number, "across" | "down"]> = {
      ArrowLeft: [-1, 0, "across"],
      ArrowRight: [1, 0, "across"],
      ArrowUp: [0, -1, "down"],
      ArrowDown: [0, 1, "down"],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [x, y, nextDirection] = moves[event.key];
      setDirection(nextDirection);
      const target = adjacentCell(puzzle!, index!, key, x, y);
      focusCell(target?.key);
      return;
    }
    if (event.key === "Backspace" && !values.get(key)?.value) {
      event.preventDefault();
      moveWithinEntry(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activateCell(key, true);
    }
  }

  async function revealEntry() {
    if (!currentEntry?.solution || !identity) return;
    if (!window.confirm(`Reveal ${currentEntry.humanNumber} ${currentEntry.direction}?`)) {
      return;
    }
    const cells = index!.entryCells.get(currentEntry.id) ?? [];
    await Promise.all(
      cells.map((cell, letterIndex) =>
        writeCell(cell.key, currentEntry.solution?.[letterIndex] ?? ""),
      ),
    );
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message;
    setMessage("");
    await sendMessage({ ...guestArgs, body, channel: chatChannel }).catch(() =>
      setMessage(body),
    );
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const entries = (wanted: "across" | "down") =>
    puzzle!.entries.filter((entry) => entry.direction === wanted);

  const isEntryComplete = (entry: CrosswordEntry) =>
    (index!.entryCells.get(entry.id) ?? []).every(
      (cell) => Boolean(values.get(cell.key)?.value),
    );

  return (
    <div className="room-page">
      <nav className="room-nav">
        <Link href="/" className="wordmark">
          <span aria-hidden="true" className="wordmark-grid">CT</span>
          Cryptic Together
        </Link>
        <div className="room-actions">
          <div className="participant-list" aria-label="Online participants">
            {roomData.participants.map((participant) => (
              <span
                className="participant-avatar"
                style={{ background: participant.color }}
                title={`${participant.name} is online`}
                key={participant.sessionId}
              >
                {participant.name.slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
          <button className="button button-small button-ghost" onClick={copyInvite}>
            <Copy size={15} aria-hidden="true" /> {copied ? "Copied" : "Invite"}
          </button>
          <button
            className="button button-small button-ghost"
            onClick={() => setShowChat((shown) => !shown)}
            aria-pressed={showChat}
          >
            <MessageCircle size={15} aria-hidden="true" /> Chat
          </button>
        </div>
      </nav>

      <div className="room-layout">
        <section className="puzzle-column">
          <header className="puzzle-meta">
            <h1>{puzzle.name}</h1>
            <div className="puzzle-meta-row">
              {puzzle.creator?.name && <span>Set by {puzzle.creator.name}</span>}
              <span>{new Date(puzzle.date).toLocaleDateString()}</span>
              <a href={roomData.room.sourceUrl} target="_blank" rel="noreferrer">
                Original at The Guardian <ExternalLink size={11} aria-hidden="true" />
              </a>
              <span className="connection-pill">
                <span className="connection-dot" /> Live
              </span>
              <span>{progress}% complete</span>
            </div>
            <div className="progress-track" aria-label={`${progress}% complete`}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <div
            className="crossword-grid"
            style={
              {
                "--grid-cols": puzzle.dimensions.cols,
                "--grid-rows": puzzle.dimensions.rows,
              } as CSSProperties
            }
            role="grid"
            aria-label={puzzle.name}
          >
            {Array.from(
              { length: puzzle.dimensions.rows * puzzle.dimensions.cols },
              (_, position) => {
                const x = position % puzzle.dimensions.cols;
                const y = Math.floor(position / puzzle.dimensions.cols);
                const key = cellKey(x, y);
                const cell = index.cellsByKey.get(key);
                if (!cell) return <span className="grid-block" key={key} />;
                const value = values.get(key)?.value ?? "";
                const inActiveEntry = effectiveActiveEntry
                  ? cell.entryIds.includes(effectiveActiveEntry)
                  : false;
                const incorrect =
                  checking && Boolean(value && cell.solution && value !== cell.solution);
                const remote = roomData.participants.find(
                  (participant) =>
                    participant.sessionId !== identity.sessionId &&
                    participant.selectedCell === key,
                );
                return (
                  <label
                    className={[
                      "grid-cell",
                      inActiveEntry ? "active-entry" : "",
                      effectiveActiveCell === key ? "active" : "",
                      incorrect ? "incorrect" : "",
                    ].join(" ")}
                    style={
                      remote
                        ? { boxShadow: `inset 0 0 0 3px ${remote.color}` }
                        : undefined
                    }
                    key={key}
                    role="gridcell"
                  >
                    {cell.number !== undefined && (
                      <span className="cell-number">{cell.number}</span>
                    )}
                    <input
                      ref={(node) => {
                        if (node) inputRefs.current.set(key, node);
                        else inputRefs.current.delete(key);
                      }}
                      aria-label={`Row ${y + 1}, column ${x + 1}`}
                      value={value}
                      maxLength={1}
                      autoComplete="off"
                      onFocus={() => activateCell(key)}
                      onKeyDown={(event) => handleCellKey(event, key)}
                      onChange={(event) => {
                        const letter = event.target.value
                          .replace(/[^A-Za-z]/g, "")
                          .slice(-1)
                          .toUpperCase();
                        void writeCell(key, letter);
                        if (letter) moveWithinEntry(1);
                      }}
                    />
                    {remote && (
                      <span
                        className="remote-dot"
                        style={{ background: remote.color }}
                        title={`${remote.name} is here`}
                      />
                    )}
                  </label>
                );
              },
            )}
          </div>

          {currentEntry && (
            <div className="current-clue-mobile">
              <strong>{currentEntry.humanNumber}. </strong>
              <span
                dangerouslySetInnerHTML={{ __html: currentEntry.clue }}
              />{" "}
              <span>({currentEntry.length})</span>
            </div>
          )}

          <div className="solver-tools">
            {hasSolutions && (
              <>
                <button
                  className="button button-small button-ghost"
                  onClick={() => setChecking((value) => !value)}
                >
                  <Check size={15} aria-hidden="true" />
                  {checking ? "Stop checking" : "Check letters"}
                </button>
                <button
                  className="button button-small button-danger"
                  onClick={revealEntry}
                  disabled={!currentEntry?.solution}
                >
                  <Eye size={15} aria-hidden="true" /> Reveal clue
                </button>
              </>
            )}
          </div>
        </section>

        <aside className="clues-column" aria-label="Clues">
          {(["across", "down"] as const).map((clueDirection) => (
            <section className="clue-group" key={clueDirection}>
              <h2>{clueDirection === "across" ? "Across" : "Down"}</h2>
              <div className="clue-list">
                {entries(clueDirection).map((entry) => (
                  <button
                    className={[
                      "clue-button",
                      effectiveActiveEntry === entry.id ? "active" : "",
                      isEntryComplete(entry) ? "complete" : "",
                    ].join(" ")}
                    onClick={() => {
                      setActiveEntry(entry.id);
                      setDirection(entry.direction);
                      focusCell(index.entryCells.get(entry.id)?.[0]?.key);
                    }}
                    key={entry.id}
                    aria-label={`${entry.humanNumber} ${stripMarkup(entry.clue)}, ${entry.length} letters`}
                  >
                    <span className="clue-number">{entry.humanNumber}</span>
                    <span>
                      <span dangerouslySetInnerHTML={{ __html: entry.clue }} />{" "}
                      <small>({entry.length})</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>

        {showChat && (
          <aside
            className="chat-column"
            aria-label={
              chatScope === "clue" && currentEntry
                ? `Chat for clue ${currentEntry.humanNumber} ${currentEntry.direction}`
                : "Room chat"
            }
          >
            <header className="chat-header">
              <div className="chat-title">
                <h2>Chat</h2>
                <span>{roomData.participants.length} online</span>
              </div>
              <div className="chat-tabs" role="tablist" aria-label="Chat channel">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chatScope === "room"}
                  className={chatScope === "room" ? "active" : ""}
                  onClick={() => setChatScope("room")}
                >
                  Room
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chatScope === "clue"}
                  className={chatScope === "clue" ? "active" : ""}
                  disabled={!currentEntry}
                  onClick={() => setChatScope("clue")}
                >
                  {currentEntry
                    ? `${currentEntry.humanNumber} ${currentEntry.direction === "across" ? "A" : "D"}`
                    : "Clue"}
                </button>
              </div>
            </header>
            <div className="messages" aria-live="polite">
              {!messages.length && (
                <p className="empty-chat">
                  {chatScope === "clue" && currentEntry ? (
                    <>
                      Start a thread about {currentEntry.humanNumber}{" "}
                      {currentEntry.direction}.
                    </>
                  ) : (
                    <>
                      Share a hunch, celebrate a solve,
                      <br />
                      or ask for another brain.
                    </>
                  )}
                </p>
              )}
              {messages.map((item) => (
                <div
                  className="message"
                  style={{ "--message-color": item.color } as CSSProperties}
                  key={item._id}
                >
                  <div className="message-meta">
                    <strong>{item.name}</strong>
                    <time dateTime={new Date(item.createdAt).toISOString()}>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{item.body}</p>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
            <form className="chat-form" onSubmit={submitMessage}>
              <label className="sr-only" htmlFor="chat-message">Message</label>
              <input
                id="chat-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={
                  chatScope === "clue" && currentEntry
                    ? `Discuss ${currentEntry.humanNumber} ${currentEntry.direction}…`
                    : "Share with the room…"
                }
                maxLength={500}
              />
              <button type="submit" aria-label="Send message">
                <Send size={16} aria-hidden="true" />
              </button>
            </form>
          </aside>
        )}
      </div>
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  );
}

function RoomNav({
  participants,
}: {
  participants: Array<{ sessionId: string; name: string; color: string }>;
}) {
  return (
    <nav className="room-nav">
      <Link href="/" className="wordmark">
        <span aria-hidden="true" className="wordmark-grid">CT</span>
        Cryptic Together
      </Link>
      <div className="participant-list">
        {participants.map((participant) => (
          <span
            className="participant-avatar"
            style={{ background: participant.color }}
            title={participant.name}
            key={participant.sessionId}
          >
            {participant.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
    </nav>
  );
}

function RoomState({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="room-page">
      <RoomNav participants={[]} />
      <div className="state-wrap">
        <div className="state-card">
          <p className="eyebrow">Private solving room</p>
          <h1>{title}</h1>
          <p>{detail}</p>
          {title === "Room not found" && (
            <Link href="/import" className="button button-primary">
              Start a new room
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

