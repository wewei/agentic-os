// Task Manager
import { z } from 'zod';

import { registerTaskAbilities } from './abilities';
import { createExecuteTask } from './runloop';

import type { Module, SystemBus, AbilityMeta, AbilityResult } from '../types';
import type { TaskRegistry, TaskManagerConfig, TaskModelConfig } from './types';

const DEFAULT_MODELS: TaskModelConfig[] = [
  {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    model: 'gpt-4-turbo',
  },
  {
    name: 'GPT-4',
    provider: 'openai',
    model: 'gpt-4',
  },
  {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
  },
];

// Schema for task:models ability
const TASK_MODELS_INPUT_SCHEMA = z.object({});

const TASK_MODELS_OUTPUT_SCHEMA = z.object({
  models: z.array(z.object({
    name: z.string(),
    provider: z.string(),
    model: z.string(),
  })),
});

type TaskModelsInput = z.infer<typeof TASK_MODELS_INPUT_SCHEMA>;
type TaskModelsOutput = z.infer<typeof TASK_MODELS_OUTPUT_SCHEMA>;

const TASK_MODELS_META: AbilityMeta<TaskModelsInput, TaskModelsOutput> = {
  moduleName: 'task',
  abilityName: 'models',
  description: 'Get available task LLM models',
  inputSchema: TASK_MODELS_INPUT_SCHEMA,
  outputSchema: TASK_MODELS_OUTPUT_SCHEMA,
};

const registerGetModelsAbility = (
  availableModels: TaskModelConfig[],
  bus: SystemBus
): void => {
  bus.register(
    'task:models',
    TASK_MODELS_META,
    async (): Promise<AbilityResult<TaskModelsOutput, string>> => {
      try {
        return {
          type: 'success',
          result: { models: availableModels },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          type: 'error',
          error: errorMessage,
        };
      }
    }
  );
};

export const taskManager = (config?: TaskManagerConfig): Module => {
  const registry: TaskRegistry = new Map();
  const availableModels = config?.availableModels ?? DEFAULT_MODELS;

  return {
    registerAbilities: (bus): void => {
      // Create execute task function
      const executeTask = createExecuteTask(registry, bus);

      // Register task abilities
      registerTaskAbilities(registry, bus, executeTask);

      // Register get models ability
      registerGetModelsAbility(availableModels, bus);
    },
  };
};

export type { TaskRegistry, TaskState, TaskManagerConfig, TaskModelConfig } from './types';
export type { LLMConfig } from './runloop';

