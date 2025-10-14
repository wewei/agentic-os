// Shell Module - Message Handler

import { v4 as uuidv4 } from 'uuid';

import { registerShellAbilities } from './abilities';

import type { AgentBus, AgentModule, InvokeResult } from '../types';
import type { ShellConfig, PostRequest, PostResponse } from './types';

type ShellModule = AgentModule & {
  post: (request: PostRequest) => Promise<PostResponse>;
};

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
    throw new Error('Invalid message: must be non-empty string');
  }
  if (request.taskId !== undefined && typeof request.taskId !== 'string') {
    throw new Error('Invalid taskId: must be string');
  }
};

const sendToExistingTask = async (
  callId: string,
  bus: AgentBus,
  taskId: string,
  message: string
): Promise<{ success: boolean; taskId: string; error?: string }> => {
  const result = unwrapInvokeResult(await bus.invoke(
    'task:send',
    callId,
    'shell',
    JSON.stringify({
      receiverId: taskId,
      message,
    })
  ));
  const parsed = JSON.parse(result);

  if (!parsed.success) {
    return { success: false, taskId, error: parsed.error };
  }

  return { success: true, taskId };
};

const createNewTask = async (
  callId: string,
  bus: AgentBus,
  message: string
): Promise<string> => {
  const result = unwrapInvokeResult(await bus.invoke(
    'task:spawn',
    callId,
    'shell',
    JSON.stringify({
      goal: message,
    })
  ));
  const parsed = JSON.parse(result);
  return parsed.taskId;
};

export const shell = (config: ShellConfig): ShellModule => {
  let bus: AgentBus | undefined;

  return {
    registerAbilities: (agentBus: AgentBus): void => {
      bus = agentBus;
      registerShellAbilities(bus, config.onMessage);
    },

    post: async (request: PostRequest): Promise<PostResponse> => {
      if (!bus) {
        throw new Error('Shell not initialized: registerAbilities must be called first');
      }

      validatePostRequest(request);

      const { message, taskId } = request;
      const callId = generateCallId();

      let targetTaskId: string;

      if (taskId) {
        const result = await sendToExistingTask(callId, bus, taskId, message);
        if (!result.success) {
          throw new Error(result.error || 'Failed to send message to task');
        }
        targetTaskId = result.taskId;
      } else {
        targetTaskId = await createNewTask(callId, bus, message);
      }

      return {
        taskId: targetTaskId,
        status: 'running',
      };
    },
  };
};

