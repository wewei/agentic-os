// System Bus Implementation

import { registerBusControllerAbilities } from './controller';
import { registerAbility, unregisterAbility, hasAbility, getAbility } from './registry';

import type { BusState } from './types';
import type { ShellEvent, AbilityRequestEvent, AbilityResponseEvent } from '../shell/types';
import type { SystemBus, BusDelegate, CallLogEntry, InvokeResult } from '../types';

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
  delegate: BusDelegate | undefined,
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

  // Send ability request event
  if (delegate) {
    const requestEvent: AbilityRequestEvent = {
      type: 'ability_request',
      taskId: callerId,
      callId,
      abilityId,
      input,
      timestamp: Date.now(),
    };
    delegate.sendShellEvent(requestEvent);
  }

  // Validation happens inside the handler (createInternalHandler)
  // which can return invalid-input, success, or error
  try {
    const handlerResult = await ability.handler(callId, callerId, input);
    
    // Send ability response event
    if (delegate) {
      const responseEvent: AbilityResponseEvent = {
        type: 'ability_response',
        taskId: callerId,
        callId,
        abilityId,
        result: handlerResult,
        timestamp: Date.now(),
      };
      delegate.sendShellEvent(responseEvent);
    }
    
    return logInvokeResult(state, logEntry, startTime, handlerResult);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return logInvokeFailure(state, logEntry, startTime, 'unknown-failure', 
      `Handler rejected unexpectedly: ${errorMessage}`);
  }
};

const createBusImplementation = (
  state: BusState,
  delegate: BusDelegate
): SystemBus => {
  const bus: SystemBus = {
    invoke: async (abilityId: string, callId: string, callerId: string, input: string) => {
      const startTime = Date.now();
      const logEntry: CallLogEntry = {
        callerId,
        abilityId,
        timestamp: startTime,
      };
      return executeInvoke(state, delegate, abilityId, callId, callerId, input, startTime, logEntry);
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

    setDelegate: (newDelegate: BusDelegate): void => {
      delegate = newDelegate;
    },

    sendShellEvent: (event: ShellEvent): void => {
      if (!delegate) {
        throw new Error('Bus delegate not set');
      }
      delegate.sendShellEvent(event);
    },

    logError: (taskId: string, message: string): void => {
      if (!delegate) {
        console.error(`[${taskId}] ${message}`);
        return;
      }
      delegate.logError(taskId, message);
    },

    logInfo: (taskId: string, message: string): void => {
      if (!delegate) {
        console.info(`[${taskId}] ${message}`);
        return;
      }
      delegate.logInfo(taskId, message);
    },
  };

  return bus;
};

export const createSystemBus = (delegate: BusDelegate): SystemBus => {
  const state: BusState = {
    abilities: new Map(),
    callLog: [],
  };

  const bus = createBusImplementation(state, delegate);
  registerBusControllerAbilities(state, bus);

  return bus;
};

export type { SystemBus } from '../types';

