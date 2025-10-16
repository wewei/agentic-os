import type { ModelManagerConfig } from '@agentic-os/core';

/**
 * CLI configuration
 */
export type CLIConfig = {
  model: ModelManagerConfig;
};

/**
 * Message sent to AgenticOS
 */
export type MessageRequest = {
  message: string;
  taskId?: string;
};

/**
 * Response from AgenticOS
 */
export type MessageResponse = {
  taskId: string;
  status: 'created' | 'active' | 'completed' | 'failed';
  message?: string;
};
