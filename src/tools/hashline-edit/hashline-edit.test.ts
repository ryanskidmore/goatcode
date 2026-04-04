import { describe, expect, it } from "bun:test";
import {
  applyHashlineEdits,
  applyRawHashlineEdits,
  parseTag,
  normalizeEdit,
  HashlineMismatchError,
} from "./edit-operations";
import { computeLineHash } from "./hash-computation";
import type { HashlineEdit, RawHashlineEdit } from "./types";

function tag(line: number, content: string): string {
  return `${line}#${computeLineHash(line, content)}`;
}

function anchor(line: number, content: string) {
  return { line, hash: computeLineHash(line, content) };
}

describe("hashline_edit", () => {
  // ─── parseTag ─────────────────────────────────────────────────
  describe("#given a line reference string", () => {
    describe("#when parsing a valid reference", () => {
      it("#then extracts line number and hash", () => {
        const result = parseTag("42#VK");
        expect(result).toEqual({ line: 42, hash: "VK" });
      });

      it("#then handles single-digit line numbers", () => {
        const result = parseTag("1#ZZ");
        expect(result).toEqual({ line: 1, hash: "ZZ" });
      });
    });

    describe("#when parsing a tolerant format", () => {
      it("#then strips leading >>> markers", () => {
        const result = parseTag(">>> 42#VK:some content");
        expect(result).toEqual({ line: 42, hash: "VK" });
      });

      it("#then strips leading +/- markers", () => {
        const result = parseTag("+ 5#HH");
        expect(result).toEqual({ line: 5, hash: "HH" });
      });

      it("#then handles flexible whitespace around hash", () => {
        const result = parseTag("  10 # VK");
        expect(result).toEqual({ line: 10, hash: "VK" });
      });

      it("#then ignores trailing content after hash", () => {
        const result = parseTag("10#VK|function foo() {");
        expect(result).toEqual({ line: 10, hash: "VK" });
      });
    });

    describe("#when parsing an invalid reference", () => {
      it("#then throws for non-matching format", () => {
        expect(() => parseTag("not-a-ref")).toThrow("Invalid line reference");
      });

      it("#then throws for zero line number", () => {
        expect(() => parseTag("0#VK")).toThrow("Line number must be >= 1");
      });
    });
  });

  // ─── normalizeEdit ────────────────────────────────────────────
  describe("#given raw edit input", () => {
    describe("#when normalizing a replace_line edit", () => {
      it("#then parses the anchor and lines", () => {
        const raw: RawHashlineEdit = { op: "replace_line", pos: "5#VK", lines: ["new content"] };
        const result = normalizeEdit(raw, 0);
        expect(result.op).toBe("replace_line");
        expect(result).toHaveProperty("pos");
        if (result.op === "replace_line") {
          expect(result.pos).toEqual({ line: 5, hash: "VK" });
          expect(result.lines).toEqual(["new content"]);
        }
      });

      it("#then normalizes string lines to array", () => {
        const raw: RawHashlineEdit = { op: "replace_line", pos: "5#VK", lines: "line1\nline2" };
        const result = normalizeEdit(raw, 0);
        if (result.op === "replace_line") {
          expect(result.lines).toEqual(["line1", "line2"]);
        }
      });

      it("#then normalizes null lines to empty array", () => {
        const raw: RawHashlineEdit = { op: "replace_line", pos: "5#VK", lines: null };
        const result = normalizeEdit(raw, 0);
        if (result.op === "replace_line") {
          expect(result.lines).toEqual([]);
        }
      });

      it("#then throws without pos anchor", () => {
        const raw: RawHashlineEdit = { op: "replace_line", lines: ["x"] };
        expect(() => normalizeEdit(raw, 0)).toThrow("requires pos anchor");
      });
    });

    describe("#when normalizing a replace_range edit", () => {
      it("#then parses both anchors", () => {
        const raw: RawHashlineEdit = {
          op: "replace_range",
          pos: "5#VK",
          end: "10#HH",
          lines: ["x"],
        };
        const result = normalizeEdit(raw, 0);
        if (result.op === "replace_range") {
          expect(result.pos).toEqual({ line: 5, hash: "VK" });
          expect(result.end).toEqual({ line: 10, hash: "HH" });
        }
      });

      it("#then throws without end anchor", () => {
        const raw: RawHashlineEdit = { op: "replace_range", pos: "5#VK", lines: ["x"] };
        expect(() => normalizeEdit(raw, 0)).toThrow("requires end anchor");
      });

      it("#then throws when start > end", () => {
        const raw: RawHashlineEdit = {
          op: "replace_range",
          pos: "10#VK",
          end: "5#HH",
          lines: ["x"],
        };
        expect(() => normalizeEdit(raw, 0)).toThrow("must be <= end line");
      });
    });

    describe("#when normalizing an unsupported op", () => {
      it("#then throws with helpful message", () => {
        const raw: RawHashlineEdit = { op: "delete" as string, lines: [] };
        expect(() => normalizeEdit(raw, 0)).toThrow("unsupported op");
      });
    });
  });

  // ─── replace_line ─────────────────────────────────────────────
  describe("#given replace_line operations", () => {
    describe("#when replacing a single line", () => {
      it("#then replaces exactly that line", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, "beta"),
            lines: ["BETA"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nBETA\ngamma");
      });
    });

    describe("#when replacing with multiple lines", () => {
      it("#then expands one line into many", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, "beta"),
            lines: ["BETA1", "BETA2", "BETA3"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nBETA1\nBETA2\nBETA3\ngamma");
      });
    });

    describe("#when deleting a line", () => {
      it("#then removes the line with empty lines array", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, "beta"),
            lines: [],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\ngamma");
      });
    });

    describe("#when multiple replace_line edits target different lines", () => {
      it("#then all edits are applied correctly", () => {
        const content = "first\nsecond\nthird\nfourth";
        const edits: HashlineEdit[] = [
          { op: "replace_line", pos: anchor(2, "second"), lines: ["SECOND"] },
          { op: "replace_line", pos: anchor(4, "fourth"), lines: ["FOURTH"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("first\nSECOND\nthird\nFOURTH");
      });
    });

    describe("#when replacement content matches original", () => {
      it("#then reports as noop", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, "beta"),
            lines: ["beta"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe(content);
        expect(result.noopEdits).toBe(1);
      });
    });
  });

  // ─── replace_range ────────────────────────────────────────────
  describe("#given replace_range operations", () => {
    describe("#when replacing a range of lines", () => {
      it("#then replaces the entire range inclusive", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: anchor(2, "line2"),
            end: anchor(4, "line4"),
            lines: ["REPLACED"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("line1\nREPLACED\nline5");
      });
    });

    describe("#when replacing a range with more lines", () => {
      it("#then expands the content", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: anchor(2, "line2"),
            end: anchor(3, "line3"),
            lines: ["A", "B", "C", "D"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("line1\nA\nB\nC\nD\nline4\nline5");
      });
    });

    describe("#when deleting a range", () => {
      it("#then removes all lines in the range", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: anchor(2, "line2"),
            end: anchor(4, "line4"),
            lines: [],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("line1\nline5");
      });
    });

    describe("#when range is a single line", () => {
      it("#then behaves like replace_line", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: anchor(2, "beta"),
            end: anchor(2, "beta"),
            lines: ["BETA"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nBETA\ngamma");
      });
    });
  });

  // ─── append_at ────────────────────────────────────────────────
  describe("#given append_at operations", () => {
    describe("#when appending lines after an anchor", () => {
      it("#then inserts lines after the anchor line", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "append_at",
            pos: anchor(2, "beta"),
            lines: ["inserted1", "inserted2"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nbeta\ninserted1\ninserted2\ngamma");
      });
    });

    describe("#when appending after the last line", () => {
      it("#then inserts at end of file", () => {
        const content = "alpha\nbeta";
        const edits: HashlineEdit[] = [
          {
            op: "append_at",
            pos: anchor(2, "beta"),
            lines: ["gamma"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nbeta\ngamma");
      });
    });

    describe("#when appending empty lines", () => {
      it("#then reports as noop", () => {
        const content = "alpha\nbeta";
        const edits: HashlineEdit[] = [
          {
            op: "append_at",
            pos: anchor(1, "alpha"),
            lines: [],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe(content);
        expect(result.noopEdits).toBe(1);
      });
    });
  });

  // ─── prepend_at ───────────────────────────────────────────────
  describe("#given prepend_at operations", () => {
    describe("#when prepending lines before an anchor", () => {
      it("#then inserts lines before the anchor line", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "prepend_at",
            pos: anchor(2, "beta"),
            lines: ["inserted"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\ninserted\nbeta\ngamma");
      });
    });

    describe("#when prepending before the first line", () => {
      it("#then inserts at start of file", () => {
        const content = "alpha\nbeta";
        const edits: HashlineEdit[] = [
          {
            op: "prepend_at",
            pos: anchor(1, "alpha"),
            lines: ["header"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("header\nalpha\nbeta");
      });
    });
  });

  // ─── append_file ──────────────────────────────────────────────
  describe("#given append_file operations", () => {
    describe("#when appending to a non-empty file", () => {
      it("#then adds lines at the end", () => {
        const content = "existing";
        const edits: HashlineEdit[] = [
          {
            op: "append_file",
            lines: ["new1", "new2"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("existing\nnew1\nnew2");
      });
    });

    describe("#when appending to an empty file", () => {
      it("#then creates content", () => {
        const content = "";
        const edits: HashlineEdit[] = [
          {
            op: "append_file",
            lines: ["first", "second"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("first\nsecond");
      });
    });
  });

  // ─── prepend_file ─────────────────────────────────────────────
  describe("#given prepend_file operations", () => {
    describe("#when prepending to a non-empty file", () => {
      it("#then adds lines at the start", () => {
        const content = "existing";
        const edits: HashlineEdit[] = [
          {
            op: "prepend_file",
            lines: ["header1", "header2"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("header1\nheader2\nexisting");
      });
    });

    describe("#when prepending to an empty file", () => {
      it("#then creates content", () => {
        const content = "";
        const edits: HashlineEdit[] = [
          {
            op: "prepend_file",
            lines: ["first"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("first");
      });
    });
  });

  // ─── Hash Validation ─────────────────────────────────────────
  describe("#given a stale hash", () => {
    describe("#when applying an edit with wrong hash", () => {
      it("#then throws HashlineMismatchError", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: { line: 2, hash: "ZZ" },
            lines: ["BETA"],
          },
        ];
        expect(() => applyHashlineEdits(content, edits)).toThrow(HashlineMismatchError);
      });

      it("#then includes updated LINE#HASH in error message", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: { line: 2, hash: "ZZ" },
            lines: ["BETA"],
          },
        ];
        try {
          applyHashlineEdits(content, edits);
          expect.unreachable("should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(HashlineMismatchError);
          const mismatchError = error as InstanceType<typeof HashlineMismatchError>;
          expect(mismatchError.message).toContain("changed since last read");
          expect(mismatchError.message).toContain(">>>");
          expect(mismatchError.remaps.size).toBe(1);
        }
      });
    });

    describe("#when replace_range has stale start AND end hashes", () => {
      it("#then reports both mismatches", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: { line: 1, hash: "ZZ" },
            end: { line: 3, hash: "ZZ" },
            lines: ["new"],
          },
        ];
        try {
          applyHashlineEdits(content, edits);
          expect.unreachable("should have thrown");
        } catch (error) {
          const mismatchError = error as InstanceType<typeof HashlineMismatchError>;
          expect(mismatchError.remaps.size).toBe(2);
        }
      });
    });

    describe("#when line number is out of bounds", () => {
      it("#then throws with bounds error", () => {
        const content = "alpha\nbeta";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: { line: 99, hash: "VK" },
            lines: ["x"],
          },
        ];
        expect(() => applyHashlineEdits(content, edits)).toThrow("does not exist");
      });
    });
  });

  // ─── Deduplication ────────────────────────────────────────────
  describe("#given duplicate edits", () => {
    describe("#when identical edits are submitted", () => {
      it("#then deduplicates and applies once", () => {
        const content = "alpha\nbeta\ngamma";
        const pos = anchor(2, "beta");
        const edits: HashlineEdit[] = [
          { op: "replace_line", pos, lines: ["BETA"] },
          { op: "replace_line", pos, lines: ["BETA"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\nBETA\ngamma");
        expect(result.deduplicatedEdits).toBe(1);
      });
    });
  });

  // ─── Overlap Detection ────────────────────────────────────────
  describe("#given overlapping range edits", () => {
    describe("#when two ranges overlap", () => {
      it("#then throws an overlap error", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const edits: HashlineEdit[] = [
          { op: "replace_range", pos: anchor(1, "line1"), end: anchor(3, "line3"), lines: ["A"] },
          { op: "replace_range", pos: anchor(2, "line2"), end: anchor(4, "line4"), lines: ["B"] },
        ];
        expect(() => applyHashlineEdits(content, edits)).toThrow("Overlapping");
      });
    });

    describe("#when ranges are adjacent but not overlapping", () => {
      it("#then applies both", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const edits: HashlineEdit[] = [
          { op: "replace_range", pos: anchor(1, "line1"), end: anchor(2, "line2"), lines: ["A"] },
          { op: "replace_range", pos: anchor(3, "line3"), end: anchor(4, "line4"), lines: ["B"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("A\nB\nline5");
      });
    });
  });

  // ─── Bottom-Up Application ────────────────────────────────────
  describe("#given multiple edits at different positions", () => {
    describe("#when applying them in one call", () => {
      it("#then applies bottom-up so line numbers stay correct", () => {
        const content = "a\nb\nc\nd\ne";
        const edits: HashlineEdit[] = [
          { op: "replace_line", pos: anchor(2, "b"), lines: ["B1", "B2"] },
          { op: "replace_line", pos: anchor(4, "d"), lines: ["D1", "D2", "D3"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("a\nB1\nB2\nc\nD1\nD2\nD3\ne");
      });
    });
  });

  // ─── Mixed Operations ─────────────────────────────────────────
  describe("#given mixed operation types in one call", () => {
    describe("#when combining replace_line, append_at, and prepend_file", () => {
      it("#then all operations are applied correctly", () => {
        const content = "alpha\nbeta\ngamma";
        const edits: HashlineEdit[] = [
          { op: "replace_line", pos: anchor(2, "beta"), lines: ["BETA"] },
          { op: "append_at", pos: anchor(3, "gamma"), lines: ["delta"] },
          { op: "prepend_file", lines: ["header"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("header\nalpha\nBETA\ngamma\ndelta");
      });
    });
  });

  // ─── Boundary Duplication Warning ─────────────────────────────
  describe("#given a replacement whose last line matches the next surviving line", () => {
    describe("#when applying the edit", () => {
      it("#then produces a boundary duplication warning", () => {
        const content = "function foo() {\n  return 1;\n}";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, "  return 1;"),
            lines: ["  return 2;", "}"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("boundary duplication");
      });
    });
  });

  // ─── applyRawHashlineEdits ────────────────────────────────────
  describe("#given raw string-based edits", () => {
    describe("#when applying via applyRawHashlineEdits", () => {
      it("#then normalizes and applies correctly", () => {
        const content = "alpha\nbeta\ngamma";
        const rawEdits: RawHashlineEdit[] = [
          {
            op: "replace_line",
            pos: tag(2, "beta"),
            lines: ["BETA"],
          },
        ];
        const result = applyRawHashlineEdits(content, rawEdits);
        expect(result.content).toBe("alpha\nBETA\ngamma");
      });

      it("#then handles string lines (newline-split)", () => {
        const content = "alpha\nbeta\ngamma";
        const rawEdits: RawHashlineEdit[] = [
          {
            op: "replace_line",
            pos: tag(2, "beta"),
            lines: "BETA1\nBETA2",
          },
        ];
        const result = applyRawHashlineEdits(content, rawEdits);
        expect(result.content).toBe("alpha\nBETA1\nBETA2\ngamma");
      });

      it("#then handles null lines for deletion", () => {
        const content = "alpha\nbeta\ngamma";
        const rawEdits: RawHashlineEdit[] = [
          {
            op: "replace_line",
            pos: tag(2, "beta"),
            lines: null,
          },
        ];
        const result = applyRawHashlineEdits(content, rawEdits);
        expect(result.content).toBe("alpha\ngamma");
      });

      it("#then handles replace_range with string anchors", () => {
        const content = "line1\nline2\nline3\nline4\nline5";
        const rawEdits: RawHashlineEdit[] = [
          {
            op: "replace_range",
            pos: tag(2, "line2"),
            end: tag(4, "line4"),
            lines: ["REPLACED"],
          },
        ];
        const result = applyRawHashlineEdits(content, rawEdits);
        expect(result.content).toBe("line1\nREPLACED\nline5");
      });
    });
  });

  // ─── firstChangedLine tracking ────────────────────────────────
  describe("#given edits that modify file content", () => {
    describe("#when checking firstChangedLine", () => {
      it("#then reports the earliest changed line", () => {
        const content = "a\nb\nc\nd\ne";
        const edits: HashlineEdit[] = [
          { op: "replace_line", pos: anchor(4, "d"), lines: ["D"] },
          { op: "replace_line", pos: anchor(2, "b"), lines: ["B"] },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.firstChangedLine).toBe(2);
      });

      it("#then returns undefined when no changes were made", () => {
        const result = applyHashlineEdits("content", []);
        expect(result.firstChangedLine).toBeUndefined();
      });
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────
  describe("#given edge cases", () => {
    describe("#when editing a single-line file", () => {
      it("#then replaces correctly", () => {
        const content = "only line";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(1, "only line"),
            lines: ["new only line"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("new only line");
      });
    });

    describe("#when the file has empty lines", () => {
      it("#then handles empty line content correctly", () => {
        const content = "alpha\n\ngamma";
        const edits: HashlineEdit[] = [
          {
            op: "replace_line",
            pos: anchor(2, ""),
            lines: ["inserted"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("alpha\ninserted\ngamma");
      });
    });

    describe("#when applying edits to an empty file", () => {
      it("#then append_file creates content from nothing", () => {
        const result = applyHashlineEdits("", [{ op: "append_file", lines: ["hello"] }]);
        expect(result.content).toBe("hello");
      });

      it("#then prepend_file creates content from nothing", () => {
        const result = applyHashlineEdits("", [{ op: "prepend_file", lines: ["hello"] }]);
        expect(result.content).toBe("hello");
      });
    });

    describe("#when a replace_range covers the entire file", () => {
      it("#then replaces everything", () => {
        const content = "a\nb\nc";
        const edits: HashlineEdit[] = [
          {
            op: "replace_range",
            pos: anchor(1, "a"),
            end: anchor(3, "c"),
            lines: ["entirely new"],
          },
        ];
        const result = applyHashlineEdits(content, edits);
        expect(result.content).toBe("entirely new");
      });
    });
  });
});
