import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import {
  assertRoomSlug,
  isParticipantActive,
  normalizeChatMessage,
  normalizeGuestName,
} from "./roomPolicy";

const participantArgs = {
  slug: v.string(),
  sessionId: v.string(),
  name: v.string(),
  color: v.string(),
};

function cleanColor(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#1f766e";
}

function assertSession(sessionId: string) {
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(sessionId)) {
    throw new Error("Invalid guest session.");
  }
}

function assertPuzzle(puzzle: unknown) {
  if (
    !puzzle ||
    typeof puzzle !== "object" ||
    !("entries" in puzzle) ||
    !Array.isArray(puzzle.entries) ||
    puzzle.entries.length === 0 ||
    puzzle.entries.length > 300
  ) {
    throw new Error("Invalid puzzle.");
  }
}

export const createRoom = mutation({
  args: {
    ...participantArgs,
    sourceUrl: v.string(),
    puzzle: v.any(),
  },
  handler: async (ctx, args) => {
    assertRoomSlug(args.slug);
    assertSession(args.sessionId);
    assertPuzzle(args.puzzle);
    const name = normalizeGuestName(args.name);
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("That room already exists.");

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      slug: args.slug,
      sourceUrl: args.sourceUrl,
      puzzle: args.puzzle,
      createdAt: now,
    });
    await ctx.db.insert("participants", {
      roomId,
      sessionId: args.sessionId,
      name,
      color: cleanColor(args.color),
      lastSeen: now,
    });
    return args.slug;
  },
});

export const getRoom = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    if (!/^[a-zA-Z0-9_-]{20,64}$/.test(slug)) return null;
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!room) return null;

    const [cells, participants] = await Promise.all([
      ctx.db
        .query("cells")
        .withIndex("by_room_key", (q) => q.eq("roomId", room._id))
        .collect(),
      ctx.db
        .query("participants")
        .withIndex("by_room_session", (q) => q.eq("roomId", room._id))
        .collect(),
    ]);

    return {
      room,
      cells,
      participants: participants.filter((participant) =>
        isParticipantActive(participant.lastSeen),
      ),
    };
  },
});

export const joinRoom = mutation({
  args: participantArgs,
  handler: async (ctx, args) => {
    assertRoomSlug(args.slug);
    assertSession(args.sessionId);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!room) throw new Error("Room not found.");

    const name = normalizeGuestName(args.name);
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) => q.eq("roomId", room._id))
      .collect()
      .then((participants) =>
        participants.find(
          (participant) => participant.sessionId === args.sessionId,
        ),
      );
    const values = {
      name,
      color: cleanColor(args.color),
      lastSeen: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
    } else {
      await ctx.db.insert("participants", {
        roomId: room._id,
        sessionId: args.sessionId,
        ...values,
      });
    }
  },
});

export const updatePresence = mutation({
  args: {
    ...participantArgs,
    selectedCell: v.optional(v.string()),
    activeEntry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertRoomSlug(args.slug);
    assertSession(args.sessionId);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!room) throw new Error("Room not found.");
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) => q.eq("roomId", room._id))
      .collect()
      .then((participants) =>
        participants.find(
          (candidate) => candidate.sessionId === args.sessionId,
        ),
      );
    const values = {
      name: normalizeGuestName(args.name),
      color: cleanColor(args.color),
      selectedCell: args.selectedCell,
      activeEntry: args.activeEntry,
      lastSeen: Date.now(),
    };
    if (participant) {
      await ctx.db.patch(participant._id, values);
    } else {
      await ctx.db.insert("participants", {
        roomId: room._id,
        sessionId: args.sessionId,
        ...values,
      });
    }
  },
});

export const updateCell = mutation({
  args: {
    ...participantArgs,
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    assertRoomSlug(args.slug);
    assertSession(args.sessionId);
    if (!/^\d{1,2}:\d{1,2}$/.test(args.key)) throw new Error("Invalid cell.");
    const value = args.value.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!room) throw new Error("Room not found.");

    const existing = await ctx.db
      .query("cells")
      .withIndex("by_room_key", (q) => q.eq("roomId", room._id))
      .collect()
      .then((cells) => cells.find((candidate) => candidate.key === args.key));
    const cell = {
      value,
      editorSessionId: args.sessionId,
      editorName: normalizeGuestName(args.name),
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, cell);
    } else {
      await ctx.db.insert("cells", { roomId: room._id, key: args.key, ...cell });
    }
  },
});

export const getMessages = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    if (!/^[a-zA-Z0-9_-]{20,64}$/.test(slug)) return [];
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!room) return [];
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_created", (q) => q.eq("roomId", room._id))
      .order("desc")
      .take(100);
    return messages.reverse();
  },
});

export const sendMessage = mutation({
  args: { ...participantArgs, body: v.string() },
  handler: async (ctx, args) => {
    assertRoomSlug(args.slug);
    assertSession(args.sessionId);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!room) throw new Error("Room not found.");
    await ctx.db.insert("messages", {
      roomId: room._id,
      sessionId: args.sessionId,
      name: normalizeGuestName(args.name),
      color: cleanColor(args.color),
      body: normalizeChatMessage(args.body),
      createdAt: Date.now(),
    });
  },
});

