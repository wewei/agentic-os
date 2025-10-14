// Agent OS - Main Entry Point

import { createAgentBus } from './bus';
import { shell } from './shell';

import type { AgentModule } from './types';

export type AgentOS = {
  with: (module: AgentModule) => AgentOS;
  start: (port?: number) => Promise<void>;
  stop: () => Promise<void>;
};

export const createAgentOS = (): AgentOS => {
  console.log('Creating Agent OS...');

  // Create Agent Bus with bus controller
  const bus = createAgentBus();

  // Create shell module
  const shellModule = shell();

  // Register shell immediately (always present)
  shellModule.registerAbilities(bus);

  console.log('✓ Agent OS created with minimal bus and shell');

  const agentOS: AgentOS = {
    with: (module: AgentModule): AgentOS => {
      // Register module immediately when added
      module.registerAbilities(bus);
      return agentOS;
    },

    start: async (port = 3000): Promise<void> => {
      // Start shell server
      console.log(`\nStarting Agent OS on port ${port}...`);
      await shellModule.start(port);
      console.log('✓ Agent OS started');
    },

    stop: async (): Promise<void> => {
      console.log('\nStopping Agent OS...');
      await shellModule.stop();
      console.log('✓ Agent OS stopped');
    },
  };

  return agentOS;
};

// Export types
export type { AgentBus, AgentModule } from './types';
export type { Ledger, LedgerConfig } from './ledger';
export type { ModelManagerConfig } from './model';
export type { Task, Call, Message, MessageRole, CallStatus } from './types';

// Export module factories
export { ledger } from './ledger';
export { modelManager } from './model';
export { taskManager } from './task';

