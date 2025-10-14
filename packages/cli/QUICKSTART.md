# 快速开始指南 - Agentic OS CLI

这是一个基于 blessed 的终端 UI 应用，用于与 Agentic OS 交互。

## 安装

```bash
# 在项目根目录
bun install
```

## 运行

### 方式 1: 从根目录运行

```bash
# 直接启动 CLI
bun run cli

# 开发模式（带热重载）
bun run cli:dev
```

### 方式 2: 在 CLI 包目录运行

```bash
cd packages/cli

# 直接启动
bun run start

# 开发模式
bun run dev
```

### 方式 3: 使用自定义配置

```bash
bun run packages/cli/src/cli.ts --config /path/to/config.yaml
```

## 界面布局

```
┌─────────────────────────────────────┐
│                                     │
│  消息流窗口 (占 80% 高度)           │
│  - 可滚动的历史消息                 │
│  - 按类型显示不同颜色               │
│  - 带时间戳                         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  输入窗口 (占 20% 高度)             │
│  - 输入消息后按 Enter 发送          │
│                                     │
└─────────────────────────────────────┘
```

## 快捷键

- `Enter` - 发送消息
- `Ctrl+C` 或 `Esc` - 退出应用
- `上/下箭头` - 在消息窗口中滚动（当光标在消息窗口时）

## 命令

在输入框中输入以下命令：

- `/help` - 显示帮助信息
- `/clear` - 清空消息历史
- `/config` - 显示当前配置

## 配置

配置文件位置：`~/.agentic-os/config.yaml`

### 创建配置文件

```bash
# 复制示例配置
mkdir -p ~/.agentic-os
cp packages/cli/config.example.yaml ~/.agentic-os/config.yaml

# 编辑配置
notepad ~/.agentic-os/config.yaml  # Windows
# 或
vim ~/.agentic-os/config.yaml      # Linux/Mac
```

### 配置文件结构

```yaml
# CLI 模块配置
cli:
  theme: default
  messageLimit: 1000

# 模型模块配置
model:
  provider: openai
  model: gpt-4

# Shell 模块配置
shell:
  maxBufferSize: 1048576

# 任务模块配置
task:
  maxConcurrentTasks: 5

# 内存模块配置
memory:
  persistPath: ~/.agentic-os/memory

# 账本模块配置
ledger:
  trackUsage: true
```

## 消息类型和颜色

- **用户消息** (绿色) - 你输入的消息
- **Agent 消息** (青色) - Agent 的回复
- **系统消息** (黄色) - 系统通知
- **错误消息** (红色) - 错误信息

## 开发

### 项目结构

```
packages/cli/
├── src/
│   ├── types.ts      # 类型定义
│   ├── config.ts     # 配置管理
│   ├── ui.ts         # UI 组件
│   ├── app.ts        # 应用逻辑
│   ├── cli.ts        # CLI 入口
│   └── index.ts      # 导出
├── package.json
├── tsconfig.json
├── eslint.config.js
├── README.md
└── QUICKSTART.md
```

### 代码风格

- 函数式编程风格，避免使用 class 和 interface
- 使用 `type` 定义类型
- 函数长度不超过 50 行
- 使用 camelCase 命名函数和变量
- 使用 PascalCase 命名类型

### 运行 Linter

```bash
# 检查代码质量
bun run lint

# 自动修复问题
bun run lint:fix
```

## 故障排除

### 问题：配置文件未加载

**解决方案**：
1. 检查配置文件路径是否正确：`~/.agentic-os/config.yaml`
2. 确保配置文件是有效的 YAML 格式
3. 查看应用启动时的日志信息

### 问题：终端显示异常

**解决方案**：
1. 确保终端支持 ANSI 颜色
2. 尝试调整终端窗口大小
3. 使用现代终端模拟器（如 Windows Terminal、iTerm2 等）

### 问题：无法输入中文

**解决方案**：
blessed 对某些字符的支持可能有限。这是已知的限制，后续版本会改进。

## 下一步

- [ ] 集成 @agentic-os/core 的 Agent Bus
- [ ] 实现与 LLM 的实际对话
- [ ] 添加更多主题选项
- [ ] 支持多会话管理
- [ ] 添加命令历史记录

## 反馈

如有问题或建议，请提交 Issue 到项目仓库。

