import { describe, expect, test } from "bun:test"

import { checkStability, createPollState } from "./poller"

describe("checkStability", () => {
  test("#given idle session with stable message count for two stable polls #then stable becomes true", () => {
    //#given
    const initialState = createPollState()

    //#when
    const firstPoll = checkStability(initialState, 3, true)
    const secondPoll = checkStability(firstPoll.nextState, 3, true)
    const thirdPoll = checkStability(secondPoll.nextState, 3, true)

    //#then
    expect(firstPoll.stable).toBeFalse()
    expect(secondPoll.stable).toBeFalse()
    expect(thirdPoll.stable).toBeTrue()
  })

  test("#given message count changes between polls #then stability stays false", () => {
    //#given
    const initialState = createPollState()

    //#when
    const firstPoll = checkStability(initialState, 4, true)
    const changedPoll = checkStability(firstPoll.nextState, 5, true)

    //#then
    expect(changedPoll.stable).toBeFalse()
    expect(changedPoll.nextState.stablePolls).toBe(0)
  })
})
