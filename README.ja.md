<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**すべてのAIアシスタントで統一されたAIコーディングルールの単一ソース。**

Codingbuddyは、Cursor、Claude Code、GitHub Copilotなどと連携する統合ルールシステムを提供し、チーム全体がどのAIツールを使用しても同じコーディング標準に従うことができます。

## なぜCodingbuddyなのか？

- **一貫性**: すべてのAIツールが同一のコーディング標準に従う
- **単一ソース**: ルールを一度更新すれば、すべてのツールに反映
- **ベンダーロックインなし**: AI非依存のルールがあらゆるアシスタントと連携
- **構造化されたワークフロー**: PLAN → ACT → EVAL 開発サイクル

## クイックスタート

```bash
# プロジェクトを初期化（コードベースを分析して設定を作成）
npx codingbuddy init

# AIツールに追加（例：Claude Desktop）
# 他のAIツールについてはdocs/supported-tools.mdを参照
```

Claude Desktop設定に追加（`~/Library/Application Support/Claude/claude_desktop_config.json`）：

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

[詳細なセットアップガイド →](docs/ja/getting-started.md)

## 対応AIツール

| ツール | ステータス |
|--------|------------|
| Claude Code | ✅ 完全なMCPサポート |
| Cursor | ✅ 対応 |
| GitHub Copilot | ✅ 対応 |
| Antigravity | ✅ 対応 |
| Amazon Q | ✅ 対応 |
| Kiro | ✅ 対応 |

[セットアップガイド →](docs/ja/supported-tools.md)

## ドキュメント

| ドキュメント | 説明 |
|--------------|------|
| [はじめに](docs/ja/getting-started.md) | インストールとクイックセットアップ |
| [設計思想](docs/ja/philosophy.md) | ビジョンと設計原則 |
| [対応ツール](docs/ja/supported-tools.md) | AIツール統合ガイド |
| [設定リファレンス](docs/config-schema.md) | 設定ファイルオプション |
| [APIリファレンス](docs/api.md) | MCPサーバー機能 |
| [開発ガイド](docs/development.md) | 貢献とローカルセットアップ |

## 仕組み

```
packages/rules/.ai-rules/  ← 共有ルール（単一ソース）
├── rules/                 ← コアルール（ワークフロー、品質）
├── agents/                ← スペシャリスト専門知識（セキュリティ、パフォーマンスなど）
└── adapters/              ← ツール固有の統合ガイド

.cursor/                   ← Cursorがpackages/rules/.ai-rules/を参照
.claude/                   ← Claude Codeがpackages/rules/.ai-rules/を参照
.codex/                    ← GitHub Copilotがpackages/rules/.ai-rules/を参照
...
```

すべてのAIツール設定が同じ`packages/rules/.ai-rules/`ディレクトリを参照します。ルールを一度変更すれば、すべてのツールが更新された標準に従います。

## コントリビューション

貢献を歓迎します！ガイドラインについては[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

## ライセンス

MIT © [Codingbuddy](https://github.com/Codingbuddydev)
