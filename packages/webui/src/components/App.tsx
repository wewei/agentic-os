import React, { useState, useEffect, useCallback, useRef } from 'react';

import MessageInput from './MessageInput';
import MessageList from './MessageList';
import ModelSelector from './ModelSelector';

import type { 
  UIState, 
  Message, 
  Task, 
  LLMConfig, 
  TaskModelConfig, 
  ShellMessage 
} from '@/lib/messageService';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { sendMessage, connectGlobalStream } from '@/lib/messageService';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

const createInitialState = (): UIState => ({
  messages: [],
  inputText: '',
  llmConfig: {
    provider: '',
    model: '',
  },
  tasks: [],
});

const handleTaskUpdate = (
  shellMessage: ShellMessage,
  tasks: Task[]
): Task[] => {
  const taskIndex = tasks.findIndex(t => t.id === shellMessage.taskId);
  const updatedTask: Task = {
    id: shellMessage.taskId,
    name: shellMessage.taskName || `Task ${shellMessage.taskId.slice(0, 8)}`,
    isComplete: shellMessage.isComplete || false,
    createdAt: shellMessage.createdAt || Date.now(),
    updatedAt: shellMessage.updatedAt || Date.now(),
  };

  if (taskIndex >= 0) {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    return updatedTasks;
  }
  return [...tasks, updatedTask];
};

const handleContentMessage = (
  shellMessage: ShellMessage,
  messages: Message[]
): Message[] => {
  const messageId = shellMessage.messageId || `msg-${Date.now()}`;
  const existingIndex = messages.findIndex(m => m.id === messageId);

  if (existingIndex >= 0) {
    const updatedMessages = [...messages];
    updatedMessages[existingIndex] = {
      ...updatedMessages[existingIndex],
      content: updatedMessages[existingIndex].content + (shellMessage.content || ''),
      sentAt: Date.now(),
    };
    return updatedMessages;
  }

  const newMessage: Message = {
    id: messageId,
    taskId: shellMessage.taskId,
    type: 'agent',
    content: shellMessage.content || '',
    sentAt: Date.now(),
  };
  return [...messages, newMessage];
};

const processShellMessage = (
  shellMessage: ShellMessage, 
  state: UIState
): Partial<UIState> => {
  const updates: Partial<UIState> = {};

  if (shellMessage.type === 'connection') {
    console.log('SSE connection confirmed:', shellMessage.content);
    return updates;
  }

  if (shellMessage.type === 'task_update' || shellMessage.type === 'start') {
    updates.tasks = handleTaskUpdate(shellMessage, state.tasks);
  }

  if (shellMessage.type === 'content' && shellMessage.content) {
    updates.messages = handleContentMessage(shellMessage, state.messages);
  }

  if (shellMessage.type === 'user' && shellMessage.content) {
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      taskId: shellMessage.taskId,
      type: 'user',
      content: shellMessage.content,
      sentAt: Date.now(),
    };
    updates.messages = [...state.messages, newMessage];
  }

  return updates;
};

// eslint-disable-next-line max-lines-per-function
const App: React.FC = () => {
  const [state, setState] = useState<UIState>(createInitialState());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<UIState>): void => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clean up SSE connection
  const cleanupConnection = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('idle');
  }, []);

  // Connect to global SSE stream
  const connectToGlobalStream = useCallback((): void => {
    cleanupConnection();
    
    setConnectionStatus('connecting');
    setError(null);

    try {
      const eventSource = connectGlobalStream();
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to global message stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const shellMessage = JSON.parse(event.data) as ShellMessage;
          console.log('Received SSE message:', shellMessage.type, shellMessage);
          
          setState(prevState => {
            const updates = processShellMessage(shellMessage, prevState);
            console.log('SSE updates:', updates);
            console.log('Previous state messages:', prevState.messages.length);
            const newState = { ...prevState, ...updates };
            console.log('New state messages:', newState.messages.length);
            return newState;
          });
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        console.error('EventSource readyState:', eventSource.readyState);
        console.error('EventSource url:', eventSource.url);
        
        // Only set error state if connection was actually established
        // ReadyState 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (eventSource.readyState === 2) {
          setConnectionStatus('error');
          setError('Connection to message stream failed. Please check if the server is running.');
          cleanupConnection();
        }
      };

    } catch (error) {
      console.error('Failed to connect to stream:', error);
      setConnectionStatus('error');
      setError('Failed to connect to message stream');
    }
  }, [cleanupConnection]);

  // Connect on mount
  useEffect(() => {
    connectToGlobalStream();
    return () => {
      cleanupConnection();
    };
  }, [connectToGlobalStream, cleanupConnection]);

  // Send message to backend
  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    try {
      setError(null);
      
      const userMessageId = `user-${Date.now()}`;
      console.log('Adding user message:', userMessageId, message);
      
      // Add user message to state immediately
      setState(prev => {
        console.log('Previous messages count:', prev.messages.length);
        const newState = {
          ...prev,
          messages: [...prev.messages, {
            id: userMessageId,
            taskId: currentTaskId || 'pending',
            type: 'user' as const,
            content: message,
            sentAt: Date.now(),
          }],
          inputText: '',
        };
        console.log('New messages count:', newState.messages.length);
        return newState;
      });

      // Prepare relatedTaskIds array
      const relatedTaskIds = currentTaskId ? [currentTaskId] : [];

      // Send to backend with llmConfig and relatedTaskIds
      const response = await sendMessage(message, state.llmConfig, relatedTaskIds);
      console.log('Backend response:', response);
      
      // Update task ID if this is a new conversation
      if (!currentTaskId && response.routedTasks && response.routedTasks.length > 0) {
        const taskId = response.routedTasks[0];
        setCurrentTaskId(taskId);
        
        // Update the user message with the correct task ID
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m => 
            m.id === userMessageId ? { ...m, taskId } : m
          ),
        }));
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [currentTaskId, state.llmConfig]);

  // Handle model selection
  const handleModelSelect = useCallback((model: TaskModelConfig): void => {
    updateState({
      llmConfig: {
        provider: model.provider,
        model: model.model,
      },
    });
  }, [updateState]);

  // Handle input text change
  const handleInputChange = useCallback((text: string): void => {
    updateState({ inputText: text });
  }, [updateState]);

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🤖 Agentic OS WebUI</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={cn("flex items-center gap-1", getStatusColor(connectionStatus))}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                )} />
                <span>{getStatusText(connectionStatus)}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
          <div className="text-sm text-destructive">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={state.messages} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background">
        {/* Model Selector - always visible */}
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Model:
            </label>
            <ModelSelector
              onModelSelect={handleModelSelect}
              disabled={connectionStatus === 'connecting'}
              className="flex-1"
            />
          </div>
        </div>
        
        {/* Message Input */}
        <MessageInput
          value={state.inputText}
          onChange={handleInputChange}
          onSendMessage={handleSendMessage}
          disabled={connectionStatus === 'connecting'}
          placeholder={
            connectionStatus === 'connecting' 
              ? 'Connecting to agent...' 
              : 'Type your message here...'
          }
          className="border-0"
        />
      </div>
    </div>
  );
};

export default App;
