import type { DuelChannel } from "../../contracts/duelChannel";
import {
  DuelDisconnectRecovery,
  MAX_RECONNECT_ATTEMPTS,
  type DisconnectContext
} from "./disconnectRecovery";
import { createRoundLoop } from "./roundLoop";

function createFakeChannel(connected: boolean) {
  let isConnected = connected;
  return {
    send: () => {},
    onMessage: () => () => {},
    isConnected: () => isConnected,
    setConnected: (value: boolean) => {
      isConnected = value;
    }
  } satisfies DuelChannel & { setConnected: (value: boolean) => void };
}

describe("DuelDisconnectRecovery", () => {
  test("carries matchState through an already-connected recovery", async () => {
    const channel = createFakeChannel(true);
    const recovery = new DuelDisconnectRecovery(channel, async () => true);
    const context: DisconnectContext = {
      phase: "match",
      roundNumber: 2,
      matchState: createRoundLoop(["a", "b"])
    };

    const state = await recovery.recover(context);

    expect(state).toEqual({ status: "recovered", attempts: 0, context });
  });

  test("carries matchState through a successful reconnect attempt", async () => {
    const channel = createFakeChannel(false);
    const seen: string[] = [];
    const recovery = new DuelDisconnectRecovery(channel, async () => {
      channel.setConnected(true);
      return true;
    });
    const context: DisconnectContext = {
      phase: "round",
      roundNumber: 1,
      matchState: createRoundLoop(["a", "b"])
    };
    recovery.onState((state) => seen.push(state.status));

    const state = await recovery.recover(context);

    expect(state).toEqual({ status: "recovered", attempts: 1, context });
    expect(seen).toEqual(["retrying", "recovered"]);
  });

  test("carries matchState through to an aborted recovery", async () => {
    const channel = createFakeChannel(false);
    let abortedWith: DisconnectContext | null = null;
    const recovery = new DuelDisconnectRecovery(
      channel,
      async () => false,
      (context) => {
        abortedWith = context;
      }
    );
    const context: DisconnectContext = {
      phase: "match",
      matchState: createRoundLoop(["a", "b"])
    };

    const state = await recovery.recover(context);

    expect(state).toEqual({
      status: "aborted",
      attempts: MAX_RECONNECT_ATTEMPTS,
      context
    });
    expect(abortedWith).toEqual(context);
  });
});
