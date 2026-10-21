export interface GuestIdentity {
  sessionId: string;
  name: string;
  color: string;
}

const STORAGE_KEY = "cryptic-together-guest";
const COLORS = ["#1f766e", "#c05239", "#7656a3", "#2867a0", "#9a6b16", "#b23b6b"];

export function readGuestIdentity(): GuestIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      value &&
      typeof value.sessionId === "string" &&
      typeof value.name === "string" &&
      typeof value.color === "string"
    ) {
      return value;
    }
  } catch {
    // A damaged local preference should not prevent joining a room.
  }
  return null;
}

export function createGuestIdentity(name: string): GuestIdentity {
  const identity = {
    sessionId: crypto.randomUUID().replaceAll("-", ""),
    name: name.trim().replace(/\s+/g, " ").slice(0, 40),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function createRoomSlug() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)}`;
}

