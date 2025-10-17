// Shell Module - Message Handler

import { v4 as uuidv4 } from 'uuid';

import { registerShellAbilities } from './abilities';

import type { SystemBus, Module, InvokeResult } from '../types';
import type { ShellConfig, PostRequest, PostResponse, UserMessageRoutedEvent } from './types';
import type { LLMConfig } from '../task/runloop';

type ShellModule = Module & {
  post: (request: PostRequest) => Promise<PostResponse>;
};

// Custom error for validation failures
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const generateCallId = (): string => {
  return uuidv4().replace(/-/g, '');
};

const unwrapInvokeResult = (result: InvokeResult<string, string>): string => {
  if (result.type === 'success') {
    return result.result;
  }
  const errorMsg = result.type === 'error' ? result.error : result.message;
  throw new Error(`Invoke failed (${result.type}): ${errorMsg}`);
};

const validatePostRequest = (request: PostRequest): void => {
  // Validate userMessageId
  if (typeof request.userMessageId !== 'string' || request.userMessageId.trim() === '') {
    throw new ValidationError('Invalid userMessageId: must be non-empty string');
  }
  
  // Validate message
  if (typeof request.message !== 'string' || request.message.trim() === '') {
    throw new ValidationError('Invalid message: must be non-empty string');
  }
  
  // Validate llmConfig (required)
  if (!request.llmConfig) {
    throw new ValidationError('llmConfig is required');
  }
  if (typeof request.llmConfig.provider !== 'string' || request.llmConfig.provider.trim() === '') {
    throw new ValidationError('Invalid provider: must be non-empty string');
  }
  if (typeof request.llmConfig.model !== 'string' || request.llmConfig.model.trim() === '') {
    throw new ValidationError('Invalid model: must be non-empty string');
  }
  if (request.llmConfig.topP !== undefined && (typeof request.llmConfig.topP !== 'number' || request.llmConfig.topP < 0 || request.llmConfig.topP > 1)) {
    throw new ValidationError('Invalid topP: must be number between 0 and 1');
  }
  if (request.llmConfig.temperature !== undefined && (typeof request.llmConfig.temperature !== 'number' || request.llmConfig.temperature < 0 || request.llmConfig.temperature > 2)) {
    throw new ValidationError('Invalid temperature: must be number between 0 and 2');
  }
  
  // Validate relatedTaskIds
  if (request.relatedTaskIds !== undefined) {
    if (!Array.isArray(request.relatedTaskIds)) {
      throw new ValidationError('relatedTaskIds must be an array');
    }
    for (const taskId of request.relatedTaskIds) {
      if (typeof taskId !== 'string' || taskId.trim() === '') {
        throw new ValidationError('All relatedTaskIds must be non-empty strings');
      }
    }
  }
};

const createNewTask = async (
  callId: string,
  bus: SystemBus,
  message: string,
  llmConfig: LLMConfig
): Promise<string> => {
  const result = unwrapInvokeResult(await bus.invoke(
    'task:spawn',
    callId,
    'shell',
    JSON.stringify({
      goal: message,
      provider: llmConfig.provider,
      model: llmConfig.model,
      topP: llmConfig.topP,
      temperature: llmConfig.temperature,
    })
  ));
  const parsed = JSON.parse(result);
  return parsed.taskId;
};

export const shell = (config: ShellConfig): ShellModule => {
  let bus: SystemBus | undefined;
  
  // State for idempotency and routing
  const processedMessages = new Set<string>();
  const userMessageToTasks = new Map<string, Set<string>>();

  const routeUserMessage = async (
    callId: string,
    request: PostRequest
  ): Promise<string[]> => {
    if (!bus) {
      throw new Error('Shell not initialized: registerAbilities must be called first');
    }

    const { userMessageId, message, llmConfig } = request;
    
    // Idempotency check
    if (processedMessages.has(userMessageId)) {
      const existingTasks = userMessageToTasks.get(userMessageId);
      return existingTasks ? Array.from(existingTasks) : [];
    }
    
    processedMessages.add(userMessageId);
    
    // Create new task (simplified version, future can implement complex routing logic)
    const taskId = await createNewTask(callId, bus, message, llmConfig);
    
    // Record mapping
    if (!userMessageToTasks.has(userMessageId)) {
      userMessageToTasks.set(userMessageId, new Set());
    }
    userMessageToTasks.get(userMessageId)!.add(taskId);
    
    // Send routed event
    const routedEvent: UserMessageRoutedEvent = {
      type: 'user_message_routed',
      userMessageId,
      taskId,
      timestamp: Date.now(),
    };
    config.onMessage(routedEvent);
    
    return [taskId];
  };

  return {
    registerAbilities: (systemBus: SystemBus): void => {
      bus = systemBus;
      registerShellAbilities(bus, config.onMessage);
    },

    post: async (request: PostRequest): Promise<PostResponse> => {
      if (!bus) {
        throw new Error('Shell not initialized: registerAbilities must be called first');
      }

      validatePostRequest(request);

      const callId = generateCallId();
      const routedTasks = await routeUserMessage(callId, request);

      return {
        status: 'ok',
        routedTasks,
      };
    },
  };
};

