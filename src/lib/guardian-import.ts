import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import type { CrosswordPuzzle, GuardianImport } from "./types";

const MAX_IMPORT_BYTES = 350_000;
const GUARDIAN_HOSTS = new Set(["theguardian.com", "www.theguardian.com"]);
const SERIES = new Set([
  "azed",
  "cryptic",
  "everyman",
  "genius",
  "prize",
  "quiptic",
  "quick-cryptic",
  "special",
  "weekend",
]);

const positionSchema = z.object({
  x: z.number().int().min(0).max(40),
  y: z.number().int().min(0).max(40),
});

const entrySchema = z.object({
  id: z.string().min(1).max(100),
  number: z.number().int().min(0).max(999),
  humanNumber: z.string().min(1).max(30).optional(),
  clue: z.string().min(1).max(2_000),
  direction: z.enum(["across", "down"]),
  length: z.number().int().min(1).max(60),
  group: z.array(z.string().min(1).max(100)).max(20).optional(),
  position: positionSchema,
  separatorLocations: z
    .record(z.string().max(4), z.array(z.number().int().min(1).max(60)).max(20))
    .optional(),
  solution: z.string().max(60).optional(),
});

const puzzleSchema = z.object({
  id: z.string().min(1).max(150),
  number: z.number().int().min(0).max(1_000_000),
  name: z.string().min(1).max(250),
  date: z.number().int().positive(),
  creator: z
    .object({
      name: z.string().min(1).max(150),
      webUrl: z.string().url().max(500).optional(),
    })
    .optional(),
  dimensions: z.object({
    rows: z.number().int().min(3).max(40),
    cols: z.number().int().min(3).max(40),
  }),
  entries: z.array(entrySchema).min(1).max(300),
  solutionAvailable: z.boolean().optional(),
});

const importSchema = z.object({
  sourceUrl: z.string().url().max(500),
  data: puzzleSchema,
});

function validateSourceUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || !GUARDIAN_HOSTS.has(url.hostname)) {
    throw new Error("Use an HTTPS crossword URL from theguardian.com.");
  }
  const match = url.pathname.match(/^\/crosswords\/([^/]+)\/(\d+)\/?$/);
  if (!match || !SERIES.has(match[1])) {
    throw new Error("This does not look like a supported Guardian crossword URL.");
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function sanitizeClue(clue: string) {
  return sanitizeHtml(clue, {
    allowedTags: ["b", "strong", "i", "em", "sub", "sup"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
}

export function parseGuardianImport(raw: string): GuardianImport {
  if (!raw.trim()) throw new Error("Paste the puzzle data copied by the bookmarklet.");
  if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES) {
    throw new Error("That puzzle payload is too large.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("The pasted value is not valid JSON.");
  }

  const result = importSchema.safeParse(decoded);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`Puzzle data is incomplete: ${first.path.join(".")} ${first.message}`);
  }

  const sourceUrl = validateSourceUrl(result.data.sourceUrl);
  const imported = result.data.data;
  const ids = new Set<string>();
  const entries = imported.entries.map((entry) => {
    if (ids.has(entry.id)) throw new Error(`Duplicate clue id: ${entry.id}`);
    ids.add(entry.id);

    const endX =
      entry.position.x + (entry.direction === "across" ? entry.length - 1 : 0);
    const endY =
      entry.position.y + (entry.direction === "down" ? entry.length - 1 : 0);
    if (endX >= imported.dimensions.cols || endY >= imported.dimensions.rows) {
      throw new Error(`Clue ${entry.id} extends outside the grid.`);
    }

    const solution = entry.solution?.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (solution && solution.length !== entry.length) {
      throw new Error(`Clue ${entry.id} has a solution with the wrong length.`);
    }

    return {
      ...entry,
      clue: sanitizeClue(entry.clue),
      humanNumber: entry.humanNumber ?? String(entry.number),
      group: entry.group?.length ? entry.group : [entry.id],
      separatorLocations: entry.separatorLocations ?? {},
      solution: solution || undefined,
    };
  });

  const puzzle: CrosswordPuzzle = {
    ...imported,
    name: sanitizeHtml(imported.name, { allowedTags: [], allowedAttributes: {} }),
    creator: imported.creator
      ? {
          ...imported.creator,
          name: sanitizeHtml(imported.creator.name, {
            allowedTags: [],
            allowedAttributes: {},
          }),
        }
      : undefined,
    entries,
    solutionAvailable:
      imported.solutionAvailable ?? entries.every((entry) => Boolean(entry.solution)),
  };

  return { sourceUrl, puzzle };
}

export const guardianBookmarklet = `javascript:(()=>{try{const e=[...document.querySelectorAll('gu-island')].find(x=>x.getAttribute('name')==='CrosswordComponent');if(!e)throw new Error('Crossword data not found');const p=JSON.parse(e.getAttribute('props')||'{}');if(!p.data)throw new Error('Puzzle payload missing');const text=JSON.stringify({sourceUrl:location.href,data:p.data});const copy=()=>navigator.clipboard.writeText(text).then(()=>alert('Puzzle copied. Return to Cryptic Together and paste it.'));copy().catch(()=>prompt('Copy this puzzle data:',text));}catch(error){alert('Could not copy this puzzle: '+error.message)}})()`;

