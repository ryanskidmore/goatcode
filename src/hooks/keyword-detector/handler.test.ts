import { afterEach, describe, expect, it } from "bun:test";
import { clearSessionMode, createKeywordDetectorHandler, getSessionMode } from "./handler";

const SESSION_ID = "ses_test";

function makeInput(sessionID: string = SESSION_ID) {
  return { sessionID };
}

function makeOutput(text: string) {
  return {
    message: {},
    parts: [{ type: "text", text }],
  };
}

async function invokeHandler(
  handler: ReturnType<typeof createKeywordDetectorHandler>,
  input: ReturnType<typeof makeInput>,
  output: ReturnType<typeof makeOutput>,
) {
  await handler(
    input as Parameters<ReturnType<typeof createKeywordDetectorHandler>>[0],
    output as Parameters<ReturnType<typeof createKeywordDetectorHandler>>[1],
  );
}

describe("createKeywordDetectorHandler", () => {
  afterEach(() => {
    clearSessionMode(SESSION_ID);
  });

  describe("#given a handler instance", () => {
    const handler = createKeywordDetectorHandler();

    describe("#when message contains 'ultrawork'", () => {
      it("#then sets session mode to ultrawork", async () => {
        const input = makeInput();
        const output = makeOutput("let's ultrawork on this");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork");
      });
    });

    describe("#when message contains 'ulw' shorthand", () => {
      it("#then sets session mode to ultrawork", async () => {
        const input = makeInput();
        const output = makeOutput("ulw this task");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork");
      });
    });

    describe("#when message contains 'goatwork'", () => {
      it("#then sets session mode to ultrawork", async () => {
        const input = makeInput();
        const output = makeOutput("let's goatwork this feature");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork");
      });
    });

    describe("#when message contains 'goated'", () => {
      it("#then sets session mode to ultrawork", async () => {
        const input = makeInput();
        const output = makeOutput("goated effort on this refactor");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("ultrawork");
      });
    });

    describe("#when message contains 'deepthink'", () => {
      it("#then sets session mode to think", async () => {
        const input = makeInput();
        const output = makeOutput("deepthink this problem");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("think");
      });
    });

    describe("#when message contains 'deep-think'", () => {
      it("#then sets session mode to think", async () => {
        const input = makeInput();
        const output = makeOutput("please deep-think about this");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("think");
      });
    });

    describe("#when message contains 'fast'", () => {
      it("#then sets session mode to fast", async () => {
        const input = makeInput();
        const output = makeOutput("do this fast");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBe("fast");
      });
    });

    describe("#when keyword is inside a code block", () => {
      it("#then does not set session mode", async () => {
        const input = makeInput();
        const output = makeOutput("check this: ```ultrawork```");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBeUndefined();
      });
    });

    describe("#when keyword is inside inline code", () => {
      it("#then does not set session mode", async () => {
        const input = makeInput();
        const output = makeOutput("the function `ultrawork` is defined here");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBeUndefined();
      });
    });

    describe("#when message contains no keywords", () => {
      it("#then does not set session mode", async () => {
        const input = makeInput();
        const output = makeOutput("hello world");

        await invokeHandler(handler, input, output);

        expect(getSessionMode(SESSION_ID)).toBeUndefined();
      });
    });
  });
});
