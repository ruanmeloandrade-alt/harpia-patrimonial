import type { AutomationCommandResult, SalesBotCommandPort } from '../automations/contracts';
import { resumeDueSalesBotExecutions } from '../automations/runtimePorts';

export interface SalesBotDelayScheduler {
  tick(now?: Date): Promise<Array<{ executionId: string; result: AutomationCommandResult }>>;
  start(): void;
  stop(): void;
}

export function createSalesBotDelayScheduler(
  commandPort: SalesBotCommandPort,
  options: { pollIntervalMs?: number } = {},
): SalesBotDelayScheduler {
  const pollIntervalMs = Math.max(1_000, options.pollIntervalMs ?? 30_000);
  let timer: ReturnType<typeof setInterval> | undefined;
  let ticking = false;

  const tick = async (now = new Date()) => {
    if (ticking) return [];
    ticking = true;
    try {
      return await resumeDueSalesBotExecutions(commandPort, now);
    } finally {
      ticking = false;
    }
  };

  return {
    tick,
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(() => { void tick(); }, pollIntervalMs);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    },
  };
}
