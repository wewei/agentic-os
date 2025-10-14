import { loadConfig } from './config.ts';
import type { AppConfig, AppState, Message, UIComponents } from './types.ts';
import {
  destroyUI,
  initUI,
  render,
  setupEventHandlers,
  updateMessages,
} from './ui.ts';

/**
 * Check if running in pipe mode (stdin is not a TTY or forced)
 */
export const isPipeMode = (forcePipeMode = false): boolean => {
  return forcePipeMode || !process.stdin.isTTY;
};

/**
 * Read messages from stdin in pipe mode
 * Messages are separated by two consecutive empty lines
 */
export const readPipeMessages = async (): Promise<AsyncGenerator<string, void, unknown>> => {
  async function* messageGenerator() {
    let buffer = '';
    
    for await (const chunk of process.stdin) {
      buffer += chunk.toString();
      
      // Split by double newlines to find complete messages
      const parts = buffer.split('\n\n');
      
      // Keep the last part in buffer (might be incomplete)
      buffer = parts.pop() || '';
      
      // Process complete messages
      for (const part of parts) {
        const message = part.trim();
        if (message) {
          yield message;
        }
      }
    }
    
    // Handle any remaining content in buffer
    if (buffer.trim()) {
      yield buffer.trim();
    }
  }
  
  return messageGenerator();
};

/**
 * Output message to stdout in pipe mode
 */
export const outputMessage = (message: string): void => {
  process.stdout.write(message + '\n');
};

/**
 * Output error to stderr in pipe mode
 */
export const outputError = (error: string): void => {
  process.stderr.write(error + '\n');
};

/**
 * Create initial application state
 */
export const createInitialState = (config: AppConfig): AppState => ({
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
export const addMessage = (
  state: AppState,
  message: Message
): AppState => {
  const messageLimit =
    (state.config.cli as { messageLimit?: number })?.messageLimit || 1000;

  const newMessages = [...state.messages, message];

  // Limit the number of messages
  if (newMessages.length > messageLimit) {
    newMessages.splice(0, newMessages.length - messageLimit);
  }

  return {
    ...state,
    messages: newMessages,
  };
};

/**
 * Handle user input
 */
export const handleUserInput = (
  state: AppState,
  input: string
): AppState => {
  let newState = addMessage(state, {
    timestamp: new Date(),
    content: input,
    type: 'user',
  });

  // Process commands
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
};

/**
 * Handle special commands
 */
export const handleCommand = (
  state: AppState,
  command: string
): AppState => {
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
 * Run the CLI application in pipe mode
 */
export const runPipeMode = async (configPath?: string): Promise<void> => {
  try {
    // Load configuration
    const config = loadConfig(configPath);
    
    // Initialize state
    let state = createInitialState(config);
    
    // Read messages from stdin
    const messageReader = await readPipeMessages();
    
    for await (const input of messageReader) {
      try {
        // Process the input message
        state = handleUserInput(state, input);
        
        // Output the latest response to stdout (except user messages)
        const latestMessage = state.messages[state.messages.length - 1];
        if (latestMessage && latestMessage.type !== 'user') {
          if (latestMessage.type === 'error') {
            outputError(latestMessage.content);
          } else {
            outputMessage(latestMessage.content);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputError(`Error processing message: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError(`Fatal error in pipe mode: ${errorMessage}`);
    process.exit(1);
  }
};

/**
 * Run the CLI application
 */
export const runApp = async (configPath?: string, forcePipeMode = false): Promise<void> => {
  // Check if running in pipe mode
  if (isPipeMode(forcePipeMode)) {
    return runPipeMode(configPath);
  }

  // Load configuration
  const config = loadConfig(configPath);

  // Initialize state
  let state = createInitialState(config);

  // Initialize UI
  const components: UIComponents = initUI();
  const { screen, messageBox } = components;

  // Update initial messages
  updateMessages(messageBox, state.messages);
  render(screen);

  // Setup event handlers
  setupEventHandlers(components, {
    onSubmit: (input: string) => {
      state = handleUserInput(state, input);
      updateMessages(messageBox, state.messages);
      render(screen);
    },
    onExit: () => {
      destroyUI(screen);
      process.exit(0);
    },
  });

  // Keep the process alive
  return new Promise(() => {
    // The promise never resolves, keeping the app running
  });
};

