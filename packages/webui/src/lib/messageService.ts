// Message service for WebUI frontend

// Re-export event types from Core
// Re-import for local use
import type {
  ShellEvent as SSEEvent,
  PostRequest,
  PostResponse,
  LLMConfig,
  TaskModelConfig,
  InvokeResult,
} from '@agentic-os/core';

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
  LLMConfig,
  TaskModelConfig,
} from '@agentic-os/core';

export type Message = {
  id: string;
  taskId: string;
  type: 'user' | 'agent';
  content: string;
  sentAt: number;
};

export type Task = {
  id: string;
  name: string;
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
};

export type UIState = {
  messages: Message[];
  inputText: string;
  llmConfig: LLMConfig;
  tasks: Task[];
};

export type MessageFragment = {
  messageId: string;
  content: string;
  index: number;
  timestamp: Date;
};

export type AssembledMessage = {
  id: string;
  taskId: string;
  content: string;
  type: 'user' | 'agent' | 'system' | 'error';
  timestamp: Date;
  isComplete: boolean;
  fragments?: MessageFragment[];
  abilityCalls?: Array<{
    callId: string;
    abilityId: string;
    input: string;
    result?: InvokeResult<string, string>;
  }>;
};

// Get API URL from environment variable
const getApiUrl = (): string => {
  return import.meta.env.VITE_AGENTIC_API_URL || 'http://localhost:3000/api';
};

// Fetch available models from backend
export const fetchAvailableModels = async (): Promise<TaskModelConfig[]> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = await response.json() as { models: TaskModelConfig[] };
  return data.models;
};

