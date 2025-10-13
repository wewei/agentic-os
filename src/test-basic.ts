// Basic functionality test for Agent OS

import { createAgentOS } from './index';

import type { InvokeResult } from './types';

const unwrapInvokeResult = (result: InvokeResult<string, string>): string => {
  if (result.type === 'success') {
    return result.result;
  }
  const errorMsg = result.type === 'error' ? result.error : result.message;
  throw new Error(`Invoke failed (${result.type}): ${errorMsg}`);
};

const createTestAgentOS = async () => {
  console.log('1. Creating Agent OS...');
  const agentOS = await createAgentOS({
    port: 3001,
    models: {
      providers: {
        'openai-test': {
          endpoint: 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY || '',
          adapterType: 'openai',
          models: [
            { type: 'llm', name: 'gpt-4-turbo-preview' },
            { type: 'embed', name: 'text-embedding-3-small' },
          ],
        },
      },
    },
  });
  console.log('✓ Agent OS created\n');
  return agentOS;
};

const testBusAbilities = async (bus: { invoke: (abilityId: string, callId: string, callerId: string, input: string) => Promise<InvokeResult<string, string>> }) => {
  console.log('2. Testing Bus abilities...');
  const modules = unwrapInvokeResult(await bus.invoke('bus:list', 'test-call-1', 'test', '{}'));
  const modulesData = JSON.parse(modules) as { modules: Array<{ name: string }> };
  console.log('✓ Modules:', modulesData.modules.map((m) => m.name).join(', '));
};

const testModelManager = async (bus: { invoke: (abilityId: string, callId: string, callerId: string, input: string) => Promise<InvokeResult<string, string>> }) => {
  console.log('\n3. Testing Model Manager...');
  const models = unwrapInvokeResult(await bus.invoke('model:listLLM', 'test-call-2', 'test', '{}'));
  const modelsData = JSON.parse(models) as {
    providers: Array<{ providerName: string; models: string[] }>;
  };
  console.log(
    '✓ LLM Providers:',
    modelsData.providers.map((p) => `${p.providerName}: ${p.models.join(', ')}`).join(' | ')
  );
};

const testTaskManager = async (bus: { invoke: (abilityId: string, callId: string, callerId: string, input: string) => Promise<InvokeResult<string, string>> }) => {
  console.log('\n4. Testing Task Manager...');
  const spawnResult = unwrapInvokeResult(await bus.invoke(
    'task:spawn',
    'test-call-3',
    'test',
    JSON.stringify({ goal: 'Test task - say hello' })
  ));
  const spawnData = JSON.parse(spawnResult);
  console.log('✓ Task created:', spawnData.taskId);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const activeTasks = unwrapInvokeResult(await bus.invoke('task:active', 'test-call-4', 'test', '{}'));
  const activeData = JSON.parse(activeTasks);
  console.log('✓ Active tasks:', activeData.tasks.length);
};

const testBasicFunctionality = async () => {
  console.log('🧪 Testing Agent OS Basic Functionality\n');
  
  const agentOS = await createTestAgentOS();
  await testBusAbilities(agentOS.bus);
  await testModelManager(agentOS.bus);
  await testTaskManager(agentOS.bus);

  console.log('\n✅ Basic functionality tests passed!\n');
  console.log('Note: Server not started in test mode');
  console.log('To run the full system, use example.ts');

  process.exit(0);
};

// Run test
testBasicFunctionality().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

