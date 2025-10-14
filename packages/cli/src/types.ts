import type { ReactNode } from 'react';

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
 * Layout configuration for responsive design
 */
export type LayoutConfig = {
  messageBoxRatio: number;
  minMessageBoxHeight: number;
  minInputBoxHeight: number;
  minScreenWidth: number;
  minScreenHeight: number;
};

/**
 * Event handlers for the TUI
 */
export type EventHandlers = {
  onSubmit: (input: string) => void;
  onExit: () => void;
};

/**
 * Props for the main App component
 */
export type AppProps = {
  config: AppConfig;
  layoutConfig?: Partial<LayoutConfig>;
  screen?: any;
};

/**
 * Props for the MessageBox component
 */
export type MessageBoxProps = {
  messages: Message[];
  height: number;
  width: number;
};

/**
 * Props for the InputBox component
 */
export type InputBoxProps = {
  onSubmit: (input: string) => void;
  onExit: () => void;
  height: number;
  width: number;
};

/**
 * Props for the Screen component
 */
export type ScreenProps = {
  children: ReactNode;
  onResize?: (width: number, height: number) => void;
};
