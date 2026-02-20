<p align="center">
  <a href="../plugin-faq.md">English</a> |
  <a href="../ko/plugin-faq.md">한국어</a> |
  <a href="../zh-CN/plugin-faq.md">中文</a> |
  <a href="plugin-faq.md">日本語</a> |
  <a href="../es/plugin-faq.md">Español</a> |
  <a href="../pt-BR/plugin-faq.md">Português</a>
</p>

# CodingBuddy FAQ

CodingBuddy Claude Code プラグインに関するよくある質問です。

## 一般的な質問

### CodingBuddy とは何ですか？

CodingBuddy は、AI アシスタント間で一貫したコーディングプラクティスを提供する Multi-AI ルールシステムです。以下が含まれます：

- **ワークフローモード**: 構造化された開発のための PLAN/ACT/EVAL/AUTO
- **スペシャリストエージェント**: 35 AI エージェント（セキュリティ、パフォーマンス、アクセシビリティなど）
- **スキル**: 再利用可能なワークフロー（TDD、デバッグ、API 設計など）
- **チェックリスト**: ドメイン固有の品質チェック

### プラグインは必須ですか？

**いいえ**、推奨ではありますが必須ではありません。CodingBuddy は 2 つの方法で使用できます：

1. **プラグイン + MCP サーバー**（推奨）: Claude Code との完全な統合
2. **MCP サーバーのみ**: 手動設定、同じ機能

プラグインは以下を提供します：
- 自動コマンドドキュメント
- 簡単なセットアップ
- Claude Code とのより良い統合

### プラグインと MCP サーバーの違いは何ですか？

| コンポーネント | 目的 |
|-----------|---------|
| **プラグイン** | Claude Code のエントリーポイント（マニフェスト + 設定） |
| **MCP サーバー** | 実際の機能（ツール、エージェント、スキル） |

プラグインは、Claude Code が MCP サーバーに接続する方法を伝える薄いラッパーです。

### 他の AI ツールでも動作しますか？

はい！CodingBuddy は複数の AI アシスタントをサポートしています：

- **Claude Code**: 完全なプラグインサポート
- **Cursor**: `.cursor/rules/` 設定経由
- **GitHub Copilot**: `.codex/` 設定経由
- **Amazon Q**: `.q/` 設定経由
- **Kiro**: `.kiro/` 設定経由

すべてのツールは `packages/rules/.ai-rules/` から同じルールを共有します。

---

## インストールに関する質問

### プラグインをインストールするには？

```bash
# 1. マーケットプレイスを追加
claude marketplace add JeremyDev87/codingbuddy

# 2. プラグインをインストール
claude plugin install codingbuddy@jeremydev87

# 3. MCP サーバーをインストール
npm install -g codingbuddy
```

詳細な手順は[インストールガイド](./plugin-guide.md)を参照してください。

### プラグインと MCP サーバーの両方をインストールする必要がありますか？

**はい**、完全な機能を利用するには：

- **プラグイン**: Claude Code 統合に必要
- **MCP サーバー**: ツールとエージェントに必要

MCP サーバーなしのプラグインは機能が制限されます。

### プラグインを更新するには？

```bash
# プラグインを更新
claude plugin update codingbuddy

# MCP サーバーを更新
npm update -g codingbuddy
```

### グローバル npm インストールなしで使用できますか？

はい、npx を使用します：

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

## ワークフローに関する質問

### PLAN と AUTO の違いは何ですか？

| モード | 制御 | イテレーション | 使用場面 |
|------|---------|------------|-------------|
| **PLAN** | 手動 | 1 | 実行前にレビューしたい場合 |
| **AUTO** | 自律 | 品質達成まで | 品質ゲート付きの完全な機能 |

**PLAN** → レビュー → **ACT** → レビュー → **EVAL**（オプション）

**AUTO** → Critical=0、High=0 になるまで PLAN→ACT→EVAL をループ

### EVAL を使用するタイミングは？

EVAL は以下が必要な場合に使用します：
- マージ前のセキュリティ監査
- アクセシビリティレビュー
- パフォーマンス分析
- コード品質評価

EVAL は**オプション**です - 品質評価が必要な場合のみ使用します。

### ワークフローの途中でモードを切り替えられますか？

はい、いつでも任意のモードをトリガーできます：

```
PLAN implement feature   → プランを作成
ACT                      → プランを実行
PLAN refine approach     → 新しいプランを作成（コンテキストをリセット）
ACT                      → 新しいプランを実行
EVAL                     → 実装をレビュー
```

### コンテキストの永続化はどのように機能しますか？

コンテキストは `docs/codingbuddy/context.md` に保存されます：

- **PLAN**: コンテキストをリセット、新しいファイルを作成
- **ACT**: PLAN コンテキストを読み、進捗を追加
- **EVAL**: すべてのコンテキストを読み、発見事項を追加

これは会話のコンパクション後も維持されるため、初期のメッセージが要約されても ACT は PLAN の決定事項にアクセスできます。

### ローカライズキーワードは何ですか？

