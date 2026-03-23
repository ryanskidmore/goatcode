import { beforeEach, describe, expect, it } from "bun:test"
import {
  clearSessionMode,
  createKeywordDetectorHandler,
  getSessionMode,
  setSessionMode,
} from "./keyword-detector/handler"
import { createThinkModeHandler } from "./think-mode/handler"
import { createAnthropicEffortHandler } from "./anthropic-effort/handler"

const SESSION_ID = "test-session"

function makeChatMessageInput(sessionID: string = SESSION_ID) {
  return { sessionID }
}

function makeChatMessageOutput(text: string) {
  return {
    message: {},
    parts: [{ type: "text", text }],
  }
}

function makeChatParamsInput(providerID: string, modelID: string, sessionID: string = SESSION_ID) {
  return {
    sessionID,
    agent: "sisyphus",
    model: { providerID, modelID },
    provider: { id: providerID },
    message: {},
  }
}

function makeChatParamsOutput() {
  return {
    temperature: 0.1,
    topP: 1,
    topK: 0,
    options: {} as Record<string, unknown>,
  }
}

describe("keyword-detector", () => {
  beforeEach(() => {
    clearSessionMode(SESSION_ID)
  })

  describe("#given a message containing 'ultrawork'", () => {
    describe("#when the handler processes the message", () => {
      it("#then sets the session mode to 'ultrawork'", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("Please ultrawork on this task now")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork")
      })
    })
  })

  describe("#given a message containing 'ulw' shorthand", () => {
    describe("#when the handler processes the message", () => {
      it("#then sets the session mode to 'ultrawork'", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("ulw this task")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork")
      })
    })
  })

  describe("#given a message containing 'deep-think'", () => {
    describe("#when the handler processes the message", () => {
      it("#then sets the session mode to 'think'", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("Please deep-think about this problem")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBe("think")
      })
    })
  })

  describe("#given a message containing 'fast'", () => {
    describe("#when the handler processes the message", () => {
      it("#then sets the session mode to 'fast'", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("fast response please")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBe("fast")
      })
    })
  })

  describe("#given a message with no recognized keywords", () => {
    describe("#when the handler processes the message", () => {
      it("#then does not set a session mode", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("just a normal request")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBeUndefined()
      })
    })
  })

  describe("#given a keyword inside a code block", () => {
    describe("#when the handler processes the message", () => {
      it("#then does not set a session mode", async () => {
        const handler = createKeywordDetectorHandler()
        const input = makeChatMessageInput()
        const output = makeChatMessageOutput("check this code: ```ultrawork()```")

        await handler(input, output)

        expect(getSessionMode(SESSION_ID)).toBeUndefined()
      })
    })
  })
})

describe("think-mode", () => {
  beforeEach(() => {
    clearSessionMode(SESSION_ID)
  })

  describe("#given think mode is active for the session", () => {
    describe("#when chat.params hook is called with an Anthropic Claude model", () => {
      it("#then injects thinking parameters with budget_tokens", async () => {
        setSessionMode(SESSION_ID, "think")
        const handler = createThinkModeHandler()
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        })
      })
    })
  })

  describe("#given think mode is active and model is github-copilot claude", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking parameters", async () => {
        setSessionMode(SESSION_ID, "think")
        const handler = createThinkModeHandler()
        const input = makeChatParamsInput("github-copilot", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        })
      })
    })
  })

  describe("#given think mode is not active", () => {
    describe("#when chat.params hook is called", () => {
      it("#then does not inject thinking parameters", async () => {
        const handler = createThinkModeHandler()
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toBeUndefined()
      })
    })
  })

  describe("#given think mode is active but model is not Anthropic Claude", () => {
    describe("#when chat.params hook is called with an OpenAI model", () => {
      it("#then does not inject thinking parameters", async () => {
        setSessionMode(SESSION_ID, "think")
        const handler = createThinkModeHandler()
        const input = makeChatParamsInput("openai", "gpt-5.4")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toBeUndefined()
      })
    })
  })

  describe("#given think mode is active but thinking is already set", () => {
    describe("#when chat.params hook is called", () => {
      it("#then does not overwrite existing thinking config", async () => {
        setSessionMode(SESSION_ID, "think")
        const handler = createThinkModeHandler()
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()
        output.options.thinking = { type: "enabled", budget_tokens: 5000 }

        await handler(input, output)

        expect(output.options.thinking).toEqual({ type: "enabled", budget_tokens: 5000 })
      })
    })
  })
})

describe("anthropic-effort", () => {
  describe("#given effort level 'medium' and an Anthropic Claude model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=5000", async () => {
        const handler = createAnthropicEffortHandler("medium")
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 5000,
        })
      })
    })
  })

  describe("#given effort level 'high' and an Anthropic Claude model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=10000", async () => {
        const handler = createAnthropicEffortHandler("high")
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 10000,
        })
      })
    })
  })

  describe("#given effort level 'max' and an Anthropic Claude model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then injects thinking with budget_tokens=32000", async () => {
        const handler = createAnthropicEffortHandler("max")
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 32000,
        })
      })
    })
  })

  describe("#given effort level 'max' and Opus model", () => {
    describe("#when chat.params hook is called", () => {
      it("#then also injects effort='max' for opus", async () => {
        const handler = createAnthropicEffortHandler("max")
        const input = makeChatParamsInput("anthropic", "claude-opus-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toEqual({
          type: "enabled",
          budget_tokens: 32000,
        })
        expect(output.options.effort).toBe("max")
      })
    })
  })

  describe("#given effort level 'low'", () => {
    describe("#when chat.params hook is called", () => {
      it("#then does not inject any parameters", async () => {
        const handler = createAnthropicEffortHandler("low")
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toBeUndefined()
      })
    })
  })

  describe("#given an OpenAI model", () => {
    describe("#when chat.params hook is called with effort 'high'", () => {
      it("#then does not inject Anthropic-specific parameters", async () => {
        const handler = createAnthropicEffortHandler("high")
        const input = makeChatParamsInput("openai", "gpt-5.4")
        const output = makeChatParamsOutput()

        await handler(input, output)

        expect(output.options.thinking).toBeUndefined()
      })
    })
  })

  describe("#given thinking is already configured in options", () => {
    describe("#when chat.params hook is called with effort 'high'", () => {
      it("#then does not overwrite existing thinking config", async () => {
        const handler = createAnthropicEffortHandler("high")
        const input = makeChatParamsInput("anthropic", "claude-sonnet-4-6")
        const output = makeChatParamsOutput()
        output.options.thinking = { type: "enabled", budget_tokens: 999 }

        await handler(input, output)

        expect(output.options.thinking).toEqual({ type: "enabled", budget_tokens: 999 })
      })
    })
  })
})
