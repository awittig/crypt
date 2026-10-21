import type {
  CrosswordEntry,
  CrosswordIndex,
  CrosswordPuzzle,
  GridCell,
} from "./types";

export const cellKey = (x: number, y: number) => `${x}:${y}`;

function entryCoordinates(entry: CrosswordEntry) {
  return Array.from({ length: entry.length }, (_, index) => ({
    x: entry.position.x + (entry.direction === "across" ? index : 0),
    y: entry.position.y + (entry.direction === "down" ? index : 0),
  }));
}

export function buildCrosswordIndex(puzzle: CrosswordPuzzle): CrosswordIndex {
  const cellsByKey = new Map<string, GridCell>();
  const entriesById = new Map(puzzle.entries.map((entry) => [entry.id, entry]));
  const entryCells = new Map<string, GridCell[]>();

  for (const entry of puzzle.entries) {
    const cells = entryCoordinates(entry).map(({ x, y }, index) => {
      const key = cellKey(x, y);
      const existing = cellsByKey.get(key);
      const solutionLetter = entry.solution?.[index]?.toUpperCase();

      if (existing) {
        if (!existing.entryIds.includes(entry.id)) existing.entryIds.push(entry.id);
        if (
          solutionLetter &&
          existing.solution &&
          solutionLetter !== existing.solution
        ) {
          throw new Error(`Conflicting solutions at ${key}`);
        }
        existing.solution ??= solutionLetter;
        existing.number ??= entry.number;
        return existing;
      }

      const cell: GridCell = {
        key,
        x,
        y,
        number: index === 0 ? entry.number : undefined,
        entryIds: [entry.id],
        solution: solutionLetter,
      };
      cellsByKey.set(key, cell);
      return cell;
    });
    entryCells.set(entry.id, cells);
  }

  return {
    cells: [...cellsByKey.values()].sort((a, b) => a.y - b.y || a.x - b.x),
    cellsByKey,
    entriesById,
    entryCells,
  };
}

export function firstEntryForCell(
  index: CrosswordIndex,
  key: string,
  preferredDirection?: "across" | "down",
) {
  const cell = index.cellsByKey.get(key);
  if (!cell) return undefined;
  return (
    cell.entryIds.find(
      (entryId) =>
        index.entriesById.get(entryId)?.direction === preferredDirection,
    ) ?? cell.entryIds[0]
  );
}

export function adjacentCell(
  puzzle: CrosswordPuzzle,
  index: CrosswordIndex,
  key: string,
  deltaX: number,
  deltaY: number,
) {
  const current = index.cellsByKey.get(key);
  if (!current) return undefined;

  let x = current.x + deltaX;
  let y = current.y + deltaY;
  while (x >= 0 && y >= 0 && x < puzzle.dimensions.cols && y < puzzle.dimensions.rows) {
    const candidate = index.cellsByKey.get(cellKey(x, y));
    if (candidate) return candidate;
    x += deltaX;
    y += deltaY;
  }
  return undefined;
}

