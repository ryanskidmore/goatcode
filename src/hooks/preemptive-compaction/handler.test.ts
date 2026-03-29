import { describe, expect, it, mock } from "bun:test";
import { createPreemptiveCompactionHandler } from "./handler";

describe("createPreemptiveCompactionHandler", () => {
  describe("#given a handler with default 80% threshold", () => {
    describe("#when token usage exceeds the threshold", () => {
      it("#then triggers compaction for the session", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          sessionID: "ses-high",
          usage: { totalTokens: 170_000 },
          contextLimit: 200_000,
        });

        expect(compactSession).toHaveBeenCalledTimes(1);
        expect(compactSession).toHaveBeenCalledWith("ses-high", {
          usageRatio: 0.85,
          usedTokens: 170_000,
          contextLimit: 200_000,
        });
      });
    });

    describe("#when token usage is below the threshold", () => {
      it("#then does not trigger compaction", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          sessionID: "ses-low",
          usage: { totalTokens: 100_000 },
          contextLimit: 200_000,
        });

        expect(compactSession).not.toHaveBeenCalled();
      });
    });

    describe("#when no context limit is provided", () => {
      it("#then does not trigger compaction", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          sessionID: "ses-nolimit",
          usage: { totalTokens: 170_000 },
        });

        expect(compactSession).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler tracking per-session compaction state", () => {
    describe("#when usage stays above threshold across multiple calls", () => {
      it("#then only compacts once until usage drops below threshold", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          sessionID: "ses-dedup",
          usage: { totalTokens: 170_000 },
          contextLimit: 200_000,
        });

        await handler({
          sessionID: "ses-dedup",
          usage: { totalTokens: 180_000 },
          contextLimit: 200_000,
        });

        expect(compactSession).toHaveBeenCalledTimes(1);

        await handler({
          sessionID: "ses-dedup",
          usage: { totalTokens: 100_000 },
          contextLimit: 200_000,
        });

        await handler({
          sessionID: "ses-dedup",
          usage: { totalTokens: 175_000 },
          contextLimit: 200_000,
        });

        expect(compactSession).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("#given a handler with no sessionID", () => {
    describe("#when input lacks a sessionID", () => {
      it("#then does nothing", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          usage: { totalTokens: 190_000 },
          contextLimit: 200_000,
        });

        expect(compactSession).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler with tokenUsage input format", () => {
    describe("#when tokenUsage.total exceeds the threshold", () => {
      it("#then triggers compaction using the alternate input shape", async () => {
        const compactSession = mock(() => Promise.resolve());
        const handler = createPreemptiveCompactionHandler({ compactSession });

        await handler({
          sessionID: "ses-alt",
          tokenUsage: { total: 165_000 },
          context: { limitTokens: 200_000 },
        });

        expect(compactSession).toHaveBeenCalledTimes(1);
        expect(compactSession).toHaveBeenCalledWith("ses-alt", {
          usageRatio: 0.825,
          usedTokens: 165_000,
          contextLimit: 200_000,
        });
      });
    });
  });
});
