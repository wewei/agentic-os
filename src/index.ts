// Agentic OS - Main Entry Point

import { createSystemBus } from './bus';
import { shell } from './shell';

import type { Module } from './types';
import type { ShellConfig, PostRequest, PostResponse } from './shell/types';

export type AgenticOSConfig = {
  shell: ShellConfig;
};

export type AgenticOS = {
  with: (module: Module) => AgenticOS;
  post: (request: PostRequest) => Promise<PostResponse>;
};

export const createAgenticOS = (config: AgenticOSConfig): AgenticOS => {
  console.log('Creating Agentic OS...');

  // Create System Bus with bus controller
  const bus = createSystemBus();

  // Create shell module with config
  const shellModule = shell(config.shell);

  // Register shell immediately (always present)
  shellModule.registerAbilities(bus);

  console.log('✓ Agentic OS created with minimal bus and shell');

  const agenticOS: AgenticOS = {
    with: (module: Module): AgenticOS => {
      // Register module immediately when added
      module.registerAbilities(bus);
      return agenticOS;
    },

    post: async (request: PostRequest): Promise<PostResponse> => {
      return shellModule.post(request);
    },
  };

  return agenticOS;
};

// Export types
export type { SystemBus, Module } from './types';
export type { Ledger, LedgerConfig } from './ledger';
export type { ModelManagerConfig } from './model';
export type { Task, Call, Message, MessageRole, CallStatus } from './types';
export type { ShellMessage, ShellConfig, PostRequest, PostResponse } from './shell/types';

// Export module factories
export { ledger } from './ledger';
export { modelManager } from './model';
export { taskManager } from './task';

