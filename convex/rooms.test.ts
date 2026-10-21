import { defineTestApp } from "convex-test";
import { describe, expect, it } from "vitest";

import { parseGuardianImport } from "../src/lib/guardian-import";
import { syntheticGuardianImport } from "../src/test/fixture";
import * as roomFunctions from "./rooms";
import schema from "./schema";

const app = defineTestApp({ schema });
const testApp = app.defineModules({ rooms: roomFunctions });
const slug = "3fa85f6457174562b3fc2c963f66afa6";
const puzzle = parseGuardianImport(JSON.stringify(syntheticGuardianImport)).puzzle;
const ada = {
  sessionId: "session_ada_123456",
  name: "Ada",
  color: "#1f766e",
};

describe("realtime room functions", () => {
  it("creates an isolated room and persists cell updates", async () => {
    const t = testApp.createTest();
    await t.mutation(testApp.api.rooms.createRoom, {
      slug,
      sourceUrl: syntheticGuardianImport.sourceUrl,
      puzzle,
      ...ada,
    });
    await t.mutation(testApp.api.rooms.updateCell, {
      slug,
      key: "0:0",
      value: "c",
      ...ada,
    });

    const room = await t.query(testApp.api.rooms.getRoom, { slug });
    expect(room?.room.slug).toBe(slug);
    expect(room?.cells[0]).toMatchObject({ key: "0:0", value: "C" });
    expect(
      await t.query(testApp.api.rooms.getRoom, { slug: `${slug}x` }),
    ).toBeNull();
  });

  it("tracks guests and validates chat", async () => {
    const t = testApp.createTest();
    await t.mutation(testApp.api.rooms.createRoom, {
      slug,
      sourceUrl: syntheticGuardianImport.sourceUrl,
      puzzle,
      ...ada,
    });
    await t.mutation(testApp.api.rooms.joinRoom, {
      slug,
      sessionId: "session_grace_1234",
      name: "Grace",
      color: "#c05239",
    });
    await t.mutation(testApp.api.rooms.sendMessage, {
      slug,
      body: "  I have 1 down. ",
      ...ada,
    });

    const room = await t.query(testApp.api.rooms.getRoom, { slug });
    const messages = await t.query(testApp.api.rooms.getMessages, { slug });
    expect(room?.participants.map((participant) => participant.name).sort()).toEqual([
      "Ada",
      "Grace",
    ]);
    expect(messages[0].body).toBe("I have 1 down.");
  });
});

