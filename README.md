# Agentic OS

Agentic OS 是一个基于总线架构的 Agent 系统实现。

## Monorepo 结构

这是一个使用 Bun workspace 管理的 monorepo 项目，包含以下 packages：

```
agent-os/
├── packages/
│   └── core/          # @agentic-os/core - 核心系统
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

```bash
bun run dev
```

或者进入 core package：

```bash
cd packages/core
bun run dev
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
