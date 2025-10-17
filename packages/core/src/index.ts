// Agentic OS - Main Entry Point

import { createSystemBus } from './bus';
import { createShell } from './shell';

import type { PostRequest, PostResponse, Shell } from './shell/types';
import type { TaskModelConfig } from './task';
import type { Module, BusDelegate } from './types';

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

export const createAgenticOS = (delegate: BusDelegate): AgenticOS => {
  console.log('Creating Agentic OS...');

  // Create System Bus with delegate
  const bus = createSystemBus(delegate);

  // Create Shell (only needs Bus to invoke abilities)
  const shellInstance: Shell = createShell(bus);

  console.log('✓ Agentic OS created with bus and shell');

  const agenticOS: AgenticOS = {
    with: (module: Module): AgenticOS => {
      module.registerAbilities(bus);
      return agenticOS;
    },

    post: async (request: PostRequest): Promise<PostResponse> => {
      return shellInstance.post(request);
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
export type { SystemBus, Module, InvokeResult, BusDelegate } from './types';
export type { Ledger, LedgerConfig } from './ledger';
export type { ModelManagerConfig } from './model';
export type { Task, Call, Message, MessageRole, CallStatus } from './types';
export type { 
  Shell,
  ShellEvent,
  TaskStartedEvent,
  UserMessageRoutedEvent,
  ContentEvent,
  AbilityRequestEvent,
  AbilityResponseEvent,
  TaskCompletedEvent,
  ErrorEvent,
  PostRequest, 
  PostResponse 
} from './shell/types';
export type { LLMConfig, TaskManagerConfig, TaskModelConfig } from './task';

// Export module factories
export { ledger } from './ledger';
export { modelManager } from './model';
export { taskManager } from './task';

