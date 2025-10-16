// Shell Module - Message Handler

import { v4 as uuidv4 } from 'uuid';

import { registerShellAbilities } from './abilities';

import type { SystemBus, Module, InvokeResult } from '../types';
import type { ShellConfig, PostRequest, PostResponse } from './types';
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
  if (typeof request.message !== 'string' || request.message.trim() === '') {
    throw new ValidationError('Invalid message: must be non-empty string');
  }
  if (request.taskId !== undefined && typeof request.taskId !== 'string') {
    throw new ValidationError('Invalid taskId: must be string');
  }
  
  // For new tasks (no taskId), llmConfig is required
  if (!request.taskId) {
    if (!request.llmConfig) {
      throw new ValidationError('llmConfig is required for new tasks');
    }
    if (typeof request.llmConfig.provider !== 'string' || request.llmConfig.provider.trim() === '') {
      throw new ValidationError('Invalid provider: must be non-empty string for new tasks');
    }
    if (typeof request.llmConfig.model !== 'string' || request.llmConfig.model.trim() === '') {
      throw new ValidationError('Invalid model: must be non-empty string for new tasks');
    }
  }
  
  // For existing tasks, if llmConfig is provided, validate it
  if (request.llmConfig) {
    if (request.llmConfig.provider !== undefined && (typeof request.llmConfig.provider !== 'string' || request.llmConfig.provider.trim() === '')) {
      throw new ValidationError('Invalid provider: must be non-empty string');
    }
    if (request.llmConfig.model !== undefined && (typeof request.llmConfig.model !== 'string' || request.llmConfig.model.trim() === '')) {
      throw new ValidationError('Invalid model: must be non-empty string');
    }
    if (request.llmConfig.topP !== undefined && (typeof request.llmConfig.topP !== 'number' || request.llmConfig.topP < 0 || request.llmConfig.topP > 1)) {
      throw new ValidationError('Invalid topP: must be number between 0 and 1');
    }
    if (request.llmConfig.temperature !== undefined && (typeof request.llmConfig.temperature !== 'number' || request.llmConfig.temperature < 0 || request.llmConfig.temperature > 2)) {
      throw new ValidationError('Invalid temperature: must be number between 0 and 2');
    }
  }
};

const sendToExistingTask = async (
  callId: string,
  bus: SystemBus,
  taskId: string,
  message: string,
  llmConfig?: LLMConfig
): Promise<{ success: boolean; taskId: string; error?: string }> => {
  type TaskSendPayload = {
    receiverId: string;
    message: string;
    provider?: string;
    model?: string;
    topP?: number;
    temperature?: number;
  };

  const payload: TaskSendPayload = {
    receiverId: taskId,
    message,
  };

  // Only include LLM config if provided
  if (llmConfig) {
    payload.provider = llmConfig.provider;
    payload.model = llmConfig.model;
    payload.topP = llmConfig.topP;
    payload.temperature = llmConfig.temperature;
  }

  const result = unwrapInvokeResult(await bus.invoke(
    'task:send',
    callId,
    'shell',
    JSON.stringify(payload)
  ));
  const parsed = JSON.parse(result);

  if (!parsed.success) {
    return { success: false, taskId, error: parsed.error };
  }

  return { success: true, taskId };
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

      const { message, taskId, llmConfig } = request;
      const callId = generateCallId();

      let targetTaskId: string;

      if (taskId) {
        // For existing tasks, LLM config is optional
        const result = await sendToExistingTask(callId, bus, taskId, message, llmConfig);
        if (!result.success) {
          throw new Error(result.error || 'Failed to send message to task');
        }
        targetTaskId = result.taskId;
      } else {
        // For new tasks, LLM config is required (validated above)
        if (!llmConfig) {
          throw new ValidationError('llmConfig is required for new tasks');
        }
        targetTaskId = await createNewTask(callId, bus, message, llmConfig);
      }

      return {
        taskId: targetTaskId,
        status: 'running',
      };
    },
  };
};

