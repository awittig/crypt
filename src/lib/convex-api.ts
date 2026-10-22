import { makeFunctionReference } from "convex/server";

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
      { slug: string } & Record<string, unknown>,
      RoomResult | null
    >("rooms:getRoom"),
    joinRoom: makeFunctionReference<"mutation">("rooms:joinRoom"),
    updatePresence: makeFunctionReference<"mutation">("rooms:updatePresence"),
    updateCell: makeFunctionReference<"mutation">("rooms:updateCell"),
    getMessages: makeFunctionReference<
      "query",
      { slug: string; channel?: string } & Record<string, unknown>,
      ChatMessage[]
    >("rooms:getMessages"),
    getClueActivity: makeFunctionReference<
      "query",
      { slug: string } & Record<string, unknown>,
      Array<{
        channel: string;
        totalCount: number;
        latestCreatedAt: number;
        latestSessionId: string;
        messages: Array<{
          createdAt: number;
          sessionId: string;
          name: string;
          color: string;
        }>;
      }>
    >("rooms:getClueActivity"),
    sendMessage: makeFunctionReference<"mutation">("rooms:sendMessage"),
  },
};

