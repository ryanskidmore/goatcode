import { log } from "../../shared/logger";

export const POLLING_INTERVAL_MS = 3_000;
export const STABILITY_REQUIRED_POLLS = 2;

export type PollState = {
  lastMessageCount: number;
  stablePolls: number;
};

export type PollSnapshot = {
  messageCount: number;
  isIdle: boolean;
  result?: string;
};

export function createPollState(): PollState {
  return { lastMessageCount: -1, stablePolls: 0 };
}

export function checkStability(
  state: PollState,
  currentMessageCount: number,
  isIdle: boolean,
): { stable: boolean; nextState: PollState } {
  if (!isIdle) {
    return {
      stable: false,
      nextState: { lastMessageCount: currentMessageCount, stablePolls: 0 },
    };
  }

  if (currentMessageCount === state.lastMessageCount) {
    const stablePolls = state.stablePolls + 1;
    return {
      stable: stablePolls >= STABILITY_REQUIRED_POLLS,
      nextState: { lastMessageCount: currentMessageCount, stablePolls },
    };
  }

  return {
    stable: false,
    nextState: { lastMessageCount: currentMessageCount, stablePolls: 0 },
  };
}

export async function pollUntilStable(
  fetchSnapshot: () => Promise<PollSnapshot>,
  maxPolls = 120,
  signal?: AbortSignal,
): Promise<PollSnapshot> {
  let state = createPollState();

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    if (signal?.aborted) {
      throw new Error("Polling cancelled");
    }

    const latest = await fetchSnapshot();
    const { stable, nextState } = checkStability(state, latest.messageCount, latest.isIdle);
    state = nextState;

    if (stable) {
      log("[poller] Session reached stable completion", {
        messageCount: latest.messageCount,
        stablePolls: state.stablePolls,
      });
      return latest;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
  }

  throw new Error("Background polling timed out before reaching stable completion");
}
