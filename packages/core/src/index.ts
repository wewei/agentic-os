// Agentic OS - Main Entry Point

import { createSystemBus } from './bus';
import { shell } from './shell';

import type { ShellConfig, PostRequest, PostResponse } from './shell/types';
import type { TaskModelConfig } from './task';
import type { Module, SystemBus } from './types';

export type AgenticOSConfig = {
  shell: ShellConfig;
};

export type AgenticOS = {
  with: (module: Module) => AgenticOS;
  post: (request: PostRequest) => Promise<PostResponse>;
  getTaskModels: () => Promise<TaskModelConfig[]>;
};

const unwrapInvokeResult = <T>(
  result: { type: string; result?: T; error?: string; message?: string }
): T => {
  if (result.type === 'success' && result.result !== undefined) {
    return result.result;
  }
  const errorMsg = result.type === 'error' ? result.error : result.message;
  throw new Error(`Invoke failed (${result.type}): ${errorMsg}`);
};

export const createAgenticOS = (config: AgenticOSConfig): AgenticOS => {
  console.log('Creating Agentic OS...');

  // Create System Bus with bus controller
  const bus: SystemBus = createSystemBus();

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

    getTaskModels: async (): Promise<TaskModelConfig[]> => {
      try {
        const result = await bus.invoke('task:models', 'sys', 'system', '{}');
        const data = unwrapInvokeResult<string>(result);
        const parsed = JSON.parse(data) as { models: TaskModelConfig[] };
        return parsed.models;
      } catch (error) {
        console.error('Failed to get task models:', error);
        return [];
      }
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
export type { LLMConfig, TaskManagerConfig, TaskModelConfig } from './task';

// Export module factories
export { ledger } from './ledger';
export { modelManager } from './model';
export { taskManager } from './task';

