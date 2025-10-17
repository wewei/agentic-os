# Light Service API 文档

## 概述

Light Service 是 Agentic OS 的轻量级后端服务，提供 RESTful API 和 SSE（Server-Sent Events）实时消息流。

### 核心设计原则

**用户消息与任务的关系**

在 AgenticOS 中，用户消息不归属于任何特定任务，而是对 Agent 整体工作上下文的陈述。例如：

- 用户可能同时让 Agent 制作一个关于古生物的 PPT 和一个 Word 文档
- 当用户说"请帮我增加埃迪卡拉纪生物的相关内容"时，这条消息可能同时作用于两个任务
- 用户消息是对 Agent 的指令，由 Shell 接收后进行消息路由，决定影响哪些任务

**关键概念**

1. **用户消息**: 由客户端生成唯一 ID，不归属于任何任务
2. **消息路由**: Shell 根据消息内容和提供的 hint 决定路由到哪些任务
3. **任务消息**: Agent 回复给用户的消息关联并归属于特定任务
4. **Ability 调用**: 不关注 LLM 的 tool call，而是关注更宽泛的 ability call 概念

---

## 配置

### 端点配置

默认配置：
- **主机**: `localhost`
- **端口**: `3000` (可通过环境变量 `PORT` 覆盖)
- **基础路径**: `api`
- **CORS**: 默认允许所有来源 (`*`)

配置文件位置: `~/.agentic-os/config.yaml`

```yaml
endpoint:
  host: localhost
  port: 3000
  path: api
  cors:
    origin: "*"
    credentials: false
```

---

## API 端点

### 1. 发送消息

向 Agent 发送消息，不需要指定任务 ID。

**请求**

```http
POST /api/send
Content-Type: application/json
```

**请求体**

```typescript
type PostMessageRequest = {
  userMessageId: string;     // 必填：客户端生成的唯一消息 ID
  message: string;           // 必填：用户消息内容
  llmConfig: LLMConfig;      // 必填：LLM 配置
  relatedTaskIds?: string[]; // 可选：路由 hint，建议相关的任务 ID 列表
};

type LLMConfig = {
  provider: string;          // LLM 提供商（如 "openai"）
  model: string;             // 模型名称（如 "gpt-4"）
  topP?: number;             // 可选：Top-P 采样参数 (0-1)
  temperature?: number;      // 可选：温度参数 (0-2)
};
```

**验证规则**

- `userMessageId`: 必须为非空字符串，用于幂等性控制
- `message`: 必须为非空字符串
- `llmConfig.provider` 和 `llmConfig.model`: 必填且为非空字符串
- `topP`: 范围 0-1
- `temperature`: 范围 0-2
- `relatedTaskIds`: 如果提供，必须为字符串数组

**响应**

```typescript
type PostMessageResponse = {
  status: string;            // 状态（"ok" 或 "duplicate"）
  receivedMessageId: string; // 服务器确认的消息 ID
};
```

**示例**

```bash
# 发送新消息
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "userMessageId": "user-msg-1697520000-abc123",
    "message": "请帮我创建一个关于古生物的演示文稿",
    "llmConfig": {
      "provider": "openai",
      "model": "gpt-4"
    }
  }'

# 发送消息并提供路由 hint
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "userMessageId": "user-msg-1697520001-def456",
    "message": "请添加埃迪卡拉纪生物的内容",
    "llmConfig": {
      "provider": "openai",
      "model": "gpt-4"
    },
    "relatedTaskIds": ["task-123", "task-456"]
  }'
```

**幂等性**

- 如果发送相同的 `userMessageId`，服务器返回 `status: "duplicate"` 且不会重复处理
- 客户端应为每条新消息生成唯一的 `userMessageId`

**错误响应**

```json
// 400 Bad Request - 验证失败
{
  "error": "userMessageId is required and must be a string"
}

// 500 Internal Server Error - 服务器错误
{
  "error": "Internal server error"
}
```

---

### 2. SSE 消息流

通过 Server-Sent Events 实时接收任务消息和事件。

**请求**

```http
GET /api/sse          # 全局流：接收所有任务的消息
GET /api/sse/:taskId  # 任务流：仅接收指定任务的消息
```

**连接特性**

- **Content-Type**: `text/event-stream`
- **Keep-Alive**: 每 30 秒发送一次心跳（`: keep-alive\n\n`）
- **缓存控制**: `no-cache`
- **连接类型**: `keep-alive`

**SSE 消息格式**

所有消息遵循 SSE 标准格式：

