import React, { useState, useCallback, useMemo, useEffect } from 'react';

import { MessageBox } from './MessageBox.tsx';
import { InputBox } from './InputBox.tsx';
import type { AppProps, AppState, Message, LayoutConfig } from '../types.ts';

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  messageBoxRatio: 0.8,
  minMessageBoxHeight: 6,
  minInputBoxHeight: 3,
  minScreenWidth: 20,
  minScreenHeight: 10,
};

/**
 * Create initial application state
 */
const createInitialState = (config: any): AppState => ({
  messages: [
    {
      timestamp: new Date(),
      content: 'Welcome to Agentic OS CLI',
      type: 'system',
    },
    {
      timestamp: new Date(),
      content: 'Type your message and press Enter to interact with agents',
      type: 'system',
    },
  ],
  inputBuffer: '',
  config,
});

/**
 * Add a message to the state
 */
const addMessage = (state: AppState, message: Message): AppState => {
  const messageLimit = (state.config.cli?.messageLimit as number) || 1000;
  const newMessages = [...state.messages, message];

  if (newMessages.length > messageLimit) {
    newMessages.splice(0, newMessages.length - messageLimit);
  }

  return {
    ...state,
    messages: newMessages,
  };
};

/**
 * Handle special commands
 */
const handleCommand = (state: AppState, command: string): AppState => {
  const [cmd] = command.slice(1).split(' ');

  switch (cmd) {
    case 'help':
      return addMessage(state, {
        timestamp: new Date(),
        content: getHelpText(),
        type: 'system',
      });

    case 'clear':
      return {
        ...state,
        messages: [],
      };

    case 'config':
      return addMessage(state, {
        timestamp: new Date(),
        content: JSON.stringify(state.config, null, 2),
        type: 'system',
      });

    default:
      return addMessage(state, {
        timestamp: new Date(),
        content: `Unknown command: ${cmd}. Type /help for available commands.`,
        type: 'error',
      });
  }
};

/**
 * Get help text
 */
const getHelpText = (): string => {
  return [
    'Available commands:',
    '  /help   - Show this help message',
    '  /clear  - Clear message history',
    '  /config - Show current configuration',
    '  Ctrl+C or Esc - Exit application',
  ].join('\n');
};

/**
 * Main App component
 */
export const App: React.FC<AppProps> = ({ config, layoutConfig, screen }) => {
  const [state, setState] = useState<AppState>(() => createInitialState(config));
  const [screenSize, setScreenSize] = useState({ width: 80, height: 24 });

  const finalLayoutConfig = useMemo((): LayoutConfig => ({
    ...DEFAULT_LAYOUT_CONFIG,
    ...layoutConfig,
  }), [layoutConfig]);

  const handleResize = useCallback((width: number, height: number) => {
    setScreenSize({ width, height });
  }, []);

  // Set up resize handler
  useEffect(() => {
    if (screen) {
      const resizeHandler = () => {
        setScreenSize({ width: screen.width, height: screen.height });
      };
      
      screen.on('resize', resizeHandler);
      resizeHandler(); // Initial size
      
      return () => {
        screen.removeListener('resize', resizeHandler);
      };
    }
  }, [screen]);

  const handleSubmit = useCallback((input: string) => {
    setState(prevState => {
      let newState = addMessage(prevState, {
        timestamp: new Date(),
        content: input,
        type: 'user',
      });

      if (input.startsWith('/')) {
        newState = handleCommand(newState, input);
      } else {
        // Echo back for now (will be replaced with actual agent interaction)
        newState = addMessage(newState, {
          timestamp: new Date(),
          content: `Echo: ${input}`,
          type: 'agent',
        });
      }

      return newState;
    });
  }, []);

  const handleExit = useCallback(() => {
    process.exit(0);
  }, []);

  const messageBoxHeight = Math.max(
    finalLayoutConfig.minMessageBoxHeight,
    Math.floor(screenSize.height * finalLayoutConfig.messageBoxRatio)
  );
  const inputBoxHeight = Math.max(
    finalLayoutConfig.minInputBoxHeight,
    screenSize.height - messageBoxHeight
  );

  return (
    <>
      <MessageBox
        key="messageBox"
        messages={state.messages}
        height={messageBoxHeight}
        width={screenSize.width}
      />
      <InputBox
        key="inputBox"
        onSubmit={handleSubmit}
        onExit={handleExit}
        height={inputBoxHeight}
        width={screenSize.width}
      />
    </>
  );
};
