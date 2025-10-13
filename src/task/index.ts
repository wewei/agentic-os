// Task Manager
import { registerTaskAbilities } from './abilities';
import { createExecuteTask } from './runloop';

import type { AgentModule } from '../types';
import type { TaskRegistry } from './types';

export const taskManager = (): AgentModule => {
  const registry: TaskRegistry = new Map();

  return {
    registerAbilities: (bus): void => {
      // Create execute task function
      const executeTask = createExecuteTask(registry, bus);

      // Register task abilities
      registerTaskAbilities(registry, bus, executeTask);
    },
  };
};

export type { TaskRegistry, TaskState } from './types';

