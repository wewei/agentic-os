// System Bus Implementation

import { registerBusControllerAbilities } from './controller';
import { registerAbility, unregisterAbility, hasAbility, getAbility } from './registry';

import type { BusState } from './types';
import type { SystemBus, CallLogEntry, InvokeResult } from '../types';

const logInvokeFailure = (
  state: BusState,
  logEntry: CallLogEntry,
  startTime: number,
  errorType: 'invalid-ability' | 'invalid-input' | 'unknown-failure',
  errorMessage: string
) => {
  logEntry.duration = Date.now() - startTime;
  logEntry.success = false;
  logEntry.error = errorMessage;
  state.callLog.push(logEntry);
  
  return { type: errorType, message: errorMessage };
};

const logInvokeResult = (
  state: BusState,
  logEntry: CallLogEntry,
  startTime: number,
  result: InvokeResult<string, string>
) => {
  logEntry.duration = Date.now() - startTime;
  logEntry.success = result.type === 'success';
  if (result.type === 'error') {
    logEntry.error = result.error;
  } else if ('message' in result) {
    logEntry.error = result.message;
  }
  state.callLog.push(logEntry);
  
  return result;
};

const executeInvoke = async (
  state: BusState,
  bus: SystemBus,
  abilityId: string,
  callId: string,
  callerId: string,
  input: string,
  startTime: number,
  logEntry: CallLogEntry
) => {
  const ability = getAbility(state, abilityId);
  if (!ability) {
    return logInvokeFailure(state, logEntry, startTime, 'invalid-ability', 
      `Ability not found: ${abilityId}`);
  }

  // Log ability invocation start
  bus.logInfo(callerId, `Ability invoked: ${abilityId} [callId=${callId}]`);

  // Validation happens inside the handler (createInternalHandler)
  // which can return invalid-input, success, or error
  try {
    const handlerResult = await ability.handler(callId, callerId, input);
    
    // Log ability result
    if (handlerResult.type === 'success') {
      const duration = Date.now() - startTime;
      bus.logInfo(callerId, `Ability completed: ${abilityId} [callId=${callId}, duration=${duration}ms]`);
    } else {
      const duration = Date.now() - startTime;
      const errorMsg = handlerResult.type === 'error' ? handlerResult.error : handlerResult.message;
      bus.logError(callerId, `Ability failed: ${abilityId} [callId=${callId}, duration=${duration}ms, error=${errorMsg}]`);
    }
    
    return logInvokeResult(state, logEntry, startTime, handlerResult);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;
    bus.logError(callerId, `Ability exception: ${abilityId} [callId=${callId}, duration=${duration}ms, error=${errorMessage}]`);
    return logInvokeFailure(state, logEntry, startTime, 'unknown-failure', 
      `Handler rejected unexpectedly: ${errorMessage}`);
  }
};

export type BusLogCallbacks = {
  logError: (taskId: string, message: string) => void;
  logInfo: (taskId: string, message: string) => void;
};

const defaultLogCallbacks: BusLogCallbacks = {
  logError: (taskId: string, message: string) => {
    console.error('[Bus Error]', `[${taskId}]`, message);
  },
  logInfo: (taskId: string, message: string) => {
    console.info('[Bus Info]', `[${taskId}]`, message);
  },
};

export const createSystemBus = (logCallbacks?: BusLogCallbacks): SystemBus => {
  const callbacks = logCallbacks || defaultLogCallbacks;
  
  const state: BusState = {
    abilities: new Map(),
    callLog: [],
  };

  const bus: SystemBus = {
    invoke: async (abilityId: string, callId: string, callerId: string, input: string) => {
      const startTime = Date.now();
      const logEntry: CallLogEntry = {
        callerId,
        abilityId,
        timestamp: startTime,
      };
      
      return executeInvoke(state, bus, abilityId, callId, callerId, input, startTime, logEntry);
    },

    register: (abilityId, meta, handler) => {
      registerAbility(state, abilityId, meta, handler);
    },

    unregister: (abilityId: string): void => {
      unregisterAbility(state, abilityId);
    },

    has: (abilityId: string): boolean => {
      return hasAbility(state, abilityId);
    },

    logError: (taskId: string, message: string): void => {
      callbacks.logError(taskId, message);
    },

    logInfo: (taskId: string, message: string): void => {
      callbacks.logInfo(taskId, message);
    },
  };

  // Register bus controller abilities
  registerBusControllerAbilities(state, bus);

  return bus;
};

export type { SystemBus } from '../types';

