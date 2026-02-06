<p align="center">
  <a href="../plugin-faq.md">English</a> |
  <a href="../ko/plugin-faq.md">한국어</a> |
  <a href="plugin-faq.md">中文</a> |
  <a href="../ja/plugin-faq.md">日本語</a> |
  <a href="../es/plugin-faq.md">Español</a> |
  <a href="../pt-BR/plugin-faq.md">Português</a>
</p>

# CodingBuddy 常见问题

关于 CodingBuddy Claude Code 插件的常见问题解答。

## 一般问题

### CodingBuddy 是什么？

CodingBuddy 是一个多 AI 规则系统，为 AI 助手提供一致的编码实践。它包括：

- **工作流模式**：PLAN/ACT/EVAL/AUTO 用于结构化开发
- **专家代理**：12+ 个领域专家（安全、性能、无障碍等）
- **技能**：可重用工作流（TDD、调试、API 设计等）
- **检查清单**：领域特定的质量检查

### 插件是必需的吗？

**不是**，但推荐使用。您可以通过两种方式使用 CodingBuddy：

1. **插件 + MCP 服务器**（推荐）：与 Claude Code 完全集成
2. **仅 MCP 服务器**：手动配置，功能相同

插件提供：
- 自动命令文档
- 更简单的设置
- 与 Claude Code 更好的集成

### 插件和 MCP 服务器有什么区别？

| 组件 | 用途 |
|-----------|---------|
| **插件** | Claude Code 的入口点（清单 + 配置） |
| **MCP 服务器** | 实际功能（工具、代理、技能） |

插件是一个轻量级包装器，告诉 Claude Code 如何连接到 MCP 服务器。

### 它能与其他 AI 工具一起使用吗？

可以！CodingBuddy 支持多个 AI 助手：

- **Claude Code**：完整的插件支持
- **Cursor**：通过 `.cursor/rules/` 配置
- **GitHub Copilot**：通过 `.codex/` 配置
- **Amazon Q**：通过 `.q/` 配置
- **Kiro**：通过 `.kiro/` 配置

所有工具共享来自 `packages/rules/.ai-rules/` 的相同规则。

---

## 安装问题

### 如何安装插件？

```bash
# 1. 添加市场
claude marketplace add JeremyDev87/codingbuddy

# 2. 安装插件
claude plugin install codingbuddy@jeremydev87

# 3. 安装 MCP 服务器
npm install -g codingbuddy
```

详细说明请参阅[安装指南](./plugin-guide.md)。

### 我需要同时安装插件和 MCP 服务器吗？

**是的**，要获得完整功能：

- **插件**：Claude Code 集成所需
- **MCP 服务器**：工具和代理所需

没有 MCP 服务器的插件功能有限。

### 如何更新插件？

```bash
# 更新插件
claude plugin update codingbuddy

# 更新 MCP 服务器
npm update -g codingbuddy
```

### 可以不使用全局 npm 安装吗？

可以，使用 npx：

```json
// .mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy"]
    }
  }
}
```

---

## 工作流问题

### PLAN 和 AUTO 有什么区别？

| 模式 | 控制 | 迭代 | 使用场景 |
|------|---------|------------|-------------|
| **PLAN** | 手动 | 1 | 当您想在执行前审查时 |
| **AUTO** | 自动 | 直到满足质量 | 用于带有质量门槛的完整功能 |

**PLAN** → 您审查 → **ACT** → 您审查 → **EVAL**（可选）

**AUTO** → 循环 PLAN→ACT→EVAL 直到 Critical=0, High=0

### 什么时候应该使用 EVAL？

在以下情况下使用 EVAL：
- 合并前的安全审计
- 无障碍审查
- 性能分析
- 代码质量评估

EVAL 是**可选的** - 仅在需要质量评估时使用。

### 可以在工作流中途切换模式吗？

可以，任何时候都可以触发任何模式：

```
PLAN implement feature   → 创建计划
ACT                      → 执行计划
PLAN refine approach     → 创建新计划（重置上下文）
ACT                      → 执行新计划
EVAL                     → 审查实现
```

### 上下文持久化如何工作？

上下文保存到 `docs/codingbuddy/context.md`：

- **PLAN**：重置上下文，创建新文件
- **ACT**：读取 PLAN 上下文，追加进度
- **EVAL**：读取所有上下文，追加发现

这在会话压缩后仍然保留，因此即使早期消息被摘要，ACT 也能访问 PLAN 决策。

### 有哪些本地化关键词？

