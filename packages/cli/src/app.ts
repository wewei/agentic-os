import {
  createAgenticOS,
  modelManager,
  taskManager,
  ledger,
  type AgenticOS,
  type ShellEvent,
} from '@agentic-os/core';

import { loadConfig } from './config.ts';

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
  
  // Event handler for shell output
  const sendShellEvent = (event: ShellEvent): void => {
    // Output content events to stdout
    if (event.type === 'content' && event.content) {
      outputMessage(event.content);
    }
  };

  // Create AgenticOS with all modules
  const agenticOS = createAgenticOS({
    sendShellEvent,
    logError: (taskId, message) => {
      outputError(`[${taskId}] ${message}`);
    },
    logInfo: (taskId, message) => {
      outputError(`[${taskId}] ${message}`);
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
  message: string,
  llmConfig: { provider: string; model: string }
): Promise<void> => {
  try {
    const request = {
      userMessageId: `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      llmConfig,
    };

    const response = await agenticOS.post(request);
    
    // Output task info
    if (response.routedTasks.length > 0) {
      outputError(`[Routed to tasks: ${response.routedTasks.join(', ')}]`);
    }
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
    const config = loadConfig(configPath);
    outputError('✓ Agentic OS ready');
    
    // Get default LLM config from model config
    const defaultProvider = Object.keys(config.model.providers)[0];
    if (!defaultProvider) {
      outputError('No model providers configured');
      process.exit(1);
    }
    const providerConfig = config.model.providers[defaultProvider];
    if (!providerConfig || providerConfig.models.length === 0) {
      outputError('No models configured for provider');
      process.exit(1);
    }
    const firstModel = providerConfig.models[0];
    if (!firstModel) {
      outputError('No models configured for provider');
      process.exit(1);
    }
    const defaultModel = firstModel.name;
    const llmConfig = { provider: defaultProvider, model: defaultModel };
    
    // Read messages from stdin
    const messageReader = await readPipeMessages();
    
    for await (const input of messageReader) {
      await processMessage(agenticOS, input, llmConfig);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputError(`Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};
