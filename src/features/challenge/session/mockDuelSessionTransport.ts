import { createMockDuelChannelPair } from "../../../contracts/mocks/mockDuelChannel";
import type { DuelSessionTransport } from "./duelSessionTransport";
import { abortableDelay } from "./sessionUtils";

// Tunables for exercising the connection UI without a real peer.
const MOCK_CONNECT_LATENCY_MS = 1200;
/** Fraction of attempts that fail, so the auto-retry / manual-retry UI is reachable. */
const MOCK_CONNECT_FAILURE_RATE = 0.35;
/** If set, the link drops this long after connecting (tests the abort UI). `null` disables. */
const MOCK_DROP_AFTER_MS: number | null = null;

/**
 * Simulated transport: no BLE, no second device. Connects after a short delay,
 * fails a fraction of the time, and hands back a working in-memory channel.
 * Lets the whole 3.8 / 3.9 flow be built and demoed on one phone.
 */
export const mockDuelSessionTransport: DuelSessionTransport = {
  async connect(_params, signal) {
    await abortableDelay(MOCK_CONNECT_LATENCY_MS, signal);

    if (Math.random() < MOCK_CONNECT_FAILURE_RATE) {
      throw new Error("Couldn't reach the other player.");
    }

    const [channel] = createMockDuelChannelPair();
    const dropHandlers: Array<(message: string) => void> = [];
    let dropTimer: ReturnType<typeof setTimeout> | undefined;

    if (MOCK_DROP_AFTER_MS !== null) {
      dropTimer = setTimeout(() => {
        dropHandlers.forEach((handler) =>
          handler("The connection to the other player dropped.")
        );
      }, MOCK_DROP_AFTER_MS);
    }

    return {
      channel,
      onDrop: (handler) => {
        dropHandlers.push(handler);
      },
      disconnect: () => {
        if (dropTimer) {
          clearTimeout(dropTimer);
        }
        dropHandlers.length = 0;
      }
    };
  }
};
