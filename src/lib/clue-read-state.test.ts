import { beforeEach, describe, expect, it } from "vitest";

import {
  hasUnreadClueMessage,
  markClueThreadRead,
  readClueReadState,
} from "./clue-read-state";

describe("clue thread read state", () => {
  beforeEach(() => localStorage.clear());

  it("persists read timestamps per room and guest browser", () => {
    const state = markClueThreadRead(
      "room-one",
      "guest-one",
      {},
      "1-across",
      123,
    );

    expect(readClueReadState("room-one", "guest-one")).toEqual(state);
    expect(readClueReadState("room-two", "guest-one")).toEqual({});
    expect(readClueReadState("room-one", "guest-two")).toEqual({});
  });

  it("identifies only newer messages from another guest as unread", () => {
    const activity = {
      channel: "1-across",
      latestCreatedAt: 124,
      latestSessionId: "guest-two",
      messages: [
        {
          createdAt: 124,
          sessionId: "guest-two",
          name: "Grace",
          color: "#c05239",
        },
      ],
    };

    expect(hasUnreadClueMessage({ "1-across": 123 }, activity, "guest-one")).toBe(
      true,
    );
    expect(hasUnreadClueMessage({ "1-across": 124 }, activity, "guest-one")).toBe(
      false,
    );
    expect(
      hasUnreadClueMessage(
        { "1-across": 123 },
        {
          ...activity,
          latestSessionId: "guest-one",
          messages: [
            {
              createdAt: 124,
              sessionId: "guest-one",
              name: "Ada",
              color: "#1f766e",
            },
          ],
        },
        "guest-one",
      ),
    ).toBe(false);
    expect(
      hasUnreadClueMessage(
        { "1-across": 123 },
        {
          ...activity,
          latestSessionId: "guest-one",
          messages: [
            {
              createdAt: 123.5,
              sessionId: "guest-two",
              name: "Grace",
              color: "#c05239",
            },
            {
              createdAt: 124,
              sessionId: "guest-one",
              name: "Ada",
              color: "#1f766e",
            },
          ],
        },
        "guest-one",
      ),
    ).toBe(true);
  });

  it("keeps the newest read timestamp", () => {
    const state = { "1-across": 200 };
    expect(
      markClueThreadRead(
        "room-one",
        "guest-one",
        state,
        "1-across",
        100,
      ),
    ).toBe(state);
  });
});