| 英语 | 韩语 | 日语 | 中文 | 西班牙语 |
|---------|--------|----------|---------|---------|
| PLAN | 계획 | 計画 | 计划 | PLANIFICAR |
| ACT | 실행 | 実行 | 执行 | ACTUAR |
| EVAL | 평가 | 評価 | 评估 | EVALUAR |
| AUTO | 자동 | 自動 | 自动 | AUTOMATICO |

---

## 专家代理问题

### 有哪些专家代理可用？

**规划专家**：
- 🏛️ architecture-specialist
- 🧪 test-strategy-specialist
- 📨 event-architecture-specialist
- 🔗 integration-specialist
- 📊 observability-specialist
- 🔄 migration-specialist

**实现专家**：
- 📏 code-quality-specialist
- ⚡ performance-specialist
- 🔒 security-specialist
- ♿ accessibility-specialist
- 🔍 seo-specialist
- 🎨 ui-ux-designer

**开发者代理**：
- 🖥️ frontend-developer
- ⚙️ backend-developer
- 🔧 devops-engineer
- 📱 mobile-developer

### 代理是如何选择的？

代理基于以下因素选择：

1. **任务上下文**：您提示中的关键词
2. **模式**：PLAN vs ACT vs EVAL 使用不同的代理
3. **配置**：`codingbuddy.config.json` 中的自定义代理

### 可以使用多个代理吗？

可以，在 EVAL 模式下专家并行运行：

```
EVAL with security and accessibility focus
```

这会同时激活 security-specialist 和 accessibility-specialist。

### 如何查看代理详情？

使用 MCP 工具：

```
/mcp call get_agent_details --agentName security-specialist
```

---

## 配置问题

### 如何配置插件？

在您的项目根目录创建 `codingbuddy.config.json`：

```javascript
module.exports = {
  language: 'zh',
  defaultMode: 'PLAN',
  specialists: [
    'security-specialist',
    'accessibility-specialist'
  ]
};
```

### 有哪些可用的配置选项？

| 选项 | 类型 | 默认值 | 描述 |
|--------|------|---------|-------------|
| `language` | string | 自动检测 | 响应语言（en, ko, ja, zh, es） |
| `defaultMode` | string | PLAN | 起始工作流模式 |
| `specialists` | array | 全部 | 启用的专家代理 |

### 如何更改响应语言？

三种方式：

1. **配置文件**：
   ```javascript
   module.exports = { language: 'zh' };
   ```

2. **环境变量**：
   ```bash
   export CODINGBUDDY_LANGUAGE=zh
   ```

3. **使用本地化关键词**：
   ```
   计划 实现用户登录
   ```

---

## 故障排除问题

### 为什么工作流模式不起作用？

常见原因：

1. MCP 服务器未安装 → `npm install -g codingbuddy`
2. MCP 未配置 → 添加到 `~/.claude/settings.json`
3. 关键词不在开头 → 把 PLAN/ACT/EVAL 放在最前面

详细解决方案请参阅[故障排除指南](./plugin-troubleshooting.md)。

### 为什么上下文不持久化？

1. 检查 `docs/codingbuddy/context.md` 是否存在
2. PLAN 模式创建文件 - 始终从 PLAN 开始
3. 验证 docs 文件夹的写入权限

### 如何重置上下文？

开始新的 PLAN：

```
PLAN start fresh implementation
```

PLAN 模式会自动重置上下文文档。

### 在哪里可以报告 Bug？

GitHub Issues：[github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

请包含：
- 版本号（插件、MCP 服务器、Claude Code）
- 重现步骤
- 错误消息

---

## 最佳实践

### 推荐的工作流是什么？

1. **从 PLAN 开始** - 实现前始终先规划
2. **使用具体的提示** - "implement X" 而非 "help with X"
3. **ACT 前审查** - 检查计划是否合理
4. **合并前 EVAL** - 获取质量评估
5. **复杂功能使用 AUTO** - 让循环运行

### 如何获得最佳结果？

1. **要具体**："Add JWT auth with refresh tokens" 而非 "add auth"
2. **提及关注点**："with focus on security" 激活专家
3. **分解大任务**：每个 PLAN 一个功能
4. **审查 EVAL 发现**：合并前解决问题

### 什么时候应该使用 TDD？

对以下内容使用 TDD（测试先行）：
- 业务逻辑
- 工具和辅助函数
- API 处理器
- 数据转换

对以下内容使用测试后行：
- UI 组件
- 视觉元素
- 布局

---

## 另请参阅

- [安装指南](./plugin-guide.md)
- [快速参考](./plugin-quick-reference.md)
- [架构](./plugin-architecture.md)
- [示例](./plugin-examples.md)
- [故障排除](./plugin-troubleshooting.md)

---

<sub>🤖 本文档由AI辅助翻译。如有错误或改进建议，请在 [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues) 中反馈。</sub>
