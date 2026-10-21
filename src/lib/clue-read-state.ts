export type ClueReadState = Record<string, number>;

const STORAGE_PREFIX = "cryptic-together-clue-reads";

function storageKey(slug: string, sessionId: string) {
  return `${STORAGE_PREFIX}:${slug}:${sessionId}`;
}

export function readClueReadState(
  slug: string,
  sessionId: string,
): ClueReadState {
  if (typeof window === "undefined") return {};

  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(storageKey(slug, sessionId)) ?? "{}",
    );
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    return Object.fromEntries(
      Object.entries(stored).filter(
        ([channel, timestamp]) =>
          channel.length > 0 &&
          typeof timestamp === "number" &&
          Number.isFinite(timestamp) &&
          timestamp >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export function markClueThreadRead(
  slug: string,
  sessionId: string,
  state: ClueReadState,
  channel: string,
  timestamp: number,
): ClueReadState {
  if ((state[channel] ?? 0) >= timestamp) return state;

  const next = { ...state, [channel]: timestamp };
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(slug, sessionId), JSON.stringify(next));
  }
  return next;
}

export function hasUnreadClueMessage(
  state: ClueReadState,
  activity: { channel: string; latestCreatedAt: number; latestSessionId: string },
  sessionId: string,
) {
  return (
    activity.latestSessionId !== sessionId &&
    activity.latestCreatedAt > (state[activity.channel] ?? 0)
  );
}
