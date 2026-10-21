import { describe, expect, it } from "vitest";

import { buildCrosswordIndex, cellKey, firstEntryForCell } from "./crossword";
import { parseGuardianImport } from "./guardian-import";
import { syntheticGuardianImport } from "../test/fixture";

const puzzle = parseGuardianImport(JSON.stringify(syntheticGuardianImport)).puzzle;

describe("crossword grid model", () => {
  it("merges across and down entries at intersections", () => {
    const index = buildCrosswordIndex(puzzle);
    const topLeft = index.cellsByKey.get(cellKey(0, 0));

    expect(topLeft?.entryIds).toEqual(["1-across", "1-down"]);
    expect(topLeft?.solution).toBe("C");
    expect(index.cells).toHaveLength(8);
  });

  it("builds ordered cell lists for each clue", () => {
    const index = buildCrosswordIndex(puzzle);
    expect(index.entryCells.get("1-down")?.map((cell) => cell.key)).toEqual([
      "0:0",
      "0:1",
      "0:2",
    ]);
  });

  it("selects the preferred direction at an intersection", () => {
    const index = buildCrosswordIndex(puzzle);
    expect(firstEntryForCell(index, "0:0", "down")).toBe("1-down");
    expect(firstEntryForCell(index, "0:0", "across")).toBe("1-across");
  });

  it("detects inconsistent crossing solutions", () => {
    const broken = structuredClone(puzzle);
    broken.entries.find((entry) => entry.id === "1-down")!.solution = "BAR";
    expect(() => buildCrosswordIndex(broken)).toThrow("Conflicting solutions");
  });
});