| English | Korean | Japanese | Chinese | Spanish |
|---------|--------|----------|---------|---------|
| PLAN | 계획 | 計画 | 计划 | PLANIFICAR |
| ACT | 실행 | 実行 | 执行 | ACTUAR |
| EVAL | 평가 | 評価 | 评估 | EVALUAR |
| AUTO | 자동 | 自動 | 自动 | AUTOMÁTICO |

---

## スペシャリストエージェントに関する質問

### 利用可能なスペシャリストエージェントは？

**計画スペシャリスト**:
- 🏛️ architecture-specialist
- 🧪 test-strategy-specialist
- 📨 event-architecture-specialist
- 🔗 integration-specialist
- 📊 observability-specialist
- 🔄 migration-specialist

**実装スペシャリスト**:
- 📏 code-quality-specialist
- ⚡ performance-specialist
- 🔒 security-specialist
- ♿ accessibility-specialist
- 🔍 seo-specialist
- 🎨 ui-ux-designer

**開発者エージェント**:
- 🖥️ frontend-developer
- ⚙️ backend-developer
- 🔧 devops-engineer
- 📱 mobile-developer

### エージェントはどのように選択されますか？

エージェントは以下に基づいて選択されます：

1. **タスクコンテキスト**: プロンプト内のキーワード
2. **モード**: PLAN、ACT、EVAL で異なるエージェント
3. **設定**: `codingbuddy.config.json` のカスタムエージェント

### 複数のエージェントを使用できますか？

はい、EVAL モードではスペシャリストが並列で実行されます：

```
EVAL with security and accessibility focus
```

これにより security-specialist と accessibility-specialist の両方が有効化されます。

### エージェントの詳細を確認するには？

MCP ツールを使用します：

```
/mcp call get_agent_details --agentName security-specialist
```

---

## 設定に関する質問

### プラグインを設定するには？

プロジェクトルートに `codingbuddy.config.json` を作成：

```javascript
module.exports = {
  language: 'ja',
  defaultMode: 'PLAN',
  specialists: [
    'security-specialist',
    'accessibility-specialist'
  ]
};
```

### 利用可能な設定オプションは？

| オプション | 型 | デフォルト | 説明 |
|--------|------|---------|-------------|
| `language` | string | 自動検出 | レスポンス言語（en, ko, ja, zh, es） |
| `defaultMode` | string | PLAN | 開始ワークフローモード |
| `specialists` | array | all | 有効なスペシャリストエージェント |

### レスポンス言語を変更するには？

3 つの方法があります：

1. **設定ファイル**:
   ```javascript
   module.exports = { language: 'ja' };
   ```

2. **環境変数**:
   ```bash
   export CODINGBUDDY_LANGUAGE=ja
   ```

3. **ローカライズキーワードを使用**:
   ```
   計画 ユーザーログインを実装
   ```

---

## トラブルシューティングに関する質問

### ワークフローモードが動作しないのはなぜですか？

一般的な原因：

1. MCP サーバーがインストールされていない → `npm install -g codingbuddy`
2. MCP が設定されていない → `~/.claude/settings.json` に追加
3. キーワードが先頭にない → PLAN/ACT/EVAL を最初に置く

詳細な解決策は[トラブルシューティングガイド](./plugin-troubleshooting.md)を参照してください。

### コンテキストが永続化されないのはなぜですか？

1. `docs/codingbuddy/context.md` が存在するか確認
2. PLAN モードがファイルを作成 - 常に PLAN から開始
3. docs フォルダの書き込み権限を確認

### コンテキストをリセットするには？

新しい PLAN を開始します：

```
PLAN start fresh implementation
```

PLAN モードは自動的にコンテキストドキュメントをリセットします。

### バグはどこに報告できますか？

GitHub Issues: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

含める内容：
- バージョン番号（プラグイン、MCP サーバー、Claude Code）
- 再現手順
- エラーメッセージ

---

## ベストプラクティス

### 推奨ワークフローは？

1. **PLAN から始める** - 実装前に必ずプランを立てる
2. **具体的なプロンプトを使用** - "help with X" ではなく "implement X"
3. **ACT 前にレビュー** - プランが適切か確認
4. **マージ前に EVAL** - 品質評価を受ける
5. **複雑な機能には AUTO を使用** - サイクルを回す

### 最良の結果を得るには？

1. **具体的に**: "add auth" ではなく "Add JWT auth with refresh tokens"
2. **懸念事項を述べる**: "with focus on security" でスペシャリストを有効化
3. **大きなタスクを分割**: 1 つの PLAN に 1 つの機能
4. **EVAL の発見事項を確認**: マージ前に問題に対処

### TDD を使用するタイミングは？

TDD（テストファースト）を使用：
- ビジネスロジック
- ユーティリティとヘルパー
- API ハンドラ
- データ変換

テストアフターを使用：
- UI コンポーネント
- ビジュアル要素
- レイアウト

---

## 関連ドキュメント

- [インストールガイド](./plugin-guide.md)
- [クイックリファレンス](./plugin-quick-reference.md)
- [アーキテクチャ](./plugin-architecture.md)
- [使用例](./plugin-examples.md)
- [トラブルシューティング](./plugin-troubleshooting.md)

---

<sub>🤖 このドキュメントはAIの支援を受けて翻訳されました。誤りや改善点があれば、[GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)にてお知らせください。</sub>