```
data: <JSON>\n\n
```

---

### SSE 事件类型详解

**重要**：所有事件类型定义在 `@agentic-os/core` 包中，确保前后端类型一致。

参考：`packages/core/src/shell/types.ts`

所有事件都是强类型的 Union 类型，每个事件都包含 `timestamp` 字段。

```typescript
// 从 @agentic-os/core 导入
type ShellEvent = 
  | TaskStartedEvent
  | UserMessageRoutedEvent
  | ContentEvent
  | AbilityRequestEvent
  | AbilityResponseEvent
  | TaskCompletedEvent
  | ErrorEvent;
```

#### 1. `task_started` - 任务开始

任务的 Run Loop 开始执行时发送。

**类型定义**

```typescript
type TaskStartedEvent = {
  type: 'task_started';
  taskId: string;           // 任务 ID
  triggerMessageId: string; // 触发该任务的用户消息 ID
  taskName: string;         // 任务名称（取发起消息前 20 字符）
  timestamp: number;        // Unix 时间戳（毫秒）
};
```

**示例**

```json
{
  "type": "task_started",
  "taskId": "task-abc123",
  "triggerMessageId": "user-msg-1697520000-abc123",
  "taskName": "请帮我创建一个关于古生物的演",
  "timestamp": 1697520000123
}
```

#### 2. `user_message_routed` - 用户消息路由到任务

用户消息被路由到特定任务时发送。一条用户消息可以被路由到多个任务。

**类型定义**

```typescript
type UserMessageRoutedEvent = {
  type: 'user_message_routed';
  userMessageId: string;    // 用户消息 ID
  taskId: string;           // 被路由到的任务 ID
  timestamp: number;
};
```

**示例**

```json
{
  "type": "user_message_routed",
  "userMessageId": "user-msg-1697520001-def456",
  "taskId": "task-abc123",
  "timestamp": 1697520001456
}
```

#### 3. `content` - 消息内容片段

Agent 生成的消息内容，支持流式传输。

**类型定义**

```typescript
type ContentEvent = {
  type: 'content';
  taskId: string;           // 任务 ID
  messageId: string;        // 消息 ID（任务内唯一）
  index: number;            // 片段索引，-1 表示消息完成
  content: string;          // 内容片段
  timestamp: number;
};
```

**重要特性**

- 同一个 `messageId` 的多个 `content` 事件需要按 `index` 顺序拼接
- `index: -1` 表示该消息所有内容已发送完毕
- 客户端在收到 `index: -1` 的事件后应停止等待该 `messageId` 的更多内容

**示例**

```json
// 第一个片段
{
  "type": "content",
  "taskId": "task-abc123",
  "messageId": "msg-789",
  "index": 0,
  "content": "我将帮您创建",
  "timestamp": 1697520002100
}

// 第二个片段
{
  "type": "content",
  "taskId": "task-abc123",
  "messageId": "msg-789",
  "index": 1,
  "content": "一个精美的演示文稿。",
  "timestamp": 1697520002250
}

// 消息完成标记
{
  "type": "content",
  "taskId": "task-abc123",
  "messageId": "msg-789",
  "index": -1,
  "content": "",
  "timestamp": 1697520002400
}
```

#### 4. `ability_request` - 能力调用请求

任务调用某个能力时发送。

**类型定义**

```typescript
type AbilityRequestEvent = {
  type: 'ability_request';
  taskId: string;           // 任务 ID
  callId: string;           // 调用 ID（用于关联请求和响应）
  abilityId: string;        // 能力 ID，格式：module:action
  input: string;            // 输入参数（格式由具体能力定义）
  timestamp: number;
};
```

**示例**

```json
{
  "type": "ability_request",
  "taskId": "task-abc123",
  "callId": "call-1697520003-xyz",
  "abilityId": "file:read",
  "input": "{\"path\":\"data/fossils.json\"}",
  "timestamp": 1697520003100
}
```

#### 5. `ability_response` - 能力调用响应

能力执行完成后返回结果。

**类型定义**

```typescript
type AbilityResponseEvent = {
  type: 'ability_response';
  taskId: string;           // 任务 ID
  callId: string;           // 调用 ID（与请求对应）
  abilityId: string;        // 能力 ID
  result: InvokeResult<string, string>; // 执行结果
  timestamp: number;
};

type InvokeResult<R, E> = 
  | { type: 'invalid-ability'; message: string }
  | { type: 'invalid-input'; message: string }
  | { type: 'unknown-failure'; message: string }
  | { type: 'success'; result: R }
  | { type: 'error'; error: E };
```

