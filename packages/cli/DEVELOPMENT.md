# 开发指南 - @agentic-os/cli

## 架构概览

`@agentic-os/cli` 采用函数式编程风格设计，将应用拆分为独立的、可组合的函数模块。

### 核心模块

```
src/
├── types.ts      # 类型定义
├── config.ts     # 配置管理
├── ui.ts         # UI 组件
├── app.ts        # 应用逻辑
├── cli.ts        # CLI 入口
├── index.ts      # 模块导出
└── example.ts    # 使用示例
```

## 模块详解

### 1. types.ts - 类型定义

定义了整个应用使用的类型，包括：

- `AppConfig` - 应用配置类型，按模块组织
- `Message` - 消息类型
- `AppState` - 应用状态
- `UIComponents` - UI 组件
- `EventHandlers` - 事件处理器

**设计原则**：
- 使用 `type` 而非 `interface`
- 保持类型简单和可组合
- 所有类型都是不可变的

### 2. config.ts - 配置管理

提供配置文件的读取、保存和管理功能。

**核心函数**：

```typescript
// 获取配置路径
getConfigPath(): string

// 获取默认配置
getDefaultConfig(): AppConfig

// 加载配置
loadConfig(configPath?: string): AppConfig

// 保存配置
saveConfig(config: AppConfig, configPath?: string): void

// 获取模块配置
getModuleConfig<T>(config: AppConfig, module: string): T | undefined

// 更新模块配置
updateModuleConfig(config: AppConfig, module: string, 
                   moduleConfig: Record<string, unknown>): AppConfig
```

**特点**：
- 所有函数都是纯函数（除了 I/O 操作）
- 配置文件格式：YAML
- 默认位置：`~/.agentic-os/config.yaml`
- 按模块组织配置

### 3. ui.ts - UI 组件

使用 blessed 库创建和管理 TUI 组件。

**核心函数**：

```typescript
// 创建屏幕
createScreen(): blessed.Widgets.Screen

// 创建消息显示框
createMessageBox(screen: blessed.Widgets.Screen): blessed.Widgets.BoxElement

// 创建输入框
createInputBox(screen: blessed.Widgets.Screen): blessed.Widgets.TextboxElement

// 初始化 UI
initUI(): UIComponents

// 格式化消息
formatMessage(message: Message): string

// 更新消息显示
updateMessages(messageBox: blessed.Widgets.BoxElement, messages: Message[]): void

// 清空输入
clearInput(inputBox: blessed.Widgets.TextboxElement): void

// 设置事件处理器
setupEventHandlers(components: UIComponents, handlers: EventHandlers): void

// 渲染屏幕
render(screen: blessed.Widgets.Screen): void

// 销毁 UI
destroyUI(screen: blessed.Widgets.Screen): void
```

**特点**：
- 纯函数式 UI 管理
- 分离创建和事件处理
- 使用依赖注入模式

### 4. app.ts - 应用逻辑

实现应用的核心业务逻辑。

**核心函数**：

```typescript
// 创建初始状态
createInitialState(config: AppConfig): AppState

// 添加消息
addMessage(state: AppState, message: Message): AppState

// 处理用户输入
handleUserInput(state: AppState, input: string): AppState

// 处理命令
handleCommand(state: AppState, command: string): AppState

// 运行应用
runApp(configPath?: string): Promise<void>
```

**特点**：
- 不可变状态管理
- 纯函数式状态转换
- 命令模式处理用户输入

### 5. cli.ts - CLI 入口

应用的入口点，处理命令行参数。

**特点**：
- 支持 `--config` 参数指定配置文件
- 错误处理和进程管理
- Shebang 支持（`#!/usr/bin/env bun`）

## 设计模式

### 1. 函数式编程

所有核心逻辑都使用纯函数实现：

```typescript
// ✅ 好的做法：纯函数
export const addMessage = (state: AppState, message: Message): AppState => {
  return {
    ...state,
    messages: [...state.messages, message],
  };
};

// ❌ 避免：修改输入
export const addMessage = (state: AppState, message: Message): void => {
  state.messages.push(message); // 不要这样做！
};
```

### 2. 依赖注入

通过参数传递依赖，而不是全局状态：

```typescript
// ✅ 好的做法：依赖作为参数
export const setupEventHandlers = (
  components: UIComponents,
  handlers: EventHandlers
): void => {
  // ...
};

// ❌ 避免：全局状态
let globalComponents: UIComponents;
export const setupEventHandlers = (handlers: EventHandlers): void => {
  // 使用 globalComponents
};
```

### 3. 组合而非继承

使用函数组合构建复杂逻辑：

```typescript
// ✅ 好的做法：函数组合
const processUserInput = (input: string) =>
  pipe(
    input,
    trimInput,
    validateInput,
    parseCommand
  );

// ❌ 避免：类继承
class InputProcessor {
  // ...
}
```

## 代码规范

### 命名约定

- **函数和变量**：camelCase
  ```typescript
  const getUserInput = () => { /* ... */ };
  const messageLimit = 1000;
  ```

- **类型**：PascalCase
  ```typescript
  type AppConfig = { /* ... */ };
  type Message = { /* ... */ };
  ```

