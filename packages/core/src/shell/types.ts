// Shell types

import type { LLMConfig } from '../task/runloop';
import type { InvokeResult } from '../types';

// ============================================================================
// Shell Event Types
// ============================================================================

export type TaskStartedEvent = {
  type: 'task_started';
  taskId: string;
  triggerMessageId: string;
  taskName: string;
  timestamp: number;
};

export type UserMessageRoutedEvent = {
  type: 'user_message_routed';
  userMessageId: string;
  taskId: string;
  timestamp: number;
};

export type ContentEvent = {
  type: 'content';
  taskId: string;
  messageId: string;
  index: number;
  content: string;
  timestamp: number;
};

export type AbilityRequestEvent = {
  type: 'ability_request';
  taskId: string;
  callId: string;
  abilityId: string;
  input: string;
  timestamp: number;
};

export type AbilityResponseEvent = {
  type: 'ability_response';
  taskId: string;
  callId: string;
  abilityId: string;
  result: InvokeResult<string, string>;
  timestamp: number;
};

export type TaskCompletedEvent = {
  type: 'task_completed';
  taskId: string;
  timestamp: number;
};

export type ErrorEvent = {
  type: 'error';
  taskId?: string;
  userMessageId?: string;
  errorCode: string;
  errorMessage: string;
  timestamp: number;
};

export type ShellEvent = 
  | TaskStartedEvent
  | UserMessageRoutedEvent
  | ContentEvent
  | AbilityRequestEvent
  | AbilityResponseEvent
  | TaskCompletedEvent
  | ErrorEvent;

// ============================================================================
// Shell Interface
// ============================================================================

export type Shell = {
  // 路由用户消息（供主入口使用）
  post: (request: PostRequest) => Promise<PostResponse>;
};


// ============================================================================
// Post Request/Response Types
// ============================================================================

export type PostRequest = {
  userMessageId: string;
  message: string;
  llmConfig: LLMConfig;
  relatedTaskIds?: string[];
};

export type PostResponse = {
  status: string;
  routedTasks: string[];
};

