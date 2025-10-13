# Agent OS 项目上下文

<!-- 此文件为共享的项目上下文配置，供 Cursor Agent 和 GitHub Copilot 使用 -->

## 项目概述

Agent OS 是一个基于总线架构的 Agent 系统实现。采用模块化设计，所有组件通过统一的 Agent Bus 进行通信，实现了松耦合、可扩展的架构。

## 技术栈

- **Runtime**: Bun - 快速的 JavaScript 运行时
- **Language**: TypeScript
- **Architecture**: Bus-based Agent System
- **LLM Integration**: OpenAI (可扩展其他提供商)
- **Communication**: HTTP API + Server-Sent Events (SSE)
- **Dependencies**: openai, uuid, zod

## 代码规范

### 编程风格
- 采用函数式编程风格
- 不使用 `class` 和 `interface`
- 使用 `type` 定义数据类型
- 使用函数实现代码逻辑

### 命名规范
- 函数、变量名：`camelCase`
- 类型名：`PascalCase`
- 常量：`SNAKE_CASE`
- 私有辅助函数：可选的 `_` 前缀

### 函数长度
- 单个函数不超过 50 行
- 修改后检查函数长度，过长则进行逻辑提取和拆分
- 使用函数组合替代长函数

### 导入规范
- 所有的 `import` 和 `import type` 语句必须写在文件头部
- 禁止使用 inline import（如在函数内部动态 import）
- 按以下顺序组织导入：
  1. 外部依赖（第三方库）
  2. 内部模块（项目内部）
  3. 类型导入（使用 `import type`）

### 代码示例

```typescript
// ✅ 好的类型定义
type AgentConfig = {
  port: number;
  models: ModelConfig;
  debug?: boolean;
};

type ModelConfig = {
  providers: Record<string, ProviderConfig>;
  defaultLLM?: string;
};

// ✅ 好的函数实现
const validatePort = (port: number): boolean => {
  return port >= 1000 && port <= 65535;
};

const createConfig = (port: number, models: ModelConfig): AgentConfig => {
  if (!validatePort(port)) {
    throw new Error('Invalid port number');
  }
  
  return {
    port,
    models,
    debug: false,
  };
};

// ✅ 使用函数组合拆分逻辑
const parseResult = (result: InvokeResult<string, string>): string => {
  if (result.type === 'success') {
    return result.result;
  }
  const errorMsg = result.type === 'error' ? result.error : result.message;
  throw new Error(`Operation failed: ${errorMsg}`);
};

// ✅ 常量定义
const DEFAULT_PORT = 3000;
const MAX_RETRY_COUNT = 3;
const HEARTBEAT_INTERVAL = 30000;

// ❌ 避免使用 class
// class AgentManager { ... }

// ❌ 避免使用 interface
// interface IAgentConfig { ... }

// ❌ 避免超长函数
// const processData = async () => {
//   // 100+ lines of code...
// }
```

## 架构设计

### Agent Bus 模式
- **统一通信**: 所有模块通过 Agent Bus 通信
- **能力接口**: `invoke(abilityId, callId, callerId, input) => Promise<InvokeResult>`
- **松耦合**: 模块之间无直接依赖
- **可发现**: 运行时能力内省（bus:list, bus:abilities, bus:schema）

### 模块结构
每个模块包含：
- `types.ts` - 类型定义
- `abilities.ts` - 能力实现
- `index.ts` - 模块导出

## 项目结构

```
src/
├── types.ts                 # 共享类型定义
├── index.ts                 # 系统集成入口
├── example.ts               # 使用示例
├── test-basic.ts            # 基础测试
│
├── bus/                     # Agent Bus
│   ├── types.ts            # Bus 相关类型
│   ├── registry.ts         # 能力注册表
│   ├── controller.ts       # Bus 控制器
│   └── index.ts            # Bus 导出
│
├── shell/                   # Shell (HTTP + SSE)
│   ├── types.ts            # Shell 类型
│   ├── sse.ts              # SSE 连接管理
│   ├── routes.ts           # HTTP 路由
│   ├── abilities.ts        # Shell 能力
│   └── index.ts            # Shell 导出
│
├── task/                    # Task Manager
│   ├── types.ts            # Task 类型
│   ├── runloop.ts          # 执行循环
│   ├── abilities.ts        # Task 能力
│   └── index.ts            # Task 导出
│
├── model/                   # Model Manager
│   ├── types.ts            # Model 类型
│   ├── providers/          # 模型提供商
│   │   └── openai.ts      # OpenAI 适配器
│   ├── abilities.ts        # Model 能力
│   └── index.ts            # Model 导出
│
└── ledger/                  # Ledger (数据持久化)
    ├── types.ts            # Ledger 类型
    ├── mock.ts             # Mock 实现
    ├── abilities.ts        # Ledger 能力
    └── index.ts            # Ledger 导出
```

## 核心概念

### 能力 (Ability)
```typescript
type Ability<I = string, O = string> = {
  id: string;
  description: string;
  inputSchema: object;  // JSON Schema
  invoke: (callId: string, callerId: string, input: I) => Promise<O>;
};
```

### 调用结果 (InvokeResult)
```typescript
type InvokeResult<T, E> =
  | { type: 'success'; result: T }
  | { type: 'error'; error: E }
  | { type: 'invalid'; message: string };
```

### 消息流 (Message Flow)
1. 用户通过 Shell 发送消息
2. Shell 创建或路由到 Task
3. Task 调用 Model 生成响应
4. Model 调用 LLM 和工具
5. 结果通过 SSE 流式返回

## 开发指南

### 添加新能力
1. 在对应模块的 `abilities.ts` 中定义能力
2. 使用 Zod 定义输入验证 schema
3. 在 `index.ts` 中注册能力到 Bus
4. 更新模块文档

### 扩展新模块
1. 创建模块目录和文件结构
2. 定义类型 (`types.ts`)
3. 实现能力 (`abilities.ts`)
4. 在 `src/index.ts` 中集成

### 测试
- 单元测试：测试单个函数逻辑
- 集成测试：通过 Bus 测试能力调用
- 端到端测试：通过 HTTP API 测试完整流程

## 设计原则

1. **总线优先**: 所有通信通过 Agent Bus
2. **函数式**: 优先使用纯函数和不可变数据
3. **类型安全**: 充分利用 TypeScript 类型系统
4. **可组合**: 小函数组合成复杂功能
5. **可测试**: 函数易于隔离测试
6. **可扩展**: 新功能通过添加能力实现

## 最佳实践

### 错误处理
```typescript
// ✅ 使用 InvokeResult 返回错误
const ability = async (input: string): Promise<InvokeResult<Data, Error>> => {
  try {
    const data = await process(input);
    return { type: 'success', result: data };
  } catch (error) {
    return { type: 'error', error: String(error) };
  }
};
```

### 异步操作
```typescript
// ✅ 清晰的异步函数
const fetchData = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.text();
};
```

### 配置验证
```typescript
// ✅ 使用 Zod 进行运行时验证
const ConfigSchema = z.object({
  port: z.number().min(1000).max(65535),
  models: z.object({
    providers: z.record(z.string(), ProviderConfigSchema),
  }),
});

type Config = z.infer<typeof ConfigSchema>;
```

