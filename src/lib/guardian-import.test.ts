import { describe, expect, it } from "vitest";

import { parseGuardianImport, sanitizeClue } from "./guardian-import";
import { syntheticGuardianImport } from "../test/fixture";

describe("Guardian importer", () => {
  it("normalizes a supported crossword payload", () => {
    const result = parseGuardianImport(JSON.stringify(syntheticGuardianImport));

    expect(result.sourceUrl).toBe(
      "https://www.theguardian.com/crosswords/cryptic/12345",
    );
    expect(result.puzzle.entries).toHaveLength(4);
    expect(result.puzzle.entries[0].solution).toBe("CAT");
    expect(result.puzzle.solutionAvailable).toBe(true);
  });

  it("keeps safe clue emphasis and removes executable markup", () => {
    expect(
      sanitizeClue(
        'Word <em>heard</em><script>alert(1)</script><a href="bad">link</a>',
      ),
    ).toBe("Word <em>heard</em>link");
  });

  it("rejects non-Guardian source URLs", () => {
    const payload = {
      ...syntheticGuardianImport,
      sourceUrl: "https://example.com/crosswords/cryptic/12345",
    };
    expect(() => parseGuardianImport(JSON.stringify(payload))).toThrow(
      "theguardian.com",
    );
  });

  it("supports puzzles without solutions", () => {
    const payload = structuredClone(syntheticGuardianImport);
    payload.data.solutionAvailable = false;
    payload.data.entries = payload.data.entries.map((entry) => ({
      ...entry,
      solution: "",
    }));

    const result = parseGuardianImport(JSON.stringify(payload));
    expect(result.puzzle.solutionAvailable).toBe(false);
    expect(result.puzzle.entries.every((entry) => !entry.solution)).toBe(true);
  });

  it("rejects clues that extend outside the grid", () => {
    const payload = structuredClone(syntheticGuardianImport);
    payload.data.entries[0].length = 4;
    payload.data.entries[0].solution = "CATS";
    expect(() => parseGuardianImport(JSON.stringify(payload))).toThrow(
      "outside the grid",
    );
  });
});

