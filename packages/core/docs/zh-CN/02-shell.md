# Agentic OS - Shell 模块

## 概述

**Shell** 是 Agentic OS 的用户接口层，提供 HTTP API 和 SSE（Server-Sent Events）流式通信。Shell 充当 **Bus Delegate**，接收 Bus 发出的事件并通过 SSE 推送给客户端。

## 设计原则

1. **独立服务**：Shell 不是 Bus Module，而是独立的服务层
2. **Event Delegate**：Shell 实现 BusDelegate 接口，接收 Bus 事件
3. **直接服务**：Shell 直接提供 `post()` 接口，不通过 Bus 注册能力
4. **流式传输**：通过 SSE 实时推送任务执行事件给客户端
5. **薄层设计**：Shell 只负责协议转换，不包含业务逻辑

## 架构角色

### Shell 作为 Bus Delegate

Shell 实现 `BusDelegate` 接口，接收来自 Bus 的事件：

```typescript
type BusDelegate = {
  sendShellEvent: (event: ShellEvent) => void;
  logError: (taskId: string, message: string) => void;
  logInfo: (taskId: string, message: string) => void;
};
```

### 事件类型

Shell 接收并处理以下事件：

```typescript
// 用户消息路由事件
type UserMessageRoutedEvent = {
  type: 'user_message_routed';
  taskId: string;
  userMessageId: string;
  timestamp: number;
};

// 能力调用请求事件
type AbilityRequestEvent = {
  type: 'ability_request';
  taskId: string;
  callId: string;
  abilityId: string;
  input: string;
  timestamp: number;
};

// 能力调用响应事件
type AbilityResponseEvent = {
  type: 'ability_response';
  taskId: string;
  callId: string;
  abilityId: string;
  result: InvokeResult<string, string>;
  timestamp: number;
};

// LLM 流式内容事件
type LLMContentEvent = {
  type: 'llm_content';
  taskId: string;
  content: string;
  messageId: string;
  index: number;
  timestamp: number;
};
```

## Shell 接口

### 创建 Shell

```typescript
type Shell = {
  post: (request: PostRequest) => Promise<PostResponse>;
};

// 创建 Shell 实例
export const shell = (config: ShellConfig): Shell => {
  // 实现 BusDelegate
  const sendShellEvent = (event: ShellEvent): void => {
    // 通过 SSE 推送事件
    broadcastToSSE(event);
  };
  
  const logError = (taskId: string, message: string): void => {
    console.error(`[${taskId}]`, message);
  };
  
  const logInfo = (taskId: string, message: string): void => {
    console.log(`[${taskId}]`, message);
  };
  
  return {
    post: async (request: PostRequest) => {
      // 处理用户消息
      return routeUserMessage(request);
    },
  };
};
```

### Shell 配置

```typescript
type ShellConfig = {
  onMessage: (event: ShellEvent) => void;  // 消息回调
};
```

## HTTP API 设计

### 1. POST /send - 发送消息

**请求**：
```json
{
  "message": "Help me analyze this data",
  "userMessageId": "msg-abc123",
  "taskId": "task-123",  // 可选，如果省略则创建新任务
  "llmConfig": {         // 新任务时必需
    "provider": "openai",
    "model": "gpt-4"
  },
  "relatedTaskIds": ["task-456"]  // 可选
}
```

**响应**：
```json
{
  "taskId": "task-123",
  "status": "running"
}
```

**实现流程**：

1. Shell 验证请求
2. 检查是否为新任务（没有 taskId）
3. 新任务：调用 `bus.invoke('task:spawn', ...)`
4. 已有任务：调用 `bus.invoke('task:send', ...)`
5. 返回 taskId

### 2. GET /sse/:taskId? - SSE 流式传输

**目的**：建立 SSE 连接接收任务执行事件。

**请求**：
```http
GET /sse/task-123
Accept: text/event-stream
```

