import { describe, expect, it } from "bun:test";
import { getAllCommands, getCommand } from "./command-registry";

const EXPECTED_COMMAND_NAMES = [
  "loop",
  "cancel-loop",
  "start-work",
  "stop-continuation",
  "handoff",
  "init-deep",
] as const;

describe("getAllCommands", () => {
  describe("#given the command registry is initialized", () => {
    describe("#when getAllCommands is called", () => {
      it("#then returns all 6 commands", () => {
        const commands = getAllCommands();
        expect(commands).toHaveLength(EXPECTED_COMMAND_NAMES.length);
      });

      it("#then every command has name, description, and template", () => {
        const commands = getAllCommands();
        for (const command of commands) {
          expect(typeof command.name).toBe("string");
          expect(command.name.length).toBeGreaterThan(0);
          expect(typeof command.description).toBe("string");
          expect(command.description.length).toBeGreaterThan(0);
          expect(typeof command.template).toBe("string");
          expect(command.template.length).toBeGreaterThan(0);
        }
      });

      it("#then all expected command names are present", () => {
        const commands = getAllCommands();
        const names = commands.map((c) => c.name);
        for (const expected of EXPECTED_COMMAND_NAMES) {
          expect(names).toContain(expected);
        }
      });
    });
  });
});

describe("getCommand", () => {
  describe("#given a valid command name", () => {
    for (const name of EXPECTED_COMMAND_NAMES) {
      it(`#then returns '${name}'`, () => {
        const command = getCommand(name);
        expect(command).toBeDefined();
        expect(command?.name).toBe(name);
      });
    }

    it("#then returns the start-work command with $ARGUMENTS in template", () => {
      const command = getCommand("start-work");
      expect(command?.template).toContain("$ARGUMENTS");
    });
  });

  describe("#given an unknown command name", () => {
    describe("#when getCommand is called with an unregistered name", () => {
      it("#then returns undefined", () => {
        const command = getCommand("nonexistent-command");
        expect(command).toBeUndefined();
      });
    });
  });
});
