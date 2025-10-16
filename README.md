# Agentic OS

Agentic OS 是一个基于总线架构的 Agent 系统实现，采用前后端分离架构。

## Monorepo 结构

这是一个使用 Bun workspace 管理的 monorepo 项目，包含以下 packages：

```
agent-os/
├── packages/
│   ├── core/          # @agentic-os/core - 核心系统
│   ├── cli/           # @agentic-os/cli - 终端 UI
│   ├── light-service/ # @agentic-os/light-service - 轻量级后端 API 服务
│   └── webui/         # @agentic-os/webui - Web 前端界面
└── package.json       # 工作空间根配置
```

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置系统

创建配置文件 `~/.agentic-os/config.yaml`：

```bash
# 创建配置目录
mkdir -p ~/.agentic-os

# 复制示例配置
cp packages/light-service/config.example.yaml ~/.agentic-os/config.yaml

# 编辑配置文件，设置你的 API Key 等
```

配置示例：

```yaml
# API Endpoint 配置
endpoint:
  host: "localhost"
  port: 3000
  path: "api"
  cors:
    origin: "*"
    credentials: false

# 模型配置
model:
  providers:
    openai:
      endpoint: "https://api.openai.com/v1"
      apiKey: "${OPENAI_API_KEY}"  # 从环境变量读取
      adapterType: "openai"
      models:
        - type: "llm"
          name: "gpt-4"
        - type: "llm"
          name: "gpt-3.5-turbo"
```

### 3. 设置环境变量

```bash
# 设置 OpenAI API Key
export OPENAI_API_KEY=your-api-key-here
```

### 4. 启动应用

#### 方式一：使用 CLI 终端界面

```bash
bun run cli
```

#### 方式二：使用 Web 界面（推荐）

**启动后端服务：**
```bash
bun run light-service:dev
```

服务将在 `http://localhost:3000` 启动，API 端点：
- `POST http://localhost:3000/api/send` - 发送消息
- `GET http://localhost:3000/api/sse/:taskId?` - 接收实时消息流
- `GET http://localhost:3000/api/models` - 获取模型列表（占位符）

**启动前端界面（新终端）：**

```bash
# 配置前端 API 地址
cd packages/webui
cp .env.example .env
# 编辑 .env，设置 VITE_AGENTIC_API_URL=http://localhost:3000/api

# 启动前端开发服务器
bun run dev
```

前端将在 `http://localhost:5173` 启动。

或者从根目录直接启动：

```bash
bun run webui:dev
```

## Packages 详解

### [@agentic-os/core](./packages/core)

核心系统实现，基于总线架构：

- **System Bus** - 总线控制器，负责模块间通信
- **Shell** - HTTP API 和 SSE 流式输出接口
- **Task Manager** - 任务生命周期管理
- **Model Manager** - LLM 适配器和模型管理
- **Ledger** - 数据持久化（当前为 Mock 实现）

详细文档请查看 [packages/core/README.md](./packages/core/README.md)

### [@agentic-os/cli](./packages/cli)

终端用户界面 (TUI)，基于 blessed 构建：

- 上下分屏布局：消息流 + 输入框
- 模块化配置：从 `~/.agentic-os/config.yaml` 读取
- 函数式设计：纯函数和不可变状态
- 命令系统：支持 `/help`、`/clear`、`/config` 等命令

**使用方法：**
```bash
bun run cli
# 或
bun run cli:dev  # 开发模式（自动重载）
```

详细文档请查看 [packages/cli/README.md](./packages/cli/README.md)

### [@agentic-os/light-service](./packages/light-service)

轻量级后端 API 服务，提供 HTTP/SSE 端点：

**特性：**
- RESTful API 端点：`POST /{path}/send`、`GET /{path}/sse/:taskId?`
- 可配置的端点路径和 CORS 设置
- 支持多任务并发处理
- 集成完整的 AgenticOS 核心功能
- SSE 流式响应支持（可选 taskId 过滤）

**使用方法：**
```bash
# 开发模式（自动重载）
bun run light-service:dev

# 生产模式
bun run light-service
```

**配置：** 通过 `~/.agentic-os/config.yaml` 或环境变量配置
- `HOST` - 服务器主机（默认：localhost）
- `PORT` - 服务器端口（默认：3000）
- `API_PATH` - API 基础路径（默认：api）
- `CORS_ORIGIN` - CORS 允许的源（默认：*）

详细文档请查看 [packages/light-service/README.md](./packages/light-service/README.md)

### [@agentic-os/webui](./packages/webui)

现代化的 Web 前端界面，用于与 Agent 交互：

**特性：**
- **实时消息流**：使用 Server-Sent Events (SSE) 进行实时消息推送
- **现代 UI**：基于 React + shadcn/ui + Tailwind CSS
- **工具调用可视化**：实时显示 Agent 的工具调用和结果
- **响应式设计**：支持桌面和移动设备
- **消息组装**：智能组装流式消息片段

**使用方法：**

开发模式：
```bash
cd packages/webui

# 配置 API 端点
cp .env.example .env
# 编辑 .env：VITE_AGENTIC_API_URL=http://localhost:3000/api

# 启动开发服务器
bun run dev
```

生产构建：
```bash
cd packages/webui
bun run build      # 构建到 dist/
bun run start      # 预览生产构建
```

**环境变量：**
- `VITE_AGENTIC_API_URL` - Light Service 后端 API 地址（默认：http://localhost:3000/api）

**部署：** 构建后的 `dist/` 目录可以部署到任何静态托管服务（Vercel、Netlify、Cloudflare Pages 等）

详细文档请查看 [packages/webui/README.md](./packages/webui/README.md)

## 架构说明

### 前后端分离架构

