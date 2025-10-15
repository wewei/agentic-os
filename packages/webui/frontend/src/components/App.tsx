import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { sendMessage, connectMessageStream, MessageAssembler, type AssembledMessage } from '@/lib/messageService';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

const App: React.FC = () => {
  const [messages, setMessages] = useState<AssembledMessage[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const messageAssembler = useRef(new MessageAssembler());
  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up SSE connection
  const cleanupConnection = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('idle');
  }, []);

  // Connect to SSE stream for a task
  const connectToStream = useCallback((taskId: string): void => {
    cleanupConnection();
    
    setConnectionStatus('connecting');
    setError(null);

    try {
      const eventSource = connectMessageStream(taskId);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to message stream for task:', taskId);
      };

      eventSource.onmessage = (event) => {
        try {
          const shellMessage = JSON.parse(event.data);
          const assembledMessage = messageAssembler.current.processMessage(shellMessage);
          
          if (assembledMessage) {
            setMessages(prev => {
              // Update existing message or add new one
              const existingIndex = prev.findIndex(msg => msg.id === assembledMessage.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = assembledMessage;
                return updated;
              } else {
                return [...prev, assembledMessage];
              }
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('error');
        setError('Connection to message stream failed');
        cleanupConnection();
      };

    } catch (error) {
      console.error('Failed to connect to stream:', error);
      setConnectionStatus('error');
      setError('Failed to connect to message stream');
    }
  }, [cleanupConnection]);

  // Send message to backend
  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    try {
      setError(null);
      
      // Add user message to UI immediately
      const userMessage: AssembledMessage = {
        id: `user-${Date.now()}`,
        taskId: currentTaskId || 'new',
        content: message,
        type: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send to backend
      const response = await sendMessage(message, currentTaskId || undefined);
      
      // Update task ID if this is a new conversation
      if (!currentTaskId) {
        setCurrentTaskId(response.taskId);
        connectToStream(response.taskId);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      // Add error message to UI
      const errorMessage: AssembledMessage = {
        id: `error-${Date.now()}`,
        taskId: currentTaskId || 'error',
        content: 'Failed to send message. Please try again.',
        type: 'error',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [currentTaskId, connectToStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, [cleanupConnection]);

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
              {currentTaskId && (
                <div className="text-muted-foreground">
                  Task: {currentTaskId.slice(0, 8)}...
                </div>
              )}
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
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={connectionStatus === 'connecting'}
        placeholder={
          connectionStatus === 'connecting' 
            ? 'Connecting to agent...' 
            : 'Type your message here...'
        }
      />
    </div>
  );
};

export default App;