// Generate unique user message ID
const generateUserMessageId = (): string => {
  return `user-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Send message to backend
export const sendMessage = async (
  message: string,
  llmConfig: LLMConfig,
  relatedTaskIds?: string[]
): Promise<PostResponse> => {
  const apiUrl = getApiUrl();
  const userMessageId = generateUserMessageId();
  
  const requestBody: PostRequest = {
    userMessageId,
    message,
    llmConfig,
    relatedTaskIds,
  };
  
  const response = await fetch(`${apiUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json() as Promise<PostResponse>;
};

// Connect to global SSE stream
export const connectGlobalStream = (): EventSource => {
  const apiUrl = getApiUrl();
  return new EventSource(`${apiUrl}/sse`);
};

// Connect to SSE stream for a task
export const connectMessageStream = (taskId?: string): EventSource => {
  const apiUrl = getApiUrl();
  const sseUrl = taskId ? `${apiUrl}/sse/${taskId}` : `${apiUrl}/sse`;
  return new EventSource(sseUrl);
};

// Message assembly logic - handles new SSEEvent types
export class MessageAssembler {
  private contentFragments = new Map<string, MessageFragment[]>();
  private assembledMessages = new Map<string, AssembledMessage>();
  private abilityCalls = new Map<string, Map<string, {
    callId: string;
    abilityId: string;
    input: string;
    result?: InvokeResult<string, string>;
  }>>();

  private processTaskStarted = (event: import('@agentic-os/core').TaskStartedEvent): AssembledMessage => {
    const message: AssembledMessage = {
      id: `task-started-${event.taskId}`,
      taskId: event.taskId,
      content: `Task started: ${event.taskName}`,
      type: 'system',
      timestamp: new Date(event.timestamp),
      isComplete: true,
    };
    return message;
  };

  private processUserMessageRouted = (event: import('@agentic-os/core').UserMessageRoutedEvent): AssembledMessage => {
    const message: AssembledMessage = {
      id: `routed-${event.userMessageId}-${event.taskId}`,
      taskId: event.taskId,
      content: `Message routed to task`,
      type: 'system',
      timestamp: new Date(event.timestamp),
      isComplete: true,
    };
    return message;
  };

  private processContent = (event: import('@agentic-os/core').ContentEvent): AssembledMessage | null => {
    const { taskId, messageId, index, content, timestamp } = event;
    
    // If index is -1, message is complete
    if (index === -1) {
      const fragments = this.contentFragments.get(messageId) || [];
      const fullContent = fragments.map(f => f.content).join('');
      
      const assembledMessage: AssembledMessage = {
        id: messageId,
        taskId,
        content: fullContent,
        type: 'agent',
        timestamp: new Date(timestamp),
        isComplete: true,
        fragments,
      };

      // Check if there are ability calls for this message
      const calls = this.abilityCalls.get(messageId);
      if (calls && calls.size > 0) {
        assembledMessage.abilityCalls = Array.from(calls.values());
      }

      this.assembledMessages.set(messageId, assembledMessage);
      this.contentFragments.delete(messageId);
      this.abilityCalls.delete(messageId);
      
      return assembledMessage;
    }

    // Accumulate content fragment
    const fragments = this.contentFragments.get(messageId) || [];
    const fragment: MessageFragment = {
      messageId,
      content,
      index,
      timestamp: new Date(timestamp),
    };
    fragments.push(fragment);
    this.contentFragments.set(messageId, fragments);

    // Return partial message for streaming display
    return {
      id: messageId,
      taskId,
      content: fragments.map(f => f.content).join(''),
      type: 'agent',
      timestamp: new Date(timestamp),
      isComplete: false,
      fragments,
    };
  };

  private processAbilityRequest = (event: import('@agentic-os/core').AbilityRequestEvent): void => {
    const { taskId, callId, abilityId, input } = event;
    
    // We don't have messageId from the event, so we'll need to track by taskId
    // In a real implementation, you might want to correlate this with the current message
    const messageId = `${taskId}-current`;
    
    if (!this.abilityCalls.has(messageId)) {
      this.abilityCalls.set(messageId, new Map());
    }
    
    this.abilityCalls.get(messageId)!.set(callId, {
      callId,
      abilityId,
      input,
    });
  };

  private processAbilityResponse = (event: import('@agentic-os/core').AbilityResponseEvent): void => {
    const { taskId, callId, result } = event;
    const messageId = `${taskId}-current`;
    
    const calls = this.abilityCalls.get(messageId);
    if (calls) {
      const call = calls.get(callId);
      if (call) {
        call.result = result;
      }
    }
  };

  private processTaskCompleted = (event: import('@agentic-os/core').TaskCompletedEvent): AssembledMessage => {
    const message: AssembledMessage = {
      id: `task-completed-${event.taskId}`,
      taskId: event.taskId,
      content: 'Task completed',
      type: 'system',
      timestamp: new Date(event.timestamp),
      isComplete: true,
    };
    return message;
  };

  private processError = (event: import('@agentic-os/core').ErrorEvent): AssembledMessage => {
    const message: AssembledMessage = {
      id: `error-${event.taskId || 'unknown'}-${event.timestamp}`,
      taskId: event.taskId || 'unknown',
      content: `Error [${event.errorCode}]: ${event.errorMessage}`,
      type: 'error',
      timestamp: new Date(event.timestamp),
      isComplete: true,
    };
    return message;
  };

  processEvent = (event: SSEEvent): AssembledMessage | null => {
    switch (event.type) {
      case 'task_started':
        return this.processTaskStarted(event);
      
      case 'user_message_routed':
        return this.processUserMessageRouted(event);
      
      case 'content':
        return this.processContent(event);
      
      case 'ability_request':
        this.processAbilityRequest(event);
        return null;
      
      case 'ability_response':
        this.processAbilityResponse(event);
        return null;
      
      case 'task_completed':
        return this.processTaskCompleted(event);
      
      case 'error':
        return this.processError(event);
      
      default:
        return null;
    }
  };

  // Get all assembled messages for a task
  getMessagesForTask = (taskId: string): AssembledMessage[] => {
    return Array.from(this.assembledMessages.values())
      .filter(msg => msg.taskId === taskId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Clear messages for a task
  clearTask = (taskId: string): void => {
    this.assembledMessages.forEach((message, id) => {
      if (message.taskId === taskId) {
        this.assembledMessages.delete(id);
      }
    });
    
    this.contentFragments.forEach((fragments, messageId) => {
      if (fragments.length > 0 && messageId.startsWith(taskId)) {
        this.contentFragments.delete(messageId);
      }
    });
    
    this.abilityCalls.forEach((_calls, messageId) => {
      if (messageId.startsWith(taskId)) {
        this.abilityCalls.delete(messageId);
      }
    });
  };
}
