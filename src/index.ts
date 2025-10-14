// Agent OS - Main Entry Point

import { createAgentBus } from './bus';
import { shell } from './shell';

import type { AgentModule } from './types';
import type { ShellConfig, PostRequest, PostResponse } from './shell/types';

export type AgentOSConfig = {
  shell: ShellConfig;
};

export type AgentOS = {
  with: (module: AgentModule) => AgentOS;
  post: (request: PostRequest) => Promise<PostResponse>;
};

export const createAgentOS = (config: AgentOSConfig): AgentOS => {
  console.log('Creating Agent OS...');

  // Create Agent Bus with bus controller
  const bus = createAgentBus();

  // Create shell module with config
  const shellModule = shell(config.shell);

  // Register shell immediately (always present)
  shellModule.registerAbilities(bus);

  console.log('✓ Agent OS created with minimal bus and shell');

  const agentOS: AgentOS = {
    with: (module: AgentModule): AgentOS => {
      // Register module immediately when added
      module.registerAbilities(bus);
      return agentOS;
    },

    post: async (request: PostRequest): Promise<PostResponse> => {
      return shellModule.post(request);
    },
  };

  return agentOS;
};

// Export types
export type { AgentBus, AgentModule } from './types';
export type { Ledger, LedgerConfig } from './ledger';
export type { ModelManagerConfig } from './model';
export type { Task, Call, Message, MessageRole, CallStatus } from './types';
export type { ShellMessage, ShellConfig, PostRequest, PostResponse } from './shell/types';

// Export module factories
export { ledger } from './ledger';
export { modelManager } from './model';
export { taskManager } from './task';

