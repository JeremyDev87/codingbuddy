<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/ai-rules-architecture.svg" alt="Codingbuddy AI Rules Architecture" width="800"/>
</p>

**所有 AI 编程助手的统一规则系统**

Codingbuddy 提供了一个统一的规则系统，适用于 Cursor、Claude Code、GitHub Copilot 等多种 AI 工具。无论团队使用哪种 AI 工具，都可以遵循相同的编码标准。

## 为什么选择 Codingbuddy？

- **一致性**：所有 AI 工具遵循相同的编码标准
- **单一数据源**：只需更新一次规则，所有工具自动生效
- **无供应商锁定**：与 AI 无关的规则，兼容任何助手
- **结构化工作流**：PLAN → ACT → EVAL 开发周期

## 快速开始

```bash
# 初始化项目（无需 API 密钥）
npx codingbuddy init

# 可选：AI 驱动的初始化，进行更深入的分析
# npx codingbuddy init --ai  # 需要 ANTHROPIC_API_KEY

# 添加到您的 AI 工具（示例：Claude Desktop）
# 其他 AI 工具请参阅 docs/zh-CN/supported-tools.md
```

添加到 Claude Desktop 配置文件（`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

[完整入门指南 →](docs/zh-CN/getting-started.md)

## 支持的 AI 工具

| 工具 | 状态 |
|------|------|
| Claude Code | ✅ 完整 MCP 支持 |
| Cursor | ✅ 支持 |
| GitHub Copilot | ✅ 支持 |
| Antigravity | ✅ 支持 |
| Amazon Q | ✅ 支持 |
| Kiro | ✅ 支持 |
| OpenCode | ✅ 支持 |

[设置指南 →](docs/zh-CN/supported-tools.md)

## 文档

| 文档 | 描述 |
|------|------|
| [快速开始](docs/zh-CN/getting-started.md) | 安装和快速设置 |
| [设计理念](docs/zh-CN/philosophy.md) | 愿景和设计原则 |
| [支持的工具](docs/zh-CN/supported-tools.md) | AI 工具集成指南 |
| [配置](docs/config-schema.md) | 配置文件选项 |
| [API 参考](docs/api.md) | MCP 服务器功能 |
| [开发指南](docs/development.md) | 贡献和本地设置 |

## 工作原理

请参阅上方架构图，了解三层代理系统的完整概览：

- **Layer 1（模式代理）**：PLAN → ACT → EVAL 工作流程循环
- **Layer 2（主要代理）**：Solution Architect、Technical Planner、Frontend/Backend/Mobile/Data Developer、Tooling Engineer、Agent Architect、Code Reviewer、DevOps
- **Layer 3（专家）**：10位领域专家（安全、性能、可访问性、i18n等）
- **技能**：可复用功能（TDD、调试、头脑风暴等）

所有 AI 工具配置都引用同一个 `packages/rules/.ai-rules/` 目录。只需修改一次规则，所有工具都会遵循更新后的标准。

## 贡献

欢迎贡献！详情请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
