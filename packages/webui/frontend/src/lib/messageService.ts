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

// Send message to backend
export const sendMessage = async (message: string, taskId?: string): Promise<PostMessageResponse> => {
  const response = await fetch('/api/message', {
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
export const connectMessageStream = (taskId: string): EventSource => {
  return new EventSource(`/api/stream/${taskId}`);
};

// Message assembly logic
export class MessageAssembler {
  private fragments = new Map<string, MessageFragment[]>();
  private assembledMessages = new Map<string, AssembledMessage>();

  processMessage = (shellMessage: ShellMessage): AssembledMessage | null => {
    const { messageId, taskId, type, content } = shellMessage;

    // Handle connection messages
    if (type === 'connection') {
      return {
        id: `connection-${taskId}`,
        taskId,
        content: content || 'Connected to message stream',
        type: 'system',
        timestamp: new Date(),
      };
    }

    // Handle user messages (these come from the UI, not the stream)
    if (type === 'user') {
      return {
        id: `user-${Date.now()}`,
        taskId,
        content: content || '',
        type: 'user',
        timestamp: new Date(),
      };
    }

    // Handle error messages
    if (type === 'error') {
      return {
        id: `error-${Date.now()}`,
        taskId,
        content: shellMessage.error || 'An error occurred',
        type: 'error',
        timestamp: new Date(),
      };
    }

    // Handle tool calls and results
    if (type === 'tool_call' || type === 'tool_result') {
      const messageId = shellMessage.messageId || `tool-${Date.now()}`;
      let message = this.assembledMessages.get(messageId);
      
      if (!message) {
        message = {
          id: messageId,
          taskId,
          content: '',
          type: 'agent',
          timestamp: new Date(),
          toolCalls: [],
        };
        this.assembledMessages.set(messageId, message);
      }

      if (type === 'tool_call' && shellMessage.tool) {
        message.toolCalls = message.toolCalls || [];
        message.toolCalls.push({
          tool: shellMessage.tool,
          args: shellMessage.args,
        });
      } else if (type === 'tool_result' && shellMessage.result) {
        const lastToolCall = message.toolCalls?.[message.toolCalls.length - 1];
        if (lastToolCall) {
          lastToolCall.result = shellMessage.result;
        }
      }

      return message;
    }

    // Handle content messages
    if (type === 'content' && messageId && content) {
      const fragments = this.fragments.get(messageId) || [];
      
      const fragment: MessageFragment = {
        messageId,
        content,
        type,
        isComplete: false,
        timestamp: new Date(),
      };
      
      fragments.push(fragment);
      this.fragments.set(messageId, fragments);

      // Check if message is complete
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

      // Return partial message for streaming
      return {
        id: messageId,
        taskId,
        content: fragments.map(f => f.content).join(''),
        type: 'agent',
        timestamp: new Date(),
        fragments,
      };
    }

    // Handle start and end messages
    if (type === 'start' || type === 'end') {
      return {
        id: `${type}-${taskId}-${Date.now()}`,
        taskId,
        content: type === 'start' ? 'Starting...' : 'Completed',
        type: 'system',
        timestamp: new Date(),
      };
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
