import { describe, it, expect } from "bun:test"
import { createProgram } from "./cli"

describe("#given the goatcode CLI program", () => {
  describe("#when the program is created", () => {
    it("#then the program name is goatcode", () => {
      const program = createProgram()
      expect(program.name()).toBe("goatcode")
    })

    it("#then the program has a version from package.json", () => {
      const program = createProgram()
      const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/
      expect(program.version()).toMatch(semverRegex)
    })

    it("#then the install subcommand is registered", () => {
      const program = createProgram()
      const names = program.commands.map((cmd) => cmd.name())
      expect(names).toContain("install")
    })

    it("#then the doctor subcommand is registered", () => {
      const program = createProgram()
      const names = program.commands.map((cmd) => cmd.name())
      expect(names).toContain("doctor")
    })

    it("#then the update subcommand is registered", () => {
      const program = createProgram()
      const names = program.commands.map((cmd) => cmd.name())
      expect(names).toContain("update")
    })

    it("#then exactly three subcommands are registered", () => {
      const program = createProgram()
      expect(program.commands).toHaveLength(3)
    })
  })
})
