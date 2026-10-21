import { describe, expect, it } from "vitest";

import {
  assertRoomSlug,
  isParticipantActive,
  normalizeChatMessage,
  normalizeGuestName,
  PRESENCE_TTL_MS,
} from "./roomPolicy";

describe("room capability and collaboration policy", () => {
  it("accepts only high-entropy-looking room slugs", () => {
    expect(() => assertRoomSlug("short")).toThrow("Invalid room link");
    expect(() =>
      assertRoomSlug("3fa85f6457174562b3fc2c963f66afa6"),
    ).not.toThrow();
  });

  it("normalizes guest names and chat without allowing empty values", () => {
    expect(normalizeGuestName("  Ada   L. ")).toBe("Ada L.");
    expect(normalizeChatMessage("  I think   12a is ENUM. ")).toBe(
      "I think 12a is ENUM.",
    );
    expect(() => normalizeChatMessage("   ")).toThrow();
  });

  it("expires stale presence records", () => {
    const now = 10_000_000;
    expect(isParticipantActive(now - PRESENCE_TTL_MS + 1, now)).toBe(true);
    expect(isParticipantActive(now - PRESENCE_TTL_MS - 1, now)).toBe(false);
  });
});

