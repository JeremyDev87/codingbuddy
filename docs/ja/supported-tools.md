<p align="center">
  <a href="../supported-tools.md">English</a> |
  <a href="../ko/supported-tools.md">한국어</a> |
  <a href="../zh-CN/supported-tools.md">中文</a> |
  <a href="supported-tools.md">日本語</a> |
  <a href="../es/supported-tools.md">Español</a>
</p>

# 対応AIツール

Codingbuddyは統一されたルールシステムを通じて複数のAIコーディングアシスタントと連携します。

## 概要

| ツール | 統合方法 | セットアップガイド |
|--------|----------|-------------------|
| [Claude Code](#claude-code) | MCPサーバー | [ガイド](../../packages/rules/.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Rulesディレクトリ | [ガイド](../../packages/rules/.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Instructionsファイル | [ガイド](../../packages/rules/.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Configディレクトリ | [ガイド](../../packages/rules/.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Rulesディレクトリ | [ガイド](../../packages/rules/.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Specディレクトリ | [ガイド](../../packages/rules/.ai-rules/adapters/kiro.md) |

## Claude Code

**統合方法**: MCP（Model Context Protocol）サーバー

Claude CodeはMCPを通じて接続し、プロジェクト設定、ルール、スペシャリストエージェントへの完全なアクセスを提供します。

### クイックセットアップ

1. Claude Desktop設定に追加：

   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

2. Claude Desktopを再起動

### 機能

- 完全なMCPリソースアクセス（設定、ルール、エージェント）
- ツール呼び出し（search_rules、get_agent_details、parse_mode）
- プロンプトテンプレート（activate_agent）

[完全なガイド](../../packages/rules/.ai-rules/adapters/claude-code.md)

## Cursor

**統合方法**: Rulesディレクトリ

Cursorはプロジェクト固有の指示に`.cursor/rules/`を使用します。

### クイックセットアップ

1. `.cursor/rules/`ディレクトリを作成
2. 共通ルールを参照：

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# プロジェクトルール

`packages/rules/.ai-rules/`の共通ルールに従います：

- ワークフロー: @packages/rules/.ai-rules/rules/core.md
- 品質: @packages/rules/.ai-rules/rules/augmented-coding.md
- コンテキスト: @packages/rules/.ai-rules/rules/project.md
```

### 機能

- `@`構文でファイル参照
- プロジェクト固有のカスタマイズ
- ファイル参照を通じたエージェントコンテキスト

[完全なガイド](../../packages/rules/.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**統合方法**: Instructionsファイル

GitHub Copilotはカスタム指示に`.github/copilot-instructions.md`を使用します。

### クイックセットアップ

1. Instructionsファイルを作成：

```markdown
<!-- .github/copilot-instructions.md -->

# コーディング標準

`packages/rules/.ai-rules/rules/`のガイドラインに従います：

## ワークフロー
core.mdで定義されたPLAN → ACT → EVALワークフローを使用

## コード品質
- TDDアプローチ（Red → Green → Refactor）
- TypeScript strictモード
- 80%以上のテストカバレッジ
```

### 機能

- Markdownベースの指示
- リポジトリ全体の設定
- チーム共有設定

[完全なガイド](../../packages/rules/.ai-rules/adapters/codex.md)

## Antigravity

**統合方法**: Configディレクトリ

Antigravity（Geminiベース）は設定に`.antigravity/`を使用します。

### クイックセットアップ

1. `.antigravity/rules/`ディレクトリを作成
2. ルール参照を追加：

```markdown
<!-- .antigravity/rules/project.md -->

# プロジェクトガイドライン

参照: packages/rules/.ai-rules/rules/core.md
参照: packages/rules/.ai-rules/rules/augmented-coding.md
```

### 機能

- Geminiモデル統合
- ルールファイル参照
- プロジェクトコンテキスト認識

[完全なガイド](../../packages/rules/.ai-rules/adapters/antigravity.md)

## Amazon Q

**統合方法**: Rulesディレクトリ

Amazon Q Developerはカスタムルールに`.q/rules/`を使用します。

### クイックセットアップ

1. `.q/rules/`ディレクトリを作成
2. 統合ルールを追加：

```markdown
<!-- .q/rules/codingbuddy.md -->

# 開発標準

一貫したコーディングプラクティスのためにpackages/rules/.ai-rules/に従います。

主要ファイル：
- packages/rules/.ai-rules/rules/core.md（ワークフロー）
- packages/rules/.ai-rules/rules/augmented-coding.md（TDD）
```

### 機能

- AWS統合
- エンタープライズ機能
- カスタムルールサポート

[完全なガイド](../../packages/rules/.ai-rules/adapters/q.md)

## Kiro

**統合方法**: Specディレクトリ

Kiroは仕様とステアリングファイルに`.kiro/`を使用します。

### クイックセットアップ

1. `.kiro/steering/`ディレクトリを作成
2. ステアリングファイルを追加：

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# プロジェクトステアリング

packages/rules/.ai-rules/のルールを適用：
- ワークフローモード（PLAN/ACT/EVAL）
- TDD開発
- コード品質標準
```

### 機能

- 仕様駆動開発
- ステアリングファイルシステム
- タスク管理統合

[完全なガイド](../../packages/rules/.ai-rules/adapters/kiro.md)

## 新しいツールの追加

Codingbuddyは追加のAIツールをサポートするよう設計されています：

1. `packages/rules/.ai-rules/adapters/{tool}.md`にアダプターガイドを作成
2. `.{tool}/`ツールディレクトリを作成
3. `packages/rules/.ai-rules/`の共通ルールを参照

詳細は[貢献ガイド](../../CONTRIBUTING.md)を参照してください。

## 比較

| 機能 | Claude | Cursor | Copilot | Antigravity | Q | Kiro |
|------|--------|--------|---------|-------------|---|------|
| MCPサポート | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ファイル参照 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| エージェント有効化 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| プロジェクト設定 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |

✅ 完全サポート | ⚠️ 部分サポート（ファイル参照経由） | ❌ 非対応

## 次のステップ

- [はじめに](./getting-started.md) - 初期セットアップ
- [設計思想](./philosophy.md) - 設計原則
- [APIリファレンス](../api.md) - MCP機能
