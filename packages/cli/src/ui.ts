import blessed from 'blessed';

import type { EventHandlers, Message, UIComponents } from './types.ts';

/**
 * Create the blessed screen
 */
export const createScreen = (): blessed.Widgets.Screen => {
  return blessed.screen({
    smartCSR: true,
    title: 'Agentic OS',
  });
};

/**
 * Create the message display box (upper window)
 */
export const createMessageBox = (
  screen: blessed.Widgets.Screen
): blessed.Widgets.BoxElement => {
  return blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '80%',
    content: 'Welcome to Agentic OS\nType your message below and press Enter.',
    tags: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan',
      },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        bg: 'cyan',
      },
    },
    mouse: true,
    keys: true,
    vi: true,
  });
};

/**
 * Create the input box (lower window)
 */
export const createInputBox = (
  screen: blessed.Widgets.Screen
): blessed.Widgets.TextboxElement => {
  return blessed.textbox({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '20%',
    inputOnFocus: true,
    border: {
      type: 'line',
    },
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'green',
      },
      focus: {
        border: {
          fg: 'yellow',
        },
      },
    },
    keys: true,
    mouse: true,
  });
};

/**
 * Initialize the TUI components
 */
export const initUI = (): UIComponents => {
  const screen = createScreen();
  const messageBox = createMessageBox(screen);
  const inputBox = createInputBox(screen);

  // Focus on input box by default
  inputBox.focus();

  return { screen, messageBox, inputBox };
};

/**
 * Format a message for display
 */
export const formatMessage = (message: Message): string => {
  const timestamp = message.timestamp.toLocaleTimeString();
  const typeColor = getTypeColor(message.type);
  const typeLabel = message.type.toUpperCase().padEnd(6);

  return `{${typeColor}-fg}[${timestamp}] ${typeLabel}{/} ${message.content}`;
};

/**
 * Get color for message type
 */
const getTypeColor = (
  type: Message['type']
): string => {
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
 * Update message display
 */
export const updateMessages = (
  messageBox: blessed.Widgets.BoxElement,
  messages: Message[]
): void => {
  const formattedMessages = messages.map(formatMessage).join('\n');
  messageBox.setContent(formattedMessages);
  messageBox.setScrollPerc(100);
};

/**
 * Clear input box
 */
export const clearInput = (
  inputBox: blessed.Widgets.TextboxElement
): void => {
  inputBox.clearValue();
  inputBox.focus();
};

/**
 * Setup event handlers for the UI
 */
export const setupEventHandlers = (
  components: UIComponents,
  handlers: EventHandlers
): void => {
  const { screen, inputBox } = components;

  // Handle input submission
  inputBox.on('submit', (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      handlers.onSubmit(trimmedValue);
    }
    clearInput(inputBox);
  });

  // Handle Ctrl+C and Escape to exit
  screen.key(['C-c', 'escape'], () => {
    handlers.onExit();
  });

  // Handle screen resize
  screen.on('resize', () => {
    screen.render();
  });
};

/**
 * Render the screen
 */
export const render = (screen: blessed.Widgets.Screen): void => {
  screen.render();
};

/**
 * Destroy the screen and clean up
 */
export const destroyUI = (screen: blessed.Widgets.Screen): void => {
  screen.destroy();
};

