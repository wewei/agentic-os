# Agentic OS

Agentic OS 是一个基于总线架构的 Agent 系统实现。

## Monorepo 结构

这是一个使用 Bun workspace 管理的 monorepo 项目，包含以下 packages：

```
agent-os/
├── packages/
│   ├── core/          # @agentic-os/core - 核心系统
│   ├── cli/           # @agentic-os/cli - 终端 UI
│   └── webui/         # @agentic-os/webui - Web 界面
└── package.json       # 工作空间根配置
```

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 环境设置

```bash
# 设置 OpenAI API Key
export OPENAI_API_KEY=your-api-key-here
```

### 3. 启动 Agentic OS

启动核心系统：

```bash
bun run dev
```

或启动 CLI 终端 UI：

```bash
bun run cli
```

或启动 Web UI：

```bash
bun run webui
```

## Packages

### [@agentic-os/core](./packages/core)

核心系统实现，包含：
- System Bus - 总线控制器
- Shell - HTTP API 和 SSE 流式输出
- Task Manager - 任务生命周期管理
- Model Manager - LLM 适配器
- Ledger - 数据持久化（当前为 Mock 实现）

详细文档请查看 [packages/core/README.md](./packages/core/README.md)

### [@agentic-os/cli](./packages/cli)

终端用户界面 (TUI)，基于 blessed 构建：
- 上下分屏布局：消息流 + 输入框
- 模块化配置：从 `~/.agentic-os/config.yaml` 读取
- 函数式设计：纯函数和不可变状态
- 命令系统：支持 `/help`、`/clear`、`/config` 等命令

详细文档请查看 [packages/cli/README.md](./packages/cli/README.md)

### [@agentic-os/webui](./packages/webui)

现代化的 Web 界面，用于与 Agent 交互：

- **实时消息流**：使用 Server-Sent Events (SSE) 进行实时消息推送
- **现代 UI**：基于 React + shadcn/ui + Tailwind CSS
- **工具调用可视化**：实时显示 Agent 的工具调用和结果
- **响应式设计**：支持桌面和移动设备
- **消息组装**：智能组装流式消息片段

详细文档请查看 [packages/webui/README.md](./packages/webui/README.md)

## 开发

### 安装依赖

```bash
bun install
```

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

### 清理依赖

```bash
bun run clean
bun run install:all
```

## 设计原则

1. **总线优先通信**：所有模块通过 System Bus 通信，无直接依赖
2. **统一能力接口**：`invoke(callerId, abilityId, input) => Promise<string>`
3. **函数式风格**：优先使用纯函数，函数长度 ≤ 50 行
4. **类型安全**：使用 TypeScript `type` 而非 `interface`
5. **可发现性**：通过 bus:* 能力实现运行时内省

## 技术栈

- **Runtime**: [Bun](https://bun.sh) - 快速的 JavaScript 运行时
- **Language**: TypeScript
- **Architecture**: Bus-based Agent System
- **Code Quality**: ESLint + TypeScript ESLint
- **Monorepo**: Bun Workspaces

## 许可证

MIT License

---

*Built with ❤️ using Bun*
