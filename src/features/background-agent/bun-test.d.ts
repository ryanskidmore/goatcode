declare module "bun:test" {
  export interface ExpectMatchers {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeTrue(): void
    toBeFalse(): void
  }

  export function describe(name: string, fn: () => void | Promise<void>): void
  export function test(name: string, fn: () => void | Promise<void>): void
  export function expect(received: unknown): ExpectMatchers
}
