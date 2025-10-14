import type { AppConfig, AppState, Message, UIComponents } from './types.ts';
import { loadConfig } from './config.ts';
import {
  destroyUI,
  initUI,
  render,
  setupEventHandlers,
  updateMessages,
} from './ui.ts';

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
  const [cmd, ...args] = command.slice(1).split(' ');

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
 * Run the CLI application
 */
export const runApp = async (configPath?: string): Promise<void> => {
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

