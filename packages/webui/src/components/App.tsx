import React, { useState, useEffect, useCallback, useRef } from 'react';

import MessageInput from './MessageInput';
import MessageList from './MessageList';
import ModelSelector from './ModelSelector';

import type { 
  UIState, 
  Message, 
  Task, 
  TaskModelConfig,
  SSEEvent,
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
  event: SSEEvent,
  tasks: Task[]
): Task[] => {
  if (event.type !== 'task_started' && event.type !== 'task_completed') {
    return tasks;
  }
  
  const taskIndex = tasks.findIndex(t => t.id === event.taskId);
  const updatedTask: Task = {
    id: event.taskId,
    name: event.type === 'task_started' ? event.taskName : `Task ${event.taskId.slice(0, 8)}`,
    isComplete: event.type === 'task_completed',
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  if (taskIndex >= 0) {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;
    return updatedTasks;
  }
  return [...tasks, updatedTask];
};

const handleContentMessage = (
  event: SSEEvent,
  messages: Message[]
): Message[] => {
  if (event.type !== 'content') {
    return messages;
  }
  
  const messageId = event.messageId;
  const existingIndex = messages.findIndex(m => m.id === messageId);

  if (existingIndex >= 0) {
    const updatedMessages = [...messages];
    updatedMessages[existingIndex] = {
      ...updatedMessages[existingIndex],
      content: updatedMessages[existingIndex].content + event.content,
      sentAt: event.timestamp,
    };
    return updatedMessages;
  }

  const newMessage: Message = {
    id: messageId,
    taskId: event.taskId,
    type: 'agent',
    content: event.content,
    sentAt: event.timestamp,
  };
  return [...messages, newMessage];
};

const processSSEEvent = (
  event: SSEEvent, 
  state: UIState
): Partial<UIState> => {
  const updates: Partial<UIState> = {};

  switch (event.type) {
    case 'task_started':
    case 'task_completed':
      updates.tasks = handleTaskUpdate(event, state.tasks);
      break;
    
    case 'content':
      updates.messages = handleContentMessage(event, state.messages);
      break;
    
    case 'error':
      // Display error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        taskId: event.taskId || 'unknown',
        type: 'agent',
        content: `Error: ${event.errorMessage}`,
        sentAt: event.timestamp,
      };
      updates.messages = [...state.messages, errorMessage];
      break;
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
          const sseEvent = JSON.parse(event.data) as SSEEvent;
          console.log('Received SSE event:', sseEvent.type, sseEvent);
          
          setState(prevState => {
            const updates = processSSEEvent(sseEvent, prevState);
            if (Object.keys(updates).length > 0) {
              console.log('SSE updates:', updates);
              return { ...prevState, ...updates };
            }
            return prevState;
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
