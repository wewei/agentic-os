import type { Widgets } from 'blessed';

/**
 * Configuration for the entire application, organized by module
 */
export type AppConfig = {
  [module: string]: Record<string, unknown>;
};

/**
 * Message to display in the message stream
 */
export type Message = {
  timestamp: Date;
  content: string;
  type: 'user' | 'system' | 'agent' | 'error';
};

/**
 * TUI Application state
 */
export type AppState = {
  messages: Message[];
  inputBuffer: string;
  config: AppConfig;
};

/**
 * Blessed UI components
 */
export type UIComponents = {
  screen: Widgets.Screen;
  messageBox: Widgets.BoxElement;
  inputBox: Widgets.TextboxElement;
};

/**
 * Event handlers for the TUI
 */
export type EventHandlers = {
  onSubmit: (input: string) => void;
  onExit: () => void;
};

