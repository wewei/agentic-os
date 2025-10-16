import {
  createAgenticOS,
  modelManager,
  taskManager,
  ledger,
  type AgenticOS,
  type ShellMessage,
} from '@agentic-os/core';

import { loadConfig } from './config.ts';
import type { MessageRequest } from './types.ts';

/**
 * Read messages from stdin in pipe mode
 * Messages are separated by newlines
 */
export const readPipeMessages = async (): Promise<AsyncGenerator<string, void, unknown>> => {
  async function* messageGenerator() {
    let buffer = '';
    
    for await (const chunk of process.stdin) {
      buffer += chunk.toString();
      
      // Split by newlines to find complete messages
      const parts = buffer.split('\n');
      
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
 * Output message to stdout
 */
export const outputMessage = (message: string): void => {
  process.stdout.write(message + '\n');
};

/**
 * Output error to stderr
 */
export const outputError = (error: string): void => {
  process.stderr.write(error + '\n');
};

/**
 * Create AgenticOS instance with all modules
 */
export const createAgenticOSInstance = (configPath?: string): AgenticOS => {
  const config = loadConfig(configPath);
  
  // Message handler for shell output
  const onMessage = (message: ShellMessage): void => {
    // Output shell messages to stdout
    if (message.type === 'content' && message.content) {
      outputMessage(message.content);
    }
  };

  // Create AgenticOS with all modules
  const agenticOS = createAgenticOS({
    shell: {
      onMessage,
    },
  })
    .with(modelManager(config.model))
    .with(taskManager())
    .with(ledger());

  return agenticOS;
};

/**
 * Process a single message
 */
export const processMessage = async (
  agenticOS: AgenticOS,
  message: string
): Promise<void> => {
  try {
    const request: MessageRequest = {
      message,
    };

    const response = await agenticOS.post(request);
    
    // Output task info
    outputMessage(`[Task ${response.taskId}] Status: ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError(`Error processing message: ${errorMessage}`);
  }
};

/**
 * Run the CLI application in pipe mode
 */
export const runPipeMode = async (configPath?: string): Promise<void> => {
  try {
    // Create AgenticOS instance
    outputError('Initializing Agentic OS...');
    const agenticOS = createAgenticOSInstance(configPath);
    outputError('✓ Agentic OS ready');
    
    // Read messages from stdin
    const messageReader = await readPipeMessages();
    
    for await (const input of messageReader) {
      await processMessage(agenticOS, input);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};