**示例**

```json
// 成功响应
{
  "type": "ability_response",
  "taskId": "task-abc123",
  "callId": "call-1697520003-xyz",
  "abilityId": "file:read",
  "result": {
    "type": "success",
    "result": "{\"species\":[\"Dickinsonia\",\"Spriggina\"]}"
  },
  "timestamp": 1697520003500
}

// 错误响应
{
  "type": "ability_response",
  "taskId": "task-abc123",
  "callId": "call-1697520004-abc",
  "abilityId": "file:write",
  "result": {
    "type": "error",
    "error": "Permission denied"
  },
  "timestamp": 1697520004200
}
```

#### 6. `task_completed` - 任务完成

任务的 Run Loop 结束时发送。

**类型定义**

```typescript
type TaskCompletedEvent = {
  type: 'task_completed';
  taskId: string;           // 任务 ID
  timestamp: number;
};
```

**示例**

```json
{
  "type": "task_completed",
  "taskId": "task-abc123",
  "timestamp": 1697520010000
}
```

#### 7. `error` - 错误

任务执行过程中发生错误时发送。

**类型定义**

```typescript
type ErrorEvent = {
  type: 'error';
  taskId?: string;          // 相关任务 ID（如果有）
  userMessageId?: string;   // 相关用户消息 ID（如果有）
  errorCode: string;        // 错误代码
  errorMessage: string;     // 错误描述
  timestamp: number;
};
```

**示例**

```json
{
  "type": "error",
  "taskId": "task-abc123",
  "userMessageId": "user-msg-1697520000-abc123",
  "errorCode": "LLM_CONNECTION_FAILED",
  "errorMessage": "Failed to connect to LLM provider",
  "timestamp": 1697520005000
}
```

---

### 3. 获取可用模型

查询后端配置的可用 LLM 模型列表。

**请求**

```http
GET /api/models
```

**响应**

```typescript
type GetModelsResponse = {
  models: TaskModelConfig[];
};

type TaskModelConfig = {
  name: string;        // 模型显示名称
  provider: string;    // 提供商
  model: string;       // 模型标识
};
```

**示例**

```bash
curl http://localhost:3000/api/models
```

```json
{
  "models": [
    {
      "name": "GPT-4",
      "provider": "openai",
      "model": "gpt-4"
    },
    {
      "name": "Claude 3 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-sonnet-20240229"
    }
  ]
}
```

**错误响应**

```json
// 500 Internal Server Error
{
  "error": "Failed to retrieve models",
  "models": []
}
```

---

## 完整消息流示例

以下是一个完整的对话交互流程：

### 场景：用户请求创建演示文稿

#### 1. 客户端发送消息

```http
POST /api/send
Content-Type: application/json

{
  "userMessageId": "user-msg-1697520000-abc123",
  "message": "请帮我创建一个关于埃迪卡拉纪生物的演示文稿",
  "llmConfig": {
    "provider": "openai",
    "model": "gpt-4"
  }
}
```

**响应**:
```json
{
  "status": "ok",
  "receivedMessageId": "user-msg-1697520000-abc123"
}
```

#### 2. 客户端建立 SSE 连接

```http
GET /api/sse
```

#### 3. 服务器发送事件序列

```
data: {"type":"user_message_routed","userMessageId":"user-msg-1697520000-abc123","taskId":"task-xyz789","timestamp":1697520000100}

data: {"type":"task_started","taskId":"task-xyz789","triggerMessageId":"user-msg-1697520000-abc123","taskName":"请帮我创建一个关于埃迪卡拉","timestamp":1697520000200}

data: {"type":"content","taskId":"task-xyz789","messageId":"msg-001","index":0,"content":"我将帮您创建","timestamp":1697520001000}

data: {"type":"content","taskId":"task-xyz789","messageId":"msg-001","index":1,"content":"关于埃迪卡拉纪生物的演示文稿。","timestamp":1697520001150}

data: {"type":"ability_request","taskId":"task-xyz789","callId":"call-1697520001-001","abilityId":"file:search","input":"{\"query\":\"埃迪卡拉纪\"}","timestamp":1697520001300}

data: {"type":"ability_response","taskId":"task-xyz789","callId":"call-1697520001-001","abilityId":"file:search","result":{"type":"success","result":"[{\"file\":\"ediacaran.json\"}]"},"timestamp":1697520001800}

data: {"type":"content","taskId":"task-xyz789","messageId":"msg-001","index":2,"content":"我找到了相关资料。","timestamp":1697520002000}

data: {"type":"content","taskId":"task-xyz789","messageId":"msg-001","index":-1,"content":"","timestamp":1697520002100}

data: {"type":"task_completed","taskId":"task-xyz789","timestamp":1697520002200}

: keep-alive

```

