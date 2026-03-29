import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createCompactionContextEventHandler,
  createCompactionContextSystemTransformHandler,
} from "./handler";

const tempDirectories: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "goatcode-compaction-"));
  tempDirectories.push(workspace);
  return workspace;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("createCompactionContextEventHandler", () => {
  describe("#given a session.compacted event with todo files", () => {
    describe("#when the handler processes the event", () => {
      it("#then it stores a snapshot in the session map", async () => {
        const workspace = createWorkspace();
        mkdirSync(join(workspace, ".sisyphus"), { recursive: true });
        writeFileSync(join(workspace, ".sisyphus", "todos.md"), "- [ ] do thing");

        const snapshots = new Map<string, string>();
        const handler = createCompactionContextEventHandler(workspace, snapshots);

        await handler({
          event: {
            type: "session.compacted",
            properties: { sessionID: "ses-1" },
          },
        });

        expect(snapshots.has("ses-1")).toBe(true);
        expect(snapshots.get("ses-1")).toContain("Current Todos");
        expect(snapshots.get("ses-1")).toContain("do thing");
      });
    });
  });

  describe("#given a session.deleted event", () => {
    describe("#when the handler processes the event", () => {
      it("#then it removes the snapshot from the map", async () => {
        const workspace = createWorkspace();
        const snapshots = new Map<string, string>();
        snapshots.set("ses-1", "old-snapshot");

        const handler = createCompactionContextEventHandler(workspace, snapshots);

        await handler({
          event: {
            type: "session.deleted",
            properties: { sessionID: "ses-1" },
          },
        });

        expect(snapshots.has("ses-1")).toBe(false);
      });
    });
  });

  describe("#given a non-compaction event type", () => {
    describe("#when the handler processes the event", () => {
      it("#then it does not modify the snapshot map", async () => {
        const workspace = createWorkspace();
        const snapshots = new Map<string, string>();

        const handler = createCompactionContextEventHandler(workspace, snapshots);

        await handler({
          event: {
            type: "session.idle",
            properties: { sessionID: "ses-1" },
          },
        });

        expect(snapshots.size).toBe(0);
      });
    });
  });

  describe("#given a session.compacted event with no todo or plan files", () => {
    describe("#when the handler processes the event", () => {
      it("#then it does not store a snapshot", async () => {
        const workspace = createWorkspace();
        const snapshots = new Map<string, string>();

        const handler = createCompactionContextEventHandler(workspace, snapshots);

        await handler({
          event: {
            type: "session.compacted",
            properties: { sessionID: "ses-1" },
          },
        });

        expect(snapshots.has("ses-1")).toBe(false);
      });
    });
  });
});

describe("createCompactionContextSystemTransformHandler", () => {
  describe("#given a session with a stored snapshot", () => {
    describe("#when the system transform runs", () => {
      it("#then it appends the snapshot to system output and removes it from the map", async () => {
        const snapshots = new Map<string, string>();
        snapshots.set("ses-1", "[Compaction Recovery Context]\n## Current Todos\n- do thing");

        const handler = createCompactionContextSystemTransformHandler(snapshots);
        const output = { system: "base-system" };

        await handler({ sessionID: "ses-1" }, output);

        expect(output.system).toContain("Compaction Recovery Context");
        expect(output.system).toContain("Current Todos");
        expect(snapshots.has("ses-1")).toBe(false);
      });
    });
  });

  describe("#given a session without a stored snapshot", () => {
    describe("#when the system transform runs", () => {
      it("#then it does not modify the output", async () => {
        const snapshots = new Map<string, string>();
        const handler = createCompactionContextSystemTransformHandler(snapshots);
        const output = { system: "base-system" };

        await handler({ sessionID: "ses-no-snapshot" }, output);

        expect(output.system).toBe("base-system");
      });
    });
  });

  describe("#given a session ID provided via session.id", () => {
    describe("#when the system transform runs", () => {
      it("#then it resolves the session ID from the nested path", async () => {
        const snapshots = new Map<string, string>();
        snapshots.set("ses-nested", "snapshot-content");

        const handler = createCompactionContextSystemTransformHandler(snapshots);
        const output = { system: "base-system" };

        await handler({ session: { id: "ses-nested" } }, output);

        expect(output.system).toContain("snapshot-content");
        expect(snapshots.has("ses-nested")).toBe(false);
      });
    });
  });
});
