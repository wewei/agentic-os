# @agentic-os/core

Agentic OS 核心系统 - 基于总线架构的 Agent 系统实现。

## 架构概览

```
┌──────────────────────────────────────────────────────────┐
│              System Bus Controller                       │
│  - invoke(callerId, abilityId, input)                    │
│  - Ability Discovery (list/schema/inspect)               │
└──────────────────────────────────────────────────────────┘
         ▲          ▲          ▲          ▲          ▲
         │          │          │          │          │
┌────────┴────┐ ┌──┴─────┐ ┌──┴───────┐ ┌┴──────┐ ┌─┴────────┐
│   Shell     │ │  Task  │ │  Model   │ │Ledger │ │   Bus    │
│  (HTTP API) │ │ Manager│ │ Manager  │ │(Mock) │ │   Ctrl   │
├─────────────┤ ├────────┤ ├──────────┤ ├───────┤ ├──────────┤
│shell:send   │ │task:   │ │model:llm │ │ldg:   │ │bus:list  │
│             │ │spawn   │ │model:list│ │task:* │ │bus:      │
│             │ │send    │ │model:    │ │msg:*  │ │abilities │
│             │ │cancel  │ │register  │ │call:* │ │bus:schema│
│             │ │active  │ │          │ │       │ │          │
└─────────────┘ └────────┘ └──────────┘ └───────┘ └──────────┘
```

## 核心模块

### System Bus (`/src/bus`)
- 能力注册和调用
- 调用者追踪
- 输入验证（JSON Schema）
- Bus Controller 能力（bus:list, bus:abilities, bus:schema, bus:inspect）

### Shell (`/src/shell`)
- HTTP API (POST /send, GET /stream/:taskId)
- SSE 连接管理
- 消息片段化和流式输出
- 能力：shell:send

### Task Manager (`/src/task`)
- 任务生命周期管理
- 执行循环（LLM 调用 → 工具执行 → 循环）
- 内存中的任务注册表
- 能力：task:spawn, task:send, task:cancel, task:active

### Model Manager (`/src/model`)
- OpenAI 适配器
- 流式响应累积
- 模型注册和管理
- 能力：model:llm, model:list, model:register

### Ledger (`/src/ledger`)
- Mock 实现（所有查询返回空结果）
- 接受保存操作但不持久化
- 能力：ldg:task:*, ldg:call:*, ldg:msg:*

## 安装

从 monorepo 根目录：

```bash
bun install
```

或者在 packages/core 目录：

```bash
cd packages/core
bun install
```

## 使用

### 启动示例

```typescript
// example.ts
import { createAgenticOS } from './src/index';

const agenticOS = await createAgenticOS({
  port: 3000,
  models: {
    models: [
      {
        id: 'gpt4',
        type: 'llm',
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    ],
    defaultLLM: 'gpt4',
  },
});

await agenticOS.start();
```

```bash
bun run dev
```

### 使用 HTTP API

**创建新任务：**
```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, help me analyze some data"}'

# 响应：{"taskId": "task-...", "status": "running"}
```

**流式接收任务输出：**
```bash
curl -N http://localhost:3000/stream/task-xxx
```

## API 文档

### POST /send

发送用户消息，创建或追加到任务。

**请求：**
```json
{
  "message": "用户消息内容",
  "taskId": "task-123"  // 可选，省略则创建新任务
}
```

**响应：**
```json
{
  "taskId": "task-123",
  "status": "running"
}
```

### GET /stream/:taskId

建立 SSE 连接以接收任务的流式输出。

**事件类型：**
- `start` - 连接建立
- `content` - 内容片段
- `tool_call` - 工具调用
- `tool_result` - 工具结果
- `message_complete` - 消息完成
- `end` - 任务结束

## 开发

### 运行测试

```bash
bun test
```

### 代码质量检查

```bash
# 运行 ESLint 检查
bun run lint

# 自动修复可修复的问题
bun run lint:fix
```

## 文档

详细文档请查看 `docs/` 目录：

- 📖 [中文文档](./docs/zh-CN/)
- 📖 [English Documentation](./docs/en-US/)

## MVP 限制

当前 MVP 版本的限制：

1. **无持久化**：使用 Mock Ledger，重启后所有状态丢失
2. **无智能路由**：每个新消息总是创建新任务
3. **单一 LLM 提供商**：只支持 OpenAI
4. **无 Memory**：没有跨任务知识共享
5. **无恢复能力**：不支持从崩溃中恢复

## 许可证

MIT License