**响应流**：
```http
Content-Type: text/event-stream

event: user_message_routed
data: {"type":"user_message_routed","taskId":"task-123","userMessageId":"msg-1"}

event: ability_request
data: {"type":"ability_request","taskId":"task-123","abilityId":"model:llm"}

event: llm_content
data: {"type":"llm_content","taskId":"task-123","content":"I'll help..."}

event: ability_response
data: {"type":"ability_response","taskId":"task-123","abilityId":"model:llm","result":{...}}
```

## 与 Bus 的集成

### 初始化流程

```typescript
// 1. 创建 Shell（实现 BusDelegate）
const shellInstance = shell({
  onMessage: (event) => {
    // 通过 SSE 推送事件到客户端
    broadcastToSSE(event);
  },
});

// 2. 创建 Bus 并设置 Shell 为 delegate
const bus = createSystemBus(shellInstance);

// 3. Shell 通过 post() 接口直接提供服务
const response = await shellInstance.post({
  message: "Hello",
  userMessageId: "msg-1",
  llmConfig: { provider: "openai", model: "gpt-4" }
});
```

### 事件流动

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ POST /send
     ▼
┌─────────────┐
│   Shell     │
│ (Delegate)  │
└────┬────────┘
     │ bus.invoke('task:spawn', ...)
     ▼
┌─────────────┐
│     Bus     │
└────┬────────┘
     │ executeInvoke()
     │ sendShellEvent(ability_request)
     ▼
┌─────────────┐
│   Shell     │──────┐
│ sendShellEvent()   │
└─────────────┘      │
     │               │
     │ SSE Push      │
     ▼               │
┌──────────┐         │
│  Client  │         │
└──────────┘         │
                     │
     ┌───────────────┘
     ▼
┌─────────────┐
│ Task Module │
└────┬────────┘
     │ handler()
     │ sendShellEvent(ability_response)
     ▼
┌─────────────┐
│   Shell     │
│ sendShellEvent()
└────┬────────┘
     │ SSE Push
     ▼
┌──────────┐
│  Client  │
└──────────┘
```

## 消息路由逻辑

### 新任务创建

```typescript
const routeUserMessage = async (
  request: PostRequest
): Promise<string[]> => {
  if (!request.taskId) {
    // 创建新任务
    const result = await bus.invoke(
      'task:spawn',
      'shell-call-' + uuidv4(),
      'system',
      JSON.stringify({
        goal: request.message,
        provider: request.llmConfig.provider,
        model: request.llmConfig.model,
        // ...
      })
    );
    
    const data = unwrapInvokeResult(result);
    const parsed = JSON.parse(data);
    return [parsed.taskId];
  }
  
  // 已有任务，发送消息
  // ...
};
```

## 错误处理

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const validatePostRequest = (request: PostRequest): void => {
  if (!request.userMessageId || request.userMessageId.trim() === '') {
    throw new ValidationError('Invalid userMessageId');
  }
  
  if (!request.message || request.message.trim() === '') {
    throw new ValidationError('Invalid message');
  }
  
  if (!request.taskId && !request.llmConfig) {
    throw new ValidationError('llmConfig is required for new tasks');
  }
};
```

## 与原设计的主要变更

### 移除的内容

1. **shell:send 能力**：Shell 不再注册能力到 Bus
2. **abilities.ts**：删除 Shell 能力注册文件
3. **能力消费者角色**：Shell 不再是纯粹的能力消费者

### 新增的内容

1. **BusDelegate 实现**：Shell 实现 delegate 接口
2. **事件接收**：接收 Bus 发出的能力调用事件
3. **直接服务接口**：提供 `post()` 方法供外部调用

## 总结

Shell 模块提供：

✅ **HTTP API** 用于消息发送和 SSE 流式传输  
✅ **Bus Delegate** - 接收并转发 Bus 事件  
✅ **独立服务** - 不通过 Bus 注册能力  
✅ **事件驱动** - 通过事件而非能力调用通信  
✅ **消息路由** - 负责新任务创建和消息转发  
✅ **SSE 管理** - 维护客户端连接和事件推送

**核心设计原则**：

- Shell 是独立服务层，不是 Bus Module
- Shell 作为 BusDelegate 接收事件
- Shell 通过 `post()` 直接提供服务
- 所有业务逻辑委托给 Bus 和其他模块
