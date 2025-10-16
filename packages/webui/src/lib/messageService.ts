// Message service for WebUI frontend

export type PostMessageRequest = {
  message: string;
  taskId?: string;
};

export type PostMessageResponse = {
  taskId: string;
  status: string;
};

export type ShellMessage = {
  type: 'start' | 'content' | 'tool_call' | 'tool_result' | 'message_complete' | 'end' | 'error' | 'connection' | 'user';
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

export type MessageFragment = {
  messageId: string;
  content: string;
  type: ShellMessage['type'];
  isComplete: boolean;
  timestamp: Date;
};

export type AssembledMessage = {
  id: string;
  taskId: string;
  content: string;
  type: 'user' | 'agent' | 'system' | 'error';
  timestamp: Date;
  fragments?: MessageFragment[];
  toolCalls?: Array<{
    tool: string;
    args: unknown;
    result?: unknown;
  }>;
};

// Get API URL from environment variable
const getApiUrl = (): string => {
  return import.meta.env.VITE_AGENTIC_API_URL || 'http://localhost:3000/api';
};

// Send message to backend
export const sendMessage = async (message: string, taskId?: string): Promise<PostMessageResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, taskId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json() as Promise<PostMessageResponse>;
};

// Connect to SSE stream for a task
export const connectMessageStream = (taskId?: string): EventSource => {
  const apiUrl = getApiUrl();
  const sseUrl = taskId ? `${apiUrl}/sse/${taskId}` : `${apiUrl}/sse`;
  return new EventSource(sseUrl);
};

// Message assembly helper functions
const processConnectionMessage = (
  shellMessage: ShellMessage
): AssembledMessage => {
  return {
    id: `connection-${shellMessage.taskId}`,
    taskId: shellMessage.taskId,
    content: shellMessage.content || 'Connected to message stream',
    type: 'system',
    timestamp: new Date(),
  };
};

const processUserMessage = (
  shellMessage: ShellMessage
): AssembledMessage => {
  return {
    id: `user-${Date.now()}`,
    taskId: shellMessage.taskId,
    content: shellMessage.content || '',
    type: 'user',
    timestamp: new Date(),
  };
};

const processErrorMessage = (
  shellMessage: ShellMessage
): AssembledMessage => {
  return {
    id: `error-${Date.now()}`,
    taskId: shellMessage.taskId,
    content: shellMessage.error || 'An error occurred',
    type: 'error',
    timestamp: new Date(),
  };
};

const processStartEndMessage = (
  shellMessage: ShellMessage
): AssembledMessage => {
  return {
    id: `${shellMessage.type}-${shellMessage.taskId}-${Date.now()}`,
    taskId: shellMessage.taskId,
    content: shellMessage.type === 'start' ? 'Starting...' : 'Completed',
    type: 'system',
    timestamp: new Date(),
  };
};

// Message assembly logic
export class MessageAssembler {
  private fragments = new Map<string, MessageFragment[]>();
  private assembledMessages = new Map<string, AssembledMessage>();

  private processToolMessage = (
    shellMessage: ShellMessage
  ): AssembledMessage | null => {
    const messageId = shellMessage.messageId || `tool-${Date.now()}`;
    let message = this.assembledMessages.get(messageId);
    
    if (!message) {
      message = {
        id: messageId,
        taskId: shellMessage.taskId,
        content: '',
        type: 'agent',
        timestamp: new Date(),
        toolCalls: [],
      };
      this.assembledMessages.set(messageId, message);
    }

    if (shellMessage.type === 'tool_call' && shellMessage.tool) {
      message.toolCalls = message.toolCalls || [];
      message.toolCalls.push({
        tool: shellMessage.tool,
        args: shellMessage.args,
      });
    } else if (shellMessage.type === 'tool_result' && shellMessage.result) {
      const lastToolCall = message.toolCalls?.[message.toolCalls.length - 1];
      if (lastToolCall) {
        lastToolCall.result = shellMessage.result;
      }
    }

    return message;
  };

  private processContentMessage = (
    shellMessage: ShellMessage
  ): AssembledMessage | null => {
    const { messageId, taskId, content } = shellMessage;
    
    if (!messageId || !content) {
      return null;
    }

    const fragments = this.fragments.get(messageId) || [];
    
    const fragment: MessageFragment = {
      messageId,
      content,
      type: shellMessage.type,
      isComplete: false,
      timestamp: new Date(),
    };
    
    fragments.push(fragment);
    this.fragments.set(messageId, fragments);

    if (shellMessage.type === 'message_complete') {
      fragments.forEach(f => f.isComplete = true);
      
      const assembledMessage: AssembledMessage = {
        id: messageId,
        taskId,
        content: fragments.map(f => f.content).join(''),
        type: 'agent',
        timestamp: new Date(),
        fragments,
      };

      this.assembledMessages.set(messageId, assembledMessage);
      return assembledMessage;
    }

    return {
      id: messageId,
      taskId,
      content: fragments.map(f => f.content).join(''),
      type: 'agent',
      timestamp: new Date(),
      fragments,
    };
  };

  processMessage = (shellMessage: ShellMessage): AssembledMessage | null => {
    const { type } = shellMessage;

    if (type === 'connection') {
      return processConnectionMessage(shellMessage);
    }

    if (type === 'user') {
      return processUserMessage(shellMessage);
    }

    if (type === 'error') {
      return processErrorMessage(shellMessage);
    }

    if (type === 'tool_call' || type === 'tool_result') {
      return this.processToolMessage(shellMessage);
    }

    if (type === 'content') {
      return this.processContentMessage(shellMessage);
    }

    if (type === 'start' || type === 'end') {
      return processStartEndMessage(shellMessage);
    }

    return null;
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
    
    this.fragments.forEach((fragments, messageId) => {
      if (fragments.some(f => f.messageId === messageId)) {
        this.fragments.delete(messageId);
      }
    });
  };
}
