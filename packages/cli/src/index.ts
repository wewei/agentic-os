// Export main components
export { App } from './components/App.tsx';
export { MessageBox } from './components/MessageBox.tsx';
export { InputBox } from './components/InputBox.tsx';
export { Screen } from './components/Screen.tsx';

// Export configuration utilities
export {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  getConfigDir,
  getConfigPath,
  ensureConfigDir,
  getModuleConfig,
  updateModuleConfig,
} from './config.ts';

// Export types
export type {
  AppConfig,
  AppState,
  Message,
  LayoutConfig,
  EventHandlers,
  AppProps,
  MessageBoxProps,
  InputBoxProps,
  ScreenProps,
} from './types.ts';