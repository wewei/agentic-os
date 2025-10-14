import React from 'react';

import type { MessageBoxProps, Message } from '../types.ts';

/**
 * Format a message for display
 */
const formatMessage = (message: Message): string => {
  const timestamp = message.timestamp.toLocaleTimeString();
  const typeColor = getTypeColor(message.type);
  const typeLabel = message.type.toUpperCase().padEnd(6);

  return `{${typeColor}-fg}[${timestamp}] ${typeLabel}{/} ${message.content}`;
};

/**
 * Get color for message type
 */
const getTypeColor = (type: Message['type']): string => {
  switch (type) {
    case 'user':
      return 'green';
    case 'agent':
      return 'cyan';
    case 'system':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'white';
  }
};

/**
 * MessageBox component for displaying message history
 */
export const MessageBox: React.FC<MessageBoxProps> = ({
  messages,
  height,
  width,
}) => {
  const content = messages.length > 0 
    ? messages.map(formatMessage).join('\n')
    : 'Welcome to Agentic OS\nType your message below and press Enter.';

  return (
    // @ts-expect-error - react-blessed types not properly recognized
    <box
      top={0}
      left={0}
      width={width}
      height={height}
      content={content}
      tags={true}
      fullUnicode={true}
      border={{
        type: 'line',
      }}
      style={{
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'cyan',
        },
      }}
      autoPadding={true}
      scrollable={true}
      alwaysScroll={true}
      scrollbar={{
        ch: ' ',
        style: {
          bg: 'cyan',
        },
      }}
      mouse={true}
      keys={true}
      vi={true}
      shrink={true}
    />
  );
};
