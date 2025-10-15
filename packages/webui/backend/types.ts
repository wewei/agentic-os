// Backend types for WebUI server

import type { ShellMessage } from '@agentic-os/core';

export type PostMessageRequest = {
  message: string;
  taskId?: string;
};

export type PostMessageResponse = {
  taskId: string;
  status: string;
};

export type SSEConnection = {
  taskId: string;
  response: Response;
  isActive: boolean;
};

export type WebUIConfig = {
  port?: number;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
};

// Re-export relevant types from core
export type { ShellMessage, PostRequest, PostResponse } from '@agentic-os/core';
