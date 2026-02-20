<p align="center">
  <a href="../plugin-guide.md">English</a> |
  <a href="../ko/plugin-guide.md">한국어</a> |
  <a href="../zh-CN/plugin-guide.md">中文</a> |
  <a href="plugin-guide.md">日本語</a> |
  <a href="../es/plugin-guide.md">Español</a> |
  <a href="../pt-BR/plugin-guide.md">Português</a>
</p>

# Claude Code プラグイン インストール & セットアップガイド

**Codingbuddyは35の専門AIエージェントを調整し**、PLAN → ACT → EVALワークフローを通じて人間の専門家チームレベルのコード品質を提供します。

このガイドでは、CodingBuddy Claude Code プラグインのインストールと設定の手順を説明します。

## 前提条件

プラグインをインストールする前に、以下の環境を確認してください：

- **Node.js** 18.0 以上
- **Claude Code** CLI がインストールされ、認証済みであること
- **npm** または **yarn** パッケージマネージャー

環境を確認するには：

```bash
# Node.js バージョンを確認
node --version  # v18.0.0 以上であること

# Claude Code がインストールされているか確認
claude --version
```

## インストール方法

### 方法 1: Claude Code マーケットプレイス経由（推奨）

プラグインをインストールする最も簡単な方法：

```bash
# 1. マーケットプレイスを追加
claude marketplace add JeremyDev87/codingbuddy

# 2. プラグインをインストール
claude plugin install codingbuddy@jeremydev87
```

> **移行に関する注意**: 以前 `claude marketplace add https://jeremydev87.github.io/codingbuddy` を使用していた場合は、古いマーケットプレイスを削除し、上記の GitHub リポジトリ形式を使用してください。URL 形式は非推奨です。

これにより自動的に：
- 最新バージョンのプラグインをダウンロード
- Claude Code に登録
- MCP 設定を構成

### 方法 2: npm 経由

インストールをより細かく制御したい場合：

```bash
# グローバルインストール
npm install -g codingbuddy-claude-plugin

# または yarn の場合
yarn global add codingbuddy-claude-plugin
```

## MCP サーバーセットアップ（必須）

プラグインの全機能を利用するには、CodingBuddy MCP サーバーが必要です。MCP サーバーは以下を提供します：

- スペシャリストエージェントとスキル
- ワークフローモード（PLAN/ACT/EVAL/AUTO）
- コンテキストに応じたチェックリスト
- セッション管理

### MCP サーバーのインストール

```bash
npm install -g codingbuddy
```

### Claude Code の設定

MCP サーバーを Claude Code の設定に追加します：

**オプション A: グローバル設定**

`~/.claude/settings.json` を編集：

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

**オプション B: プロジェクトレベル設定**

プロジェクトルートに `.mcp.json` を作成：

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

## インストールの確認

### ステップ 1: プラグインが登録されているか確認

```bash
claude plugin list
```

リストに `codingbuddy` が表示されるはずです。

### ステップ 2: MCP 接続のテスト

Claude Code を起動し、ワークフローコマンドを試します：

```bash
claude

# Claude Code 内で以下を入力：
PLAN implement a user login feature
```

正しく設定されていれば、以下が表示されます：
- モード表示: `# Mode: PLAN`
- エージェント有効化メッセージ
- 構造化されたプラン出力

### ステップ 3: MCP ツールの確認

Claude Code で利用可能なツールを確認します：

```
/mcp
```

以下のような CodingBuddy ツールが表示されるはずです：
- `parse_mode`
- `get_agent_details`
- `generate_checklist`
- `read_context`
- `update_context`

## インストールのトラブルシューティング

### プラグインが表示されない

**症状**: `claude plugin list` に codingbuddy が表示されない

**解決策**:
1. プラグインを再インストール：
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

2. Claude Code のバージョンを確認：
   ```bash
   claude --version
   # 必要に応じて更新
   npm update -g @anthropic-ai/claude-code
   ```

### MCP サーバーが接続されない

**症状**: ワークフローコマンドが動作しない、エージェントが有効化されない

**解決策**:
1. codingbuddy がグローバルにインストールされているか確認：
   ```bash
   which codingbuddy  # パスが表示されるはず
   codingbuddy --version
   ```

2. MCP 設定を確認：
   ```bash
   cat ~/.claude/settings.json
   # mcpServers セクションが存在するか確認
   ```

3. Claude Code を再起動：
   ```bash
   # 終了して再起動
   claude
   ```

### 権限エラー

**症状**: インストールが EACCES または permission denied で失敗

**解決策**:
1. npm の権限を修正：
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. または Node バージョンマネージャー（nvm, fnm）を使用

### バージョンの不一致

**症状**: 機能が期待通りに動作しない

**解決策**:
1. 両方のパッケージを更新：
   ```bash
   npm update -g codingbuddy codingbuddy-claude-plugin
   ```

2. バージョンが一致しているか確認：
   ```bash
   codingbuddy --version
   # プラグインのバージョンは Claude Code 起動時に表示
   ```

## 設定オプション

### プロジェクトレベル設定

プロジェクトルートに `codingbuddy.config.json` を作成：

```javascript
module.exports = {
  // レスポンスの言語（デフォルトは自動検出）
  language: 'ja',  // 'en', 'ko', 'ja', 'zh', 'es'

  // デフォルトのワークフローモード
  defaultMode: 'PLAN',

  // 有効なスペシャリストエージェント
  specialists: [
    'security-specialist',
    'accessibility-specialist',
    'performance-specialist'
  ]
};
```

### 環境変数

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `CODINGBUDDY_LANGUAGE` | レスポンス言語 | 自動検出 |
| `CODINGBUDDY_DEBUG` | デバッグログを有効化 | false |

## 次のステップ

インストール後、以下を参照してください：

- [クイックリファレンス](./plugin-quick-reference.md) - コマンドとワークフローの概要
- [プラグインアーキテクチャ](./plugin-architecture.md) - プラグインの仕組み
- [使用例](./plugin-examples.md) - 実際のワークフロー例
- [FAQ](./plugin-faq.md) - よくある質問

## プラグインの更新

### Claude Code 経由で更新

```bash
claude plugin update codingbuddy
```

### npm 経由で更新

```bash
npm update -g codingbuddy codingbuddy-claude-plugin
```

## アンインストール

### プラグインの削除

```bash
claude plugin remove codingbuddy
```

### MCP サーバーの削除

```bash
npm uninstall -g codingbuddy
```

### 設定のクリーンアップ

以下から `codingbuddy` エントリを削除：
- `~/.claude/settings.json`（グローバル）
- `.mcp.json`（プロジェクトレベル）

---

<sub>🤖 このドキュメントはAIの支援を受けて翻訳されました。誤りや改善点があれば、[GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)にてお知らせください。</sub>
