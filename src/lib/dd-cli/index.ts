import { MockDoorDashCli } from "./mock";
import { RealDoorDashCli } from "./real";
import type { DoorDashCli } from "./types";

/**
 * Prefer real CLI only when explicitly enabled AND not forced to mock.
 * Default = mock so Windows / pre-waitlist frontend work keeps shipping.
 */
export function getDoorDashCli(): DoorDashCli {
  const forceMock =
    process.env.DD_CLI_MOCK === "1" || process.env.DD_CLI_MOCK === "true";
  const forceReal =
    process.env.DD_CLI_USE_REAL === "1" || process.env.DD_CLI_USE_REAL === "true";

  if (forceMock || !forceReal) {
    return new MockDoorDashCli();
  }
  return new RealDoorDashCli();
}

export * from "./types";
export { MockDoorDashCli } from "./mock";
export { RealDoorDashCli } from "./real";