---

## 客户端实现指南

### 消息组装

客户端需要实现消息组装器来处理流式消息：

```typescript
import { MessageAssembler } from './lib/messageService';

const assembler = new MessageAssembler();
const eventSource = new EventSource('/api/sse');

eventSource.onmessage = (event) => {
  const sseEvent: SSEEvent = JSON.parse(event.data);
  
  // 处理事件并获取组装后的消息
  const assembledMessage = assembler.processEvent(sseEvent);
  
  if (assembledMessage) {
    // 更新 UI
    displayMessage(assembledMessage);
  }
};
```

### 内容拼接

按 `messageId` 分组拼接内容，直到收到 `index: -1`：

```typescript
const contentFragments = new Map<string, string[]>();

function handleContentEvent(event: ContentEvent) {
  const { messageId, index, content } = event;
  
  if (index === -1) {
    // 消息完成
    const fragments = contentFragments.get(messageId) || [];
    const fullContent = fragments.join('');
    displayCompleteMessage(messageId, fullContent);
    contentFragments.delete(messageId);
  } else {
    // 积累片段
    if (!contentFragments.has(messageId)) {
      contentFragments.set(messageId, []);
    }
    contentFragments.get(messageId)!.push(content);
    
    // 实时更新部分内容
    const partialContent = contentFragments.get(messageId)!.join('');
    displayPartialMessage(messageId, partialContent);
  }
}
```

### Ability 调用追踪

```typescript
type AbilityCall = {
  callId: string;
  abilityId: string;
  input: string;
  result?: InvokeResult<string, string>;
};

const abilityCalls = new Map<string, AbilityCall>();

function handleAbilityRequest(event: AbilityRequestEvent) {
  abilityCalls.set(event.callId, {
    callId: event.callId,
    abilityId: event.abilityId,
    input: event.input,
  });
  
  // 在 UI 中显示正在调用的能力
  displayAbilityCall(event.callId, event.abilityId, 'running');
}

function handleAbilityResponse(event: AbilityResponseEvent) {
  const call = abilityCalls.get(event.callId);
  if (call) {
    call.result = event.result;
    
    // 更新 UI 显示结果
    if (event.result.type === 'success') {
      displayAbilityCall(event.callId, event.abilityId, 'success');
    } else {
      displayAbilityCall(event.callId, event.abilityId, 'error');
    }
  }
}
```

### 发送消息

```typescript
import { sendMessage } from './lib/messageService';

async function sendUserMessage(message: string, llmConfig: LLMConfig) {
  try {
    const response = await sendMessage(message, llmConfig);
    console.log('Message sent:', response.receivedMessageId);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
```

---

## CORS 配置

### 默认 CORS 头

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Credentials: false
```

### 自定义 CORS

在配置文件中修改：

```yaml
endpoint:
  cors:
    origin: 
      - "http://localhost:5173"
      - "https://my-app.com"
    credentials: true
```

---

## 错误处理

### HTTP 错误码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求正常处理 |
| 400 | 请求错误 | 参数验证失败 |
| 404 | 未找到 | 路由不存在 |
| 500 | 服务器错误 | 内部处理异常 |

### SSE 连接管理

- **自动重连**: 客户端应实现 EventSource 的 `onerror` 处理和重连逻辑
- **心跳检测**: 服务器每 30 秒发送 `: keep-alive\n\n`
- **连接清理**: 
  - 客户端关闭时，服务器自动清理连接
  - 推荐使用全局流 (`/api/sse`) 并在客户端根据 `taskId` 过滤

### 错误恢复

```typescript
let retryDelay = 1000;

eventSource.onerror = () => {
  eventSource.close();
  
  // 指数退避重连
  setTimeout(() => {
    reconnect();
  }, retryDelay);
  
  retryDelay = Math.min(retryDelay * 2, 30000);
};

eventSource.onopen = () => {
  // 重置重试延迟
  retryDelay = 1000;
};
```

---

## 最佳实践

### 1. 使用全局流 + 客户端过滤

**推荐**：

```typescript
const eventSource = new EventSource('/api/sse');

