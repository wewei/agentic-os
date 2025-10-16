import React, { useEffect, useRef } from 'react';

import type { Message } from '@/lib/messageService';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type MessageListProps = {
  messages: Message[];
  className?: string;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const getMessageVariant = (type: Message['type']): string => {
  switch (type) {
    case 'user':
      return 'bg-primary text-primary-foreground ml-auto max-w-[80%]';
    case 'agent':
      return 'bg-muted text-muted-foreground mr-auto max-w-[80%]';
    default:
      return 'bg-muted text-muted-foreground mr-auto max-w-[80%]';
  }
};

const MessageItem: React.FC<{ message: Message }> = ({ message }) => (
  <div
    className={cn(
      "flex",
      message.type === 'user' ? 'justify-end' : 'justify-start'
    )}
  >
    <Card className={cn("w-fit", getMessageVariant(message.type))}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="text-xs opacity-70">
            {formatTimestamp(message.sentAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="text-center text-muted-foreground py-8">
    <div className="text-2xl mb-2">🤖</div>
    <div>Start a conversation with the AI agent</div>
    <div className="text-sm mt-1">Type your message below and press Enter</div>
  </div>
);

const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea ref={scrollAreaRef} className={cn("flex-1", className)}>
      <div className="space-y-4 p-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
