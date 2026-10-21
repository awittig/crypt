export type Direction = "across" | "down";

export interface CrosswordPosition {
  x: number;
  y: number;
}

export interface CrosswordEntry {
  id: string;
  number: number;
  humanNumber: string;
  clue: string;
  direction: Direction;
  length: number;
  group: string[];
  position: CrosswordPosition;
  separatorLocations: Record<string, number[]>;
  solution?: string;
}

export interface CrosswordPuzzle {
  id: string;
  number: number;
  name: string;
  date: number;
  creator?: {
    name: string;
    webUrl?: string;
  };
  dimensions: {
    rows: number;
    cols: number;
  };
  entries: CrosswordEntry[];
  solutionAvailable: boolean;
}

export interface GuardianImport {
  sourceUrl: string;
  puzzle: CrosswordPuzzle;
}

export interface GridCell {
  key: string;
  x: number;
  y: number;
  number?: number;
  entryIds: string[];
  solution?: string;
}

export interface CrosswordIndex {
  cells: GridCell[];
  cellsByKey: Map<string, GridCell>;
  entriesById: Map<string, CrosswordEntry>;
  entryCells: Map<string, GridCell[]>;
}

export interface CellValue {
  key: string;
  value: string;
  editorSessionId: string;
  editorName: string;
  updatedAt: number;
}

export interface RoomParticipant {
  sessionId: string;
  name: string;
  color: string;
  selectedCell?: string;
  activeEntry?: string;
  lastSeen: number;
}

export interface ChatMessage {
  _id: string;
  sessionId: string;
  name: string;
  color: string;
  body: string;
  channel?: string;
  createdAt: number;
}

