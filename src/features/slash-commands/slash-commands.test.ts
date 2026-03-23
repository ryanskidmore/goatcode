import { describe, expect, it } from "bun:test"
import { getAllCommands, getCommand } from "./command-registry"

const EXPECTED_COMMAND_NAMES = [
  "ralph-loop",
  "ulw-loop",
  "cancel-ralph",
  "start-work",
  "stop-continuation",
  "handoff",
  "init-deep",
  "refactor",
] as const

describe("getAllCommands", () => {
  describe("#given the command registry is initialized", () => {
    describe("#when getAllCommands is called", () => {
      it("#then returns all 8 commands", () => {
        const commands = getAllCommands()
        expect(commands).toHaveLength(8)
      })

      it("#then every command has name, description, and template", () => {
        const commands = getAllCommands()
        for (const command of commands) {
          expect(typeof command.name).toBe("string")
          expect(command.name.length).toBeGreaterThan(0)
          expect(typeof command.description).toBe("string")
          expect(command.description.length).toBeGreaterThan(0)
          expect(typeof command.template).toBe("string")
          expect(command.template.length).toBeGreaterThan(0)
        }
      })

      it("#then all expected command names are present", () => {
        const commands = getAllCommands()
        const names = commands.map((c) => c.name)
        for (const expected of EXPECTED_COMMAND_NAMES) {
          expect(names).toContain(expected)
        }
      })
    })
  })
})

describe("getCommand", () => {
  describe("#given a valid command name", () => {
    describe("#when getCommand is called with 'ralph-loop'", () => {
      it("#then returns the ralph-loop command", () => {
        const command = getCommand("ralph-loop")
        expect(command).toBeDefined()
        expect(command?.name).toBe("ralph-loop")
      })
    })

    describe("#when getCommand is called with 'ulw-loop'", () => {
      it("#then returns the ulw-loop command", () => {
        const command = getCommand("ulw-loop")
        expect(command).toBeDefined()
        expect(command?.name).toBe("ulw-loop")
      })
    })

    describe("#when getCommand is called with 'cancel-ralph'", () => {
      it("#then returns the cancel-ralph command", () => {
        const command = getCommand("cancel-ralph")
        expect(command).toBeDefined()
        expect(command?.name).toBe("cancel-ralph")
      })
    })

    describe("#when getCommand is called with 'start-work'", () => {
      it("#then returns the start-work command", () => {
        const command = getCommand("start-work")
        expect(command).toBeDefined()
        expect(command?.name).toBe("start-work")
      })
    })

    describe("#when getCommand is called with 'stop-continuation'", () => {
      it("#then returns the stop-continuation command", () => {
        const command = getCommand("stop-continuation")
        expect(command).toBeDefined()
        expect(command?.name).toBe("stop-continuation")
      })
    })

    describe("#when getCommand is called with 'handoff'", () => {
      it("#then returns the handoff command", () => {
        const command = getCommand("handoff")
        expect(command).toBeDefined()
        expect(command?.name).toBe("handoff")
      })
    })

    describe("#when getCommand is called with 'init-deep'", () => {
      it("#then returns the init-deep command", () => {
        const command = getCommand("init-deep")
        expect(command).toBeDefined()
        expect(command?.name).toBe("init-deep")
      })
    })

    describe("#when getCommand is called with 'refactor'", () => {
      it("#then returns the refactor command with $ARGUMENTS in template", () => {
        const command = getCommand("refactor")
        expect(command).toBeDefined()
        expect(command?.name).toBe("refactor")
        expect(command?.template).toContain("$ARGUMENTS")
      })
    })
  })

  describe("#given an unknown command name", () => {
    describe("#when getCommand is called with an unregistered name", () => {
      it("#then returns undefined", () => {
        const command = getCommand("nonexistent-command")
        expect(command).toBeUndefined()
      })
    })
  })
})
