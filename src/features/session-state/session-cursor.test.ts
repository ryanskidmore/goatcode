import { describe, it, expect, beforeEach } from "bun:test";
import { consumeNewMessages, resetMessageCursor } from "./session-cursor";

describe("session-cursor", () => {
  beforeEach(() => {
    resetMessageCursor();
  });

  describe("#given no prior cursor state", () => {
    describe("#when consumeNewMessages is called with messages", () => {
      it("#then returns all messages on first call", () => {
        const messages = [
          { info: { id: "msg-1" } },
          { info: { id: "msg-2" } },
          { info: { id: "msg-3" } },
        ];

        const result = consumeNewMessages("session-1", messages);
        expect(result).toHaveLength(3);
        expect(result).toEqual(messages);
      });
    });

    describe("#when consumeNewMessages is called with empty array", () => {
      it("#then returns empty array", () => {
        const result = consumeNewMessages("session-1", []);
        expect(result).toHaveLength(0);
      });
    });

    describe("#when sessionId is undefined", () => {
      it("#then returns all messages without tracking", () => {
        const messages = [{ info: { id: "msg-1" } }, { info: { id: "msg-2" } }];
        const result = consumeNewMessages(undefined, messages);
        expect(result).toHaveLength(2);
      });
    });
  });

  describe("#given messages already consumed", () => {
    describe("#when consumeNewMessages is called again with same messages", () => {
      it("#then returns empty array (no new messages)", () => {
        const messages = [{ info: { id: "msg-1" } }, { info: { id: "msg-2" } }];

        consumeNewMessages("session-2", messages);
        const result = consumeNewMessages("session-2", messages);

        expect(result).toHaveLength(0);
      });
    });

    describe("#when consumeNewMessages is called with additional messages", () => {
      it("#then returns only the new messages", () => {
        const initial = [{ info: { id: "msg-1" } }, { info: { id: "msg-2" } }];
        const extended = [
          { info: { id: "msg-1" } },
          { info: { id: "msg-2" } },
          { info: { id: "msg-3" } },
          { info: { id: "msg-4" } },
        ];

        consumeNewMessages("session-3", initial);
        const result = consumeNewMessages("session-3", extended);

        expect(result).toHaveLength(2);
        expect(result[0].info?.id).toBe("msg-3");
        expect(result[1].info?.id).toBe("msg-4");
      });
    });

    describe("#when message list shrinks (history reset)", () => {
      it("#then returns all messages from the beginning", () => {
        const large = [
          { info: { id: "msg-1" } },
          { info: { id: "msg-2" } },
          { info: { id: "msg-3" } },
        ];
        const small = [{ info: { id: "msg-new-1" } }];

        consumeNewMessages("session-4", large);
        const result = consumeNewMessages("session-4", small);

        expect(result).toHaveLength(1);
        expect(result[0].info?.id).toBe("msg-new-1");
      });
    });
  });

  describe("#given messages with timestamp-based keys", () => {
    describe("#when consumeNewMessages is called with time-based messages", () => {
      it("#then tracks cursor by timestamp", () => {
        const initial = [{ info: { time: 1000 } }, { info: { time: 2000 } }];
        const extended = [
          { info: { time: 1000 } },
          { info: { time: 2000 } },
          { info: { time: 3000 } },
        ];

        consumeNewMessages("session-5", initial);
        const result = consumeNewMessages("session-5", extended);

        expect(result).toHaveLength(1);
        expect(result[0].info?.time).toBe(3000);
      });
    });
  });

  describe("#given a cursor that was reset", () => {
    describe("#when resetMessageCursor is called for a specific session", () => {
      it("#then that session returns all messages again", () => {
        const messages = [{ info: { id: "msg-1" } }, { info: { id: "msg-2" } }];

        consumeNewMessages("session-6", messages);
        resetMessageCursor("session-6");

        const result = consumeNewMessages("session-6", messages);
        expect(result).toHaveLength(2);
      });
    });

    describe("#when resetMessageCursor is called without session ID", () => {
      it("#then all sessions return all messages again", () => {
        const messages = [{ info: { id: "msg-1" } }];

        consumeNewMessages("session-7", messages);
        consumeNewMessages("session-8", messages);
        resetMessageCursor();

        const result7 = consumeNewMessages("session-7", messages);
        const result8 = consumeNewMessages("session-8", messages);

        expect(result7).toHaveLength(1);
        expect(result8).toHaveLength(1);
      });
    });
  });
});
