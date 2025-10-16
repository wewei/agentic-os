// Unified logging system for Light Service

import { appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogContext = {
  verbose: boolean;
  logFilePath: string;
};

let logContext: LogContext | null = null;

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const formatLogMessage = (level: LogLevel, ...args: unknown[]): string => {
  const timestamp = formatTimestamp();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const writeToFile = (message: string): void => {
  if (!logContext) return;
  
  try {
    appendFileSync(logContext.logFilePath, message + '\n', 'utf-8');
  } catch (error) {
    // Fallback to console if file write fails
    console.error('Failed to write to log file:', error);
  }
};

const writeToStdout = (level: LogLevel, message: string): void => {
  if (!logContext || !logContext.verbose) return;
  
  switch (level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    default:
      console.log(message);
  }
};

export const initLogger = (verbose: boolean = false): void => {
  const epoch = Date.now();
  const logDir = join(homedir(), '.agentic-os');
  const logFilePath = join(logDir, `light-service-${epoch}.log`);
  
  logContext = {
    verbose,
    logFilePath,
  };
  
  // Initial log message
  log('info', `Logger initialized. Verbose: ${verbose}, Log file: ${logFilePath}`);
};

export const log = (level: LogLevel, ...args: unknown[]): void => {
  const formattedMessage = formatLogMessage(level, ...args);
  
  // Always write to file
  writeToFile(formattedMessage);
  
  // Write to stdout only if verbose is enabled
  writeToStdout(level, formattedMessage);
};

// Convenience functions
export const logInfo = (...args: unknown[]): void => {
  log('info', ...args);
};

export const logWarn = (...args: unknown[]): void => {
  log('warn', ...args);
};

export const logError = (...args: unknown[]): void => {
  log('error', ...args);
};

export const logDebug = (...args: unknown[]): void => {
  log('debug', ...args);
};

export const getLogFilePath = (): string | null => {
  return logContext?.logFilePath ?? null;
};

