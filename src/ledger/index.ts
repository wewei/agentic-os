// Ledger module entry point

import { registerLedgerAbilities } from './abilities';
import { createMockLedger } from './mock';

import type { AgentModule } from '../types';

export type LedgerConfig = {
  type?: 'mock';
  // Future: add real DB config options
};

export const ledger = (): AgentModule => {
  // For now, only support mock ledger
  const ledgerInstance = createMockLedger();

  return {
    registerAbilities: (bus): void => {
      registerLedgerAbilities(ledgerInstance, bus);
    },
  };
};

export type { Ledger } from './types';