```
┌─────────────────────────────────┐
│   Browser / Frontend (WebUI)   │
│   React + Vite                  │
│   http://localhost:5173         │
└──────────────┬──────────────────┘
               │ HTTP/SSE
               │ VITE_AGENTIC_API_URL
               │
┌──────────────▼──────────────────┐
│   Light Service (Backend)       │
│   Bun HTTP Server               │
│   http://localhost:3000         │
│                                 │
│   /{path}/send      (POST)      │
│   /{path}/sse       (GET)       │
│   /{path}/models    (GET)       │
└──────────────┬──────────────────┘
               │
               │
┌──────────────▼──────────────────┐
│   AgenticOS Core                │
│   • Bus Controller              │
│   • Task Manager                │
│   • Model Manager               │
│   • Ledger                      │
└─────────────────────────────────┘
```

### 总线架构

所有模块通过 System Bus 进行通信：

```
Module A ──┐
           ├──> System Bus ──> Module B
Module C ──┘
```

- 统一能力接口：`invoke(abilityId, callId, callerId, input)`
- 能力 ID 格式：`module:action`（如 `task:spawn`, `model:llm`）
- 运行时内省：通过 `bus:*` 能力查询系统状态

## 开发

### NPM Scripts

```bash
# 核心系统
bun run dev                  # 启动 core 开发模式
bun run start                # 启动 core

# CLI
bun run cli                  # 启动 CLI
bun run cli:dev              # CLI 开发模式

# Light Service（后端）
bun run light-service        # 启动后端
bun run light-service:dev    # 后端开发模式

# WebUI（前端）
bun run webui:dev            # 启动前端开发服务器
bun run webui:build          # 构建前端
bun run webui                # 预览前端生产构建

# 测试和质量
bun test                     # 运行测试
bun run lint                 # 代码检查
bun run lint:fix             # 自动修复代码问题

# 依赖管理
bun run clean                # 清理依赖
bun run install:all          # 重新安装依赖
```

### 代码质量检查

```bash
# 运行 ESLint 检查所有包
bun run lint

# 自动修复可修复的问题
bun run lint:fix

# 检查特定包
bun run --cwd packages/core lint
bun run --cwd packages/cli lint
bun run --cwd packages/light-service lint
bun run --cwd packages/webui lint
```

### 运行测试

```bash
# 运行所有测试
bun test

# 监听模式
bun test --watch
```

## 设计原则

1. **总线优先通信**：所有模块通过 System Bus 通信，无直接依赖
2. **统一能力接口**：`invoke(callerId, abilityId, input) => Promise<string>`
3. **函数式风格**：优先使用纯函数，函数长度 ≤ 50 行
4. **类型安全**：使用 TypeScript `type` 而非 `interface`
5. **可发现性**：通过 `bus:*` 能力实现运行时内省
6. **前后端分离**：前端可独立部署到静态托管，后端可独立扩展

## 配置说明

### 系统配置

配置文件位置：`~/.agentic-os/config.yaml`

```yaml
# API Endpoint 配置
endpoint:
  host: "localhost"      # 服务器主机
  port: 3000            # 服务器端口
  path: "api"           # API 基础路径
  cors:
    origin: "*"         # CORS 允许的源
    credentials: false  # 是否允许携带凭证

# 模型配置
model:
  providers:
    openai:
      endpoint: "https://api.openai.com/v1"
      apiKey: "${OPENAI_API_KEY}"
      adapterType: "openai"
      models:
        - type: "llm"
          name: "gpt-4"
        - type: "llm"
          name: "gpt-3.5-turbo"
        - type: "embed"
          name: "text-embedding-ada-002"

# 任务配置
task:
  maxConcurrentTasks: 5     # 最大并发任务数
  taskTimeout: 300000       # 任务超时（毫秒）

# Ledger 配置
ledger:
  persistence: true         # 启用持久化
  maxEntries: 1000         # 最大条目数
```

### 前端配置

配置文件位置：`packages/webui/.env`

```env
# Light Service 后端 API 地址
VITE_AGENTIC_API_URL=http://localhost:3000/api
```

## 生产部署

### 后端部署（Light Service）

```bash
# 方式一：直接运行
cd packages/light-service
bun run start

# 方式二：使用 Docker
FROM oven/bun:latest
WORKDIR /app
COPY packages/light-service .
RUN bun install --production
CMD ["bun", "run", "index.ts"]
```

### 前端部署（WebUI）

```bash
# 构建
cd packages/webui
VITE_AGENTIC_API_URL=https://your-api-domain.com/api bun run build

# 部署 dist/ 目录到：
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - Cloudflare Pages: 连接 Git 仓库
# - 其他静态托管服务
```

## 技术栈

- **Runtime**: [Bun](https://bun.sh) - 快速的 JavaScript 运行时
- **Language**: TypeScript
- **Architecture**: Bus-based Agent System
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Bun HTTP Server + Server-Sent Events
- **Code Quality**: ESLint + TypeScript ESLint
- **Monorepo**: Bun Workspaces

## 故障排查

### 后端无法启动

1. 检查配置文件：`cat ~/.agentic-os/config.yaml`
2. 检查端口是否被占用：`lsof -i :3000`
3. 验证 API Key：`echo $OPENAI_API_KEY`

### 前端无法连接后端

1. 确认后端已启动：`curl http://localhost:3000/api/models`
2. 检查环境变量：`cat packages/webui/.env`
3. 查看浏览器控制台的 CORS 错误
4. 更新配置文件中的 CORS 设置

### 构建错误

```bash
# 清理并重新安装依赖
bun run clean
bun install

# 或针对特定包
cd packages/webui
rm -rf node_modules dist
bun install
```

## 许可证

MIT License

---

**Built with ❤️ using Bun**
