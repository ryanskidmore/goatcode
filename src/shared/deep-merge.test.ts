import { describe, test, expect } from "bun:test"
import { deepMerge } from "./deep-merge"

describe("deepMerge", () => {
  describe("with nested objects", () => {
    test("merges nested keys without losing siblings", () => {
      //#given
      const base = { a: 1, b: { c: 2, d: 3 } }
      const override = { b: { c: 10 }, e: 5 }
      //#when
      const result = deepMerge(base, override)
      //#then
      expect(result).toEqual({ a: 1, b: { c: 10, d: 3 }, e: 5 })
    })

    test("override wins for scalar values", () => {
      //#given
      const base = { x: "original" }
      const override = { x: "updated" }
      //#when
      const result = deepMerge(base, override)
      //#then
      expect(result?.x).toBe("updated")
    })

    test("undefined override values do not overwrite base", () => {
      //#given
      const base = { a: "keep" }
      const override = { a: undefined }
      //#when
      const result = deepMerge(base, override as typeof base)
      //#then
      expect(result?.a).toBe("keep")
    })
  })
})
