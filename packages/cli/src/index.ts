// Export main app functions
export {
  runPipeMode,
  createAgenticOSInstance,
  processMessage,
  outputMessage,
  outputError,
} from './app.ts';

// Export configuration utilities
export { loadConfig, getDefaultConfig, getConfigDir, getConfigPath } from './config.ts';

// Export types
export type { CLIConfig, MessageRequest, MessageResponse } from './types.ts';
