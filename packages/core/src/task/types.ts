// Task Manager types

import type { Task, Message } from '../types';
import type { LLMConfig } from './runloop';

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

