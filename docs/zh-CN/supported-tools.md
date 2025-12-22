<p align="center">
  <a href="../supported-tools.md">English</a> |
  <a href="../ko/supported-tools.md">한국어</a> |
  <a href="supported-tools.md">中文</a> |
  <a href="../ja/supported-tools.md">日本語</a> |
  <a href="../es/supported-tools.md">Español</a>
</p>

# 支持的 AI 工具

Codingbuddy 通过统一的规则系统与多个 AI 编程助手配合使用。

## 概览

| 工具 | 集成方式 | 设置指南 |
|------|----------|----------|
| [Claude Code](#claude-code) | MCP 服务器 | [指南](../../packages/rules/.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Rules 目录 | [指南](../../packages/rules/.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Instructions 文件 | [指南](../../packages/rules/.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Config 目录 | [指南](../../packages/rules/.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Rules 目录 | [指南](../../packages/rules/.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Spec 目录 | [指南](../../packages/rules/.ai-rules/adapters/kiro.md) |

## Claude Code

**集成方式**：MCP（模型上下文协议）服务器

Claude Code 通过 MCP 连接，提供对项目配置、规则和专家代理的完整访问。

### 快速设置

1. 添加到 Claude Desktop 配置：

   **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "npx",
         "args": ["codingbuddy-mcp"]
       }
     }
   }
   ```

2. 重启 Claude Desktop

### 功能

- 完整的 MCP 资源访问（配置、规则、代理）
- 工具调用（search_rules、get_agent_details、parse_mode）
- 提示模板（activate_agent）

[完整指南](../../packages/rules/.ai-rules/adapters/claude-code.md)

## Cursor

**集成方式**：Rules 目录

Cursor 使用 `.cursor/rules/` 进行项目特定的指令配置。

### 快速设置

1. 创建 `.cursor/rules/` 目录
2. 引用通用规则：

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# 项目规则

遵循 `packages/rules/.ai-rules/` 中的通用规则：

- 工作流：@packages/rules/.ai-rules/rules/core.md
- 质量：@packages/rules/.ai-rules/rules/augmented-coding.md
- 上下文：@packages/rules/.ai-rules/rules/project.md
```

### 功能

- 使用 `@` 语法引用文件
- 项目特定的自定义
- 通过文件引用访问代理上下文

[完整指南](../../packages/rules/.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**集成方式**：Instructions 文件

GitHub Copilot 使用 `.github/copilot-instructions.md` 进行自定义指令配置。

### 快速设置

1. 创建 instructions 文件：

```markdown
<!-- .github/copilot-instructions.md -->

# 编码标准

遵循 `packages/rules/.ai-rules/rules/` 中的指南：

## 工作流
使用 core.md 中定义的 PLAN → ACT → EVAL 工作流

## 代码质量
- TDD 方法（Red → Green → Refactor）
- TypeScript 严格模式
- 80%+ 测试覆盖率
```

### 功能

- 基于 Markdown 的指令
- 仓库范围的设置
- 团队共享配置

[完整指南](../../packages/rules/.ai-rules/adapters/codex.md)

## Antigravity

**集成方式**：Config 目录

Antigravity（基于 Gemini）使用 `.antigravity/` 进行配置。

### 快速设置

1. 创建 `.antigravity/rules/` 目录
2. 添加规则引用：

```markdown
<!-- .antigravity/rules/project.md -->

# 项目指南

引用：packages/rules/.ai-rules/rules/core.md
引用：packages/rules/.ai-rules/rules/augmented-coding.md
```

### 功能

- Gemini 模型集成
- 规则文件引用
- 项目上下文感知

[完整指南](../../packages/rules/.ai-rules/adapters/antigravity.md)

## Amazon Q

**集成方式**：Rules 目录

Amazon Q Developer 使用 `.q/rules/` 进行自定义规则配置。

### 快速设置

1. 创建 `.q/rules/` 目录
2. 添加整合规则：

```markdown
<!-- .q/rules/codingbuddy.md -->

# 开发标准

遵循 packages/rules/.ai-rules/ 以保持一致的编码实践。

关键文件：
- packages/rules/.ai-rules/rules/core.md（工作流）
- packages/rules/.ai-rules/rules/augmented-coding.md（TDD）
```

### 功能

- AWS 集成
- 企业功能
- 自定义规则支持

[完整指南](../../packages/rules/.ai-rules/adapters/q.md)

## Kiro

**集成方式**：Spec 目录

Kiro 使用 `.kiro/` 进行规范和引导文件配置。

### 快速设置

1. 创建 `.kiro/steering/` 目录
2. 添加引导文件：

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# 项目引导

应用 packages/rules/.ai-rules/ 中的规则：
- 工作流模式（PLAN/ACT/EVAL）
- TDD 开发
- 代码质量标准
```

### 功能

- 规范驱动开发
- 引导文件系统
- 任务管理集成

[完整指南](../../packages/rules/.ai-rules/adapters/kiro.md)

## 添加新工具

Codingbuddy 设计为支持额外的 AI 工具：

1. 在 `packages/rules/.ai-rules/adapters/{tool}.md` 创建适配器指南
2. 创建工具目录 `.{tool}/`
3. 引用 `packages/rules/.ai-rules/` 中的通用规则

详情请参阅[贡献指南](../../CONTRIBUTING.md)。

## 对比

| 功能 | Claude | Cursor | Copilot | Antigravity | Q | Kiro |
|------|--------|--------|---------|-------------|---|------|
| MCP 支持 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 文件引用 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| 代理激活 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| 项目配置 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |

✅ 完整支持 | ⚠️ 部分支持（通过文件引用） | ❌ 不支持

## 后续步骤

- [快速开始](./getting-started.md) - 初始设置
- [设计理念](./philosophy.md) - 设计原则
- [API 参考](../api.md) - MCP 功能
