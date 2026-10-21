export const PRESENCE_TTL_MS = 45_000;
export const MAX_CHAT_LENGTH = 500;
export const ROOM_SLUG_PATTERN = /^[a-zA-Z0-9_-]{20,64}$/;

export function assertRoomSlug(slug: string) {
  if (!ROOM_SLUG_PATTERN.test(slug)) {
    throw new Error("Invalid room link.");
  }
}

export function normalizeGuestName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!clean) throw new Error("Choose a display name.");
  return clean;
}

export function normalizeChatMessage(body: string) {
  const clean = body.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Message cannot be empty.");
  if (clean.length > MAX_CHAT_LENGTH) throw new Error("Message is too long.");
  return clean;
}

export function isParticipantActive(lastSeen: number, now = Date.now()) {
  return lastSeen >= now - PRESENCE_TTL_MS;
}

