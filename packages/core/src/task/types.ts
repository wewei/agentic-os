// Task Manager types

import type { Task, Message } from '../types';
import type { LLMConfig } from './runloop';

export type TaskModelConfig = {
  name: string; // Human-readable name
  provider: string; // Provider (e.g., 'openai', 'anthropic')
  model: string; // Model identifier (e.g., 'gpt-4', 'claude-3-opus')
};

export type TaskManagerConfig = {
  availableModels?: TaskModelConfig[];
};

export type TaskState = {
  task: Task;
  messages: Message[];
  isRunning: boolean;
  goal: string; // Short description for routing decisions
  lastActivityTime: number;
  currentLLMConfig: LLMConfig; // Current LLM configuration for this task
};

export type ExecutionContext = {
  taskId: string;
  messages: Message[];
};

export type TaskRegistry = Map<string, TaskState>;

