import { Send, Loader2 } from 'lucide-react';
import React, { useState, useRef } from 'react';

import type { KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type MessageInputProps = {
  value: string;
  onChange: (text: string) => void;
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

// eslint-disable-next-line max-lines-per-function
const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSendMessage,
  disabled = false,
  placeholder = "Type your message here...",
  className,
}) => {
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async (): Promise<void> => {
    const trimmedMessage = value.trim();
    if (!trimmedMessage || isSending || disabled) {
      return;
    }

    setIsSending(true);
    try {
      await onSendMessage(trimmedMessage);
      onChange('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const canSend = value.trim().length > 0 && !isSending && !disabled;

  return (
    <div className={cn("flex gap-2 p-4 border-t bg-background", className)}>
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="min-h-[40px] max-h-[120px] resize-none pr-12"
          rows={1}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {isSending ? 'Sending...' : 'Enter to send, Shift+Enter for new line'}
        </div>
      </div>
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className="h-10 w-10 shrink-0"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default MessageInput;
