import { makeFunctionReference } from "convex/server";
import type { Value } from "convex/values";

import type {
  CellValue,
  ChatMessage,
  CrosswordPuzzle,
  RoomParticipant,
} from "./types";

export interface GuestArgs {
  slug: string;
  sessionId: string;
  name: string;
  color: string;
}

export interface RoomResult {
  room: {
    _id: string;
    slug: string;
    sourceUrl: string;
    puzzle: CrosswordPuzzle;
    createdAt: number;
  };
  cells: Array<CellValue & { _id: string }>;
  participants: Array<RoomParticipant & { _id: string }>;
}

export const api = {
  rooms: {
    createRoom: makeFunctionReference<"mutation">("rooms:createRoom"),
    getRoom: makeFunctionReference<
      "query",
      { slug: string } & Record<string, Value>,
      RoomResult | null
    >("rooms:getRoom"),
    joinRoom: makeFunctionReference<"mutation">("rooms:joinRoom"),
    updatePresence: makeFunctionReference<"mutation">("rooms:updatePresence"),
    updateCell: makeFunctionReference<"mutation">("rooms:updateCell"),
    getMessages: makeFunctionReference<
      "query",
      { slug: string } & Record<string, Value>,
      ChatMessage[]
    >("rooms:getMessages"),
    sendMessage: makeFunctionReference<"mutation">("rooms:sendMessage"),
  },
};

