// Types for Light Service

import type { ModelManagerConfig, TaskManagerConfig } from '@agentic-os/core';

// Re-export event types from Core
export type {
  ShellEvent as SSEEvent,
  TaskStartedEvent,
  UserMessageRoutedEvent,
  ContentEvent,
  AbilityRequestEvent,
  AbilityResponseEvent,
  TaskCompletedEvent,
  ErrorEvent,
  PostRequest,
  PostResponse,
} from '@agentic-os/core';

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
  model?: ModelManagerConfig;
  task?: TaskManagerConfig;
  ledger?: {
    persistence?: boolean;
    maxEntries?: number;
  };
};

// Light Service uses Core's PostRequest/PostResponse types
export type PostMessageRequest = import('@agentic-os/core').PostRequest;
export type PostMessageResponse = import('@agentic-os/core').PostResponse;

export type SSEConnection = {
  taskId: string;
  controller: ReadableStreamDefaultController;
  isActive: boolean;
};