- **常量**：camelCase（如果是配置值）或 UPPER_SNAKE_CASE（如果是真正的常量）
  ```typescript
  const defaultTheme = 'dark';
  const MAX_MESSAGE_LENGTH = 1000;
  ```

### 函数长度

- 保持函数在 50 行以内
- 超过 50 行时，提取子函数
- 一个函数只做一件事

```typescript
// ✅ 好的做法：小函数
const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString();
};

const getTypeColor = (type: Message['type']): string => {
  switch (type) {
    case 'user': return 'green';
    case 'agent': return 'cyan';
    case 'system': return 'yellow';
    case 'error': return 'red';
  }
};

const formatMessage = (message: Message): string => {
  const timestamp = formatTimestamp(message.timestamp);
  const color = getTypeColor(message.type);
  return `{${color}-fg}[${timestamp}]{/} ${message.content}`;
};
```

### 类型注解

- 总是为导出的函数添加类型注解
- 内部函数可以依赖类型推断
- 使用 `type` 而非 `interface`

```typescript
// ✅ 好的做法
export const loadConfig = (configPath?: string): AppConfig => {
  // ...
};

// ❌ 避免
export const loadConfig = (configPath) => {
  // 缺少类型注解
};
```

## 测试

### 单元测试

为每个纯函数编写单元测试：

```typescript
import { test, expect } from 'bun:test';
import { addMessage, createInitialState } from './app.ts';

test('addMessage adds a message to state', () => {
  const state = createInitialState({});
  const message = {
    timestamp: new Date(),
    content: 'Test',
    type: 'user' as const,
  };
  
  const newState = addMessage(state, message);
  
  expect(newState.messages).toContain(message);
  expect(state.messages).not.toContain(message); // 不可变
});
```

### 集成测试

测试完整的用户流程：

```typescript
test('user input flow', () => {
  const state = createInitialState({});
  const newState = handleUserInput(state, 'Hello');
  
  expect(newState.messages.some(m => m.content === 'Hello')).toBe(true);
  expect(newState.messages.some(m => m.type === 'agent')).toBe(true);
});
```

## 扩展指南

### 添加新命令

1. 在 `app.ts` 中的 `handleCommand` 函数添加新的 case：

```typescript
export const handleCommand = (state: AppState, command: string): AppState => {
  const [cmd, ...args] = command.slice(1).split(' ');

  switch (cmd) {
    // 添加新命令
    case 'stats':
      return handleStatsCommand(state);
    
    // ... 其他命令
  }
};
```

2. 实现命令处理函数：

```typescript
const handleStatsCommand = (state: AppState): AppState => {
  const stats = calculateStats(state.messages);
  return addMessage(state, {
    timestamp: new Date(),
    content: formatStats(stats),
    type: 'system',
  });
};
```

### 添加新的消息类型

1. 在 `types.ts` 中更新 `Message` 类型：

```typescript
export type Message = {
  timestamp: Date;
  content: string;
  type: 'user' | 'system' | 'agent' | 'error' | 'debug'; // 添加 'debug'
};
```

2. 在 `ui.ts` 中添加对应的颜色：

```typescript
const getTypeColor = (type: Message['type']): string => {
  switch (type) {
    // ... 其他类型
    case 'debug':
      return 'magenta';
  }
};
```

### 集成 Agent Bus

将 CLI 与 `@agentic-os/core` 的 Agent Bus 集成：

```typescript
import { createBus } from '@agentic-os/core';

export const runAppWithBus = async (configPath?: string): Promise<void> => {
  const config = loadConfig(configPath);
  const bus = createBus();
  
  // 注册能力
  // ...
  
  // 修改 handleUserInput 使用 bus
  // ...
};
```

## 性能优化

### 消息限制

通过 `messageLimit` 配置限制消息历史：

```typescript
const messageLimit = (config.cli as { messageLimit?: number })?.messageLimit || 1000;

if (newMessages.length > messageLimit) {
  newMessages.splice(0, newMessages.length - messageLimit);
}
```

### 渲染优化

只在必要时重新渲染：

```typescript
// 批量更新
const batchUpdate = (updates: Array<() => void>) => {
  updates.forEach(update => update());
  render(screen);
};
```

## 调试技巧

### 日志记录

添加调试日志（生产环境可移除）：

```typescript
const DEBUG = process.env.DEBUG === 'true';

const log = (message: string, data?: unknown) => {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, data);
  }
};
```

### 状态检查

在开发模式下添加状态检查命令：

```typescript
case 'debug':
  return addMessage(state, {
    timestamp: new Date(),
    content: JSON.stringify(state, null, 2),
    type: 'system',
  });
```

## 贡献指南

1. 遵循函数式编程原则
2. 保持函数简短和单一职责
3. 添加类型注解
4. 编写测试
5. 运行 linter：`bun run lint`
6. 更新文档

## 下一步计划

- [ ] 添加单元测试
- [ ] 集成 Agent Bus
- [ ] 支持插件系统
- [ ] 添加主题系统
- [ ] 实现会话管理
- [ ] 支持多语言
- [ ] 添加快捷键配置
- [ ] 实现命令自动补全

