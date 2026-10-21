import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    slug: v.string(),
    sourceUrl: v.string(),
    puzzle: v.any(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  cells: defineTable({
    roomId: v.id("rooms"),
    key: v.string(),
    value: v.string(),
    editorSessionId: v.string(),
    editorName: v.string(),
    updatedAt: v.number(),
  }).index("by_room_key", ["roomId", "key"]),

  participants: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    color: v.string(),
    selectedCell: v.optional(v.string()),
    activeEntry: v.optional(v.string()),
    lastSeen: v.number(),
  }).index("by_room_session", ["roomId", "sessionId"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    color: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_room_created", ["roomId", "createdAt"]),
});

