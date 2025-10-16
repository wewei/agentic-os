// Types for Light Service

import type { LLMConfig } from '@agentic-os/core';

export type EndpointConfig = {
  host?: string;
  port?: number;
  path?: string;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
};

export type AgenticConfig = {
  endpoint?: EndpointConfig;
  model?: {
    providers?: Record<string, unknown>;
  };
  task?: {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
  };
  ledger?: {
    persistence?: boolean;
    maxEntries?: number;
  };
};

export type PostMessageRequest = {
  message: string;
  taskId?: string;
  llmConfig?: LLMConfig;
};

export type PostMessageResponse = {
  taskId: string;
  status: string;
};

export type SSEConnection = {
  taskId: string;
  controller: ReadableStreamDefaultController;
  isActive: boolean;
};

// Re-export relevant types from core
export type { ShellMessage, PostRequest, PostResponse } from '@agentic-os/core';


