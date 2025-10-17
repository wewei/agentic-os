// Shell Module - Direct Service (Not a Bus Module)

import { v4 as uuidv4 } from 'uuid';

import type { SystemBus, InvokeResult } from '../types';
import type { 
  Shell, 
  PostRequest, 
  PostResponse, 
  UserMessageRoutedEvent 
} from './types';
import type { LLMConfig } from '../task/runloop';

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
  if (typeof request.userMessageId !== 'string' || request.userMessageId.trim() === '') {
    throw new ValidationError('Invalid userMessageId: must be non-empty string');
  }
  
  if (typeof request.message !== 'string' || request.message.trim() === '') {
    throw new ValidationError('Invalid message: must be non-empty string');
  }
  
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


const createMessageRouter = (
  bus: SystemBus,
  processedMessages: Set<string>,
  userMessageToTasks: Map<string, Set<string>>
) => {
  return async (callId: string, request: PostRequest): Promise<string[]> => {
    const { userMessageId, message, llmConfig } = request;
    
    if (processedMessages.has(userMessageId)) {
      const existingTasks = userMessageToTasks.get(userMessageId);
      return existingTasks ? Array.from(existingTasks) : [];
    }
    
    processedMessages.add(userMessageId);
    const taskId = await createNewTask(callId, bus, message, llmConfig);
    
    if (!userMessageToTasks.has(userMessageId)) {
      userMessageToTasks.set(userMessageId, new Set());
    }
    userMessageToTasks.get(userMessageId)!.add(taskId);
    
    const routedEvent: UserMessageRoutedEvent = {
      type: 'user_message_routed',
      userMessageId,
      taskId,
      timestamp: Date.now(),
    };
    bus.sendShellEvent(routedEvent);
    
    return [taskId];
  };
};

export const createShell = (bus: SystemBus): Shell => {
  const processedMessages = new Set<string>();
  const userMessageToTasks = new Map<string, Set<string>>();

  const routeUserMessage = createMessageRouter(
    bus,
    processedMessages,
    userMessageToTasks
  );

  return {
    post: async (request: PostRequest): Promise<PostResponse> => {
      validatePostRequest(request);
      const callId = generateCallId();
      const routedTasks = await routeUserMessage(callId, request);
      return { status: 'ok', routedTasks };
    },
  };
};
