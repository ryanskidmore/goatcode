import { describe, expect, it } from "bun:test";
import { applyHashlineEdits } from "./edit-operations";
import { computeLineHash, formatHashLine } from "./hash-computation";
import type { HashlineEdit } from "./types";

describe("hashline_edit", () => {
  describe("#given a matching hash for the targeted line", () => {
    describe("#when applying one edit", () => {
      it("#then it replaces the line successfully", () => {
        const content = ["alpha", "beta", "gamma"].join("\n");
        const edit: HashlineEdit = {
          oldString: formatHashLine(2, "beta"),
          newString: "BETA",
          hash: computeLineHash(2, "beta"),
        };

        const result = applyHashlineEdits(content, [edit]);

        expect(result).toBe(["alpha", "BETA", "gamma"].join("\n"));
      });
    });
  });

  describe("#given an incorrect hash", () => {
    describe("#when applying an edit", () => {
      it("#then it rejects with a stale content error", () => {
        const content = ["alpha", "beta", "gamma"].join("\n");
        const edit: HashlineEdit = {
          oldString: formatHashLine(2, "beta"),
          newString: "BETA",
          hash: "ZZ",
        };

        expect(() => applyHashlineEdits(content, [edit])).toThrow("stale content");
      });
    });
  });

  describe("#given multiple valid edits", () => {
    describe("#when applying them in one call", () => {
      it("#then all edits are applied", () => {
        const content = ["first", "second", "third", "fourth"].join("\n");
        const edits: HashlineEdit[] = [
          {
            oldString: formatHashLine(2, "second"),
            newString: "SECOND",
            hash: computeLineHash(2, "second"),
          },
          {
            oldString: formatHashLine(4, "fourth"),
            newString: "FOURTH",
            hash: computeLineHash(4, "fourth"),
          },
        ];

        const result = applyHashlineEdits(content, edits);

        expect(result).toBe(["first", "SECOND", "third", "FOURTH"].join("\n"));
      });
    });
  });
});
