import React, { useEffect, useRef } from 'react';

import type { AssembledMessage } from '@/lib/messageService';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type MessageListProps = {
  messages: AssembledMessage[];
  className?: string;
};

// eslint-disable-next-line max-lines-per-function
const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageVariant = (type: AssembledMessage['type']): string => {
    switch (type) {
      case 'user':
        return 'bg-primary text-primary-foreground ml-auto max-w-[80%]';
      case 'agent':
        return 'bg-muted text-muted-foreground mr-auto max-w-[80%]';
      case 'system':
        return 'bg-secondary text-secondary-foreground mx-auto max-w-[60%] text-center';
      case 'error':
        return 'bg-destructive text-destructive-foreground mx-auto max-w-[80%]';
      default:
        return 'bg-muted text-muted-foreground mr-auto max-w-[80%]';
    }
  };

  const renderToolCalls = (message: AssembledMessage): React.ReactNode => {
    if (!message.toolCalls || message.toolCalls.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-2">
        {message.toolCalls.map((toolCall, index) => (
          <div key={index} className="bg-background/50 rounded-md p-2 text-xs">
            <div className="font-medium text-blue-600">
              🔧 {toolCall.tool}
            </div>
            {toolCall.args !== undefined && (
              <div className="mt-1 text-muted-foreground">
                <strong>Args:</strong>
                <pre className="inline">{JSON.stringify(toolCall.args, null, 2)}</pre>
              </div>
            )}
            {toolCall.result !== undefined && (
              <div className="mt-1 text-green-600">
                <strong>Result:</strong>
                <pre className="inline">{JSON.stringify(toolCall.result, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMessageContent = (message: AssembledMessage): React.ReactNode => {
    // Handle streaming messages (with fragments)
    if (message.fragments && message.fragments.some(f => !f.isComplete)) {
      return (
        <div>
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="ml-2">Streaming...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap">{message.content}</div>
    );
  };

  return (
    <ScrollArea ref={scrollAreaRef} className={cn("flex-1", className)}>
      <div className="space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-2xl mb-2">🤖</div>
            <div>Start a conversation with the AI agent</div>
            <div className="text-sm mt-1">Type your message below and press Enter</div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.type === 'user' ? 'justify-end' : 
                message.type === 'system' ? 'justify-center' : 'justify-start'
              )}
            >
              <Card className={cn("w-fit", getMessageVariant(message.type))}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {renderMessageContent(message)}
                    {renderToolCalls(message)}
                    <div className="text-xs opacity-70">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
