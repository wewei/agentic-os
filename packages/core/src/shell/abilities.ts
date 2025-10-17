// Shell Abilities

import { z } from 'zod';

import type { SystemBus, AbilityMeta } from '../types';
import type { ShellEvent, ContentEvent } from './types';

// Schema definitions
const SHELL_SEND_INPUT_SCHEMA = z.object({
  content: z.string().describe('Message content chunk'),
  messageId: z.string().describe('Unique message identifier for assembling multiple chunks'),
  index: z.number().describe('Chunk index. >= 0 means more chunks coming, < 0 means message end'),
});

const SHELL_SEND_OUTPUT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the message was successfully sent'),
  error: z.string().optional().describe('Error message if failed'),
});

// Meta definitions
const SHELL_SEND_META: AbilityMeta<
  z.infer<typeof SHELL_SEND_INPUT_SCHEMA>,
  z.infer<typeof SHELL_SEND_OUTPUT_SCHEMA>
> = {
  moduleName: 'shell',
  abilityName: 'send',
  description: 'Send message chunk to user via callback',
  inputSchema: SHELL_SEND_INPUT_SCHEMA,
  outputSchema: SHELL_SEND_OUTPUT_SCHEMA,
};

type ShellSendInput = z.infer<typeof SHELL_SEND_INPUT_SCHEMA>;

const handleShellSend = async (
  taskId: string,
  input: ShellSendInput,
  onMessage: (event: ShellEvent) => void
) => {
  try {
    const contentEvent: ContentEvent = {
      type: 'content',
      taskId,
      messageId: input.messageId,
      index: input.index,
      content: input.content,
      timestamp: Date.now(),
    };
    
    onMessage(contentEvent);

    return {
      type: 'success' as const,
      result: { success: true }
    };
  } catch (error) {
    return {
      type: 'success' as const,
      result: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
};

export const registerShellAbilities = (
  bus: SystemBus,
  onMessage: (event: ShellEvent) => void
): void => {
  bus.register('shell:send', SHELL_SEND_META, async (_callId, taskId, input) => {
    return handleShellSend(taskId, input, onMessage);
  });
};

