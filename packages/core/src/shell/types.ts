// Shell types

import type { LLMConfig } from '../task/runloop';

export type ShellMessage = {
  type: 'start' | 'content' | 'tool_call' | 'tool_result' | 'message_complete' | 'end' | 'error';
  taskId: string;
  content?: string;
  messageId?: string;
  index?: number;
  tool?: string;
  args?: unknown;
  result?: unknown;
  status?: string;
  error?: string;
};

export type ShellConfig = {
  onMessage: (message: ShellMessage) => void;
};

export type PostRequest = {
  message: string;
  taskId?: string;
  llmConfig?: LLMConfig; // Required for new tasks, optional for existing tasks
};

export type PostResponse = {
  taskId: string;
  status: string;
};