eventSource.onmessage = (event) => {
  const sseEvent: SSEEvent = JSON.parse(event.data);
  
  // 客户端根据需要过滤事件
  if (isRelevantEvent(sseEvent)) {
    handleEvent(sseEvent);
  }
};
```

**优点**：
- 支持多任务并发
- 减少连接数
- 便于全局状态管理
- 可以观察所有任务的事件

### 2. 生成唯一消息 ID

```typescript
function generateUserMessageId(): string {
  return `user-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
```

### 3. 处理路由 hint

当用户在特定任务上下文中发送消息时，提供 `relatedTaskIds`：

```typescript
const currentTaskIds = ['task-123', 'task-456'];

await sendMessage(
  '请添加更多细节',
  llmConfig,
  currentTaskIds // 路由 hint
);
```

### 4. 能力调用可视化

在 UI 中展示能力调用过程：

```typescript
function displayAbilityCall(
  callId: string,
  abilityId: string,
  status: 'running' | 'success' | 'error'
) {
  const statusEmoji = {
    running: '⏳',
    success: '✅',
    error: '❌'
  };
  
  return `${statusEmoji[status]} ${abilityId}`;
}
```

---

## 性能考虑

### 连接限制

- 浏览器对同一域名的 EventSource 连接数有限制（通常 6 个）
- 建议：使用全局流而非为每个任务创建独立连接

### 消息缓冲

- 服务器不缓存历史消息
- 客户端需自行维护消息历史
- 重连后不会重发已发送的消息

### 心跳机制

- Keep-alive 间隔：30 秒
- 推荐客户端超时设置：60 秒（2 倍心跳间隔）

---

## 安全注意事项

1. **生产环境**：
   - 必须配置具体的 CORS `origin`，不要使用 `*`
   - 考虑添加认证机制（API Key、JWT 等）
   - 使用 HTTPS

2. **输入验证**：
   - 服务器已实现基本验证
   - 客户端应进行预验证以提升 UX

3. **幂等性**：
   - 使用 `userMessageId` 防止重复处理
   - 客户端应保存已发送的消息 ID

4. **速率限制**：
   - 当前版本未实现速率限制
   - 生产环境建议添加请求限流

---

## 调试技巧

### 1. 查看服务器日志

Light Service 会记录关键事件：

```
[INFO] Received message request: userMessageId=user-msg-..., messageLength=45
[INFO] Message posted successfully: userMessageId=user-msg-..., taskId=task-...
[INFO] Task started: taskId=task-..., triggerMessage=user-msg-...
[INFO] Task completed: taskId=task-...
```

### 2. 监控 SSE 连接

```typescript
eventSource.addEventListener('open', () => {
  console.log('SSE connection opened');
});

eventSource.addEventListener('error', (e) => {
  console.error('SSE error:', e);
});

eventSource.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  console.log(`Event: ${event.type}`, event);
});
```

### 3. 使用 curl 测试 SSE

```bash
curl -N http://localhost:3000/api/sse
```

### 4. 测试幂等性

```bash
# 发送相同的 userMessageId 两次
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"userMessageId":"test-123","message":"test","llmConfig":{"provider":"openai","model":"gpt-4"}}'

# 第二次应返回 status: "duplicate"
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{"userMessageId":"test-123","message":"test","llmConfig":{"provider":"openai","model":"gpt-4"}}'
```

---

## 版本信息

- **API Version**: 2.0
- **Last Updated**: 2025-10-17
- **Breaking Changes**: 
  - 移除了 `taskId` 参数，改为 `relatedTaskIds`
  - 新增 `userMessageId` 必填参数
  - SSE 事件类型完全重构
  - 移除 `tool_call/tool_result`，改为 `ability_request/ability_response`
  - 移除 `message_complete` 事件，改用 `index: -1` 标记

---

## 附录

### A. 完整类型定义

**单一事实来源**：所有事件类型定义在 Core 包中

参考文件：
- **事件类型定义**: `packages/core/src/shell/types.ts` ⭐
- Backend (重新导出): `packages/light-service/src/types.ts`
- Frontend (重新导出): `packages/webui/src/lib/messageService.ts`
- Core 核心类型: `packages/core/src/types.ts`

### B. 配置示例

参考文件：
- `packages/light-service/config.example.yaml`

### C. 实现参考

- Server: `packages/light-service/src/server.ts`
- Message Assembler: `packages/webui/src/lib/messageService.ts` (MessageAssembler class)

### D. 架构设计文档

参考文件：
- `.github/project-context.md`
- Agent Bus 架构文档
