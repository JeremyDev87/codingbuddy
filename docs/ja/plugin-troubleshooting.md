<p align="center">
  <a href="../plugin-troubleshooting.md">English</a> |
  <a href="../ko/plugin-troubleshooting.md">한국어</a> |
  <a href="../zh-CN/plugin-troubleshooting.md">中文</a> |
  <a href="plugin-troubleshooting.md">日本語</a> |
  <a href="../es/plugin-troubleshooting.md">Español</a> |
  <a href="../pt-BR/plugin-troubleshooting.md">Português</a>
</p>

# CodingBuddy トラブルシューティングガイド

CodingBuddy Claude Code プラグイン使用時のよくある問題の解決策です。

## インストールの問題

### プラグインが Claude Code に表示されない

**症状**: インストール後、`claude plugin list` に codingbuddy が表示されない。

**解決策**:

1. **インストールが完了したか確認**
   ```bash
   # プラグインファイルが存在するか確認
   ls ~/.claude/plugins/codingbuddy/
   ```

2. **プラグインを再インストール**
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

3. **Claude Code のバージョンを確認**
   ```bash
   claude --version
   # プラグインシステムは Claude Code 1.0+ が必要
   ```

4. **Claude Code を再起動**
   ```bash
   # Claude Code を完全に終了して再起動
   claude
   ```

### npm インストールが失敗する

**症状**: `npm install -g codingbuddy-claude-plugin` がエラーで失敗する。

**解決策**:

1. **権限エラー（EACCES）**
   ```bash
   # オプション A: Node バージョンマネージャーを使用
   # nvm をインストールしてから:
   nvm install --lts
   npm install -g codingbuddy-claude-plugin

   # オプション B: npm のプレフィックスを修正
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g codingbuddy-claude-plugin
   ```

2. **ネットワークエラー**
   ```bash
   # npm レジストリを確認
   npm config get registry
   # https://registry.npmjs.org/ であるべき

   # 詳細ログで再試行
   npm install -g codingbuddy-claude-plugin --verbose
   ```

3. **Node のバージョンが古い**
   ```bash
   node --version
   # Node.js 18+ が必要
   # 必要に応じて Node.js を更新
   ```

---

## マーケットプレイスの問題

### 「Invalid marketplace schema」エラー

**症状**: `claude marketplace add` 実行時に以下のエラーが発生：
```
✘ Failed to add marketplace: Invalid marketplace schema from URL: : Invalid input: expected object, received string
```

**原因**: GitHub リポジトリ形式ではなく URL 形式を使用している。

**解決方法**:
```bash
# 間違い（URL 形式 - 非推奨）
claude marketplace add https://jeremydev87.github.io/codingbuddy

# 正しい（GitHub リポジトリ形式）
claude marketplace add JeremyDev87/codingbuddy
```

### URL 形式からの移行

以前 URL 形式でマーケットプレイスを追加した場合：

```bash
# 1. 古いマーケットプレイスを削除
claude marketplace remove https://jeremydev87.github.io/codingbuddy

# 2. 正しい形式で追加
claude marketplace add JeremyDev87/codingbuddy

# 3. プラグインを再インストール
claude plugin install codingbuddy@jeremydev87
```

### マーケットプレイスが見つからない

**症状**: `claude marketplace add JeremyDev87/codingbuddy` 実行時に「not found」エラー

**解決方法**:

1. **スペルと大文字小文字を確認**
   - GitHub ユーザー名: `JeremyDev87`（大文字小文字を区別）
   - リポジトリ: `codingbuddy`

2. **ネットワーク接続を確認**
   ```bash
   curl -I https://github.com/JeremyDev87/codingbuddy
   ```

3. **Claude Code を更新**
   ```bash
   npm update -g @anthropic-ai/claude-code
   ```

---

## MCP 接続の問題

### MCP サーバーが接続されない

**症状**: ワークフローコマンド（PLAN、ACT、EVAL）が正しく動作しない、エージェントが表示されない。

**診断**:
```bash
# codingbuddy CLI がインストールされているか確認
which codingbuddy
codingbuddy --version

# MCP 設定を確認
cat ~/.claude/settings.json | grep -A5 codingbuddy
```

**解決策**:

1. **MCP サーバーをインストール**
   ```bash
   npm install -g codingbuddy
   ```

2. **MCP 設定を追加**

   `~/.claude/settings.json` を編集:
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

3. **Claude Code を再起動**
   ```bash
   # 終了して再起動
   claude
   ```

### MCP ツールが利用できない

**症状**: `/mcp` コマンドで CodingBuddy ツールが表示されない。

**解決策**:

1. **MCP サーバーが動作しているか確認**
   ```bash
   # 別のターミナルで実行:
   codingbuddy
   # エラーなく起動するはず
   ```

2. **PATH に codingbuddy が含まれているか確認**
   ```bash
   echo $PATH
   which codingbuddy
   # 見つからない場合は PATH に追加
   ```

3. **競合する MCP サーバーを確認**
   ```bash
   cat ~/.claude/settings.json
   # codingbuddy の重複エントリがないことを確認
   ```

### "Command not found: codingbuddy"

**症状**: MCP が `codingbuddy` を実行しようとするが見つからない。

**解決策**:

1. **グローバル npm bin を PATH に追加**
   ```bash
   # npm の場合
   export PATH="$(npm config get prefix)/bin:$PATH"

   # yarn の場合
   export PATH="$(yarn global bin):$PATH"
   ```

2. **MCP 設定で絶対パスを使用**
   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "/usr/local/bin/codingbuddy",
         "args": []
       }
     }
   }
   ```

---

## ワークフローの問題

### PLAN/ACT/EVAL キーワードが認識されない

**症状**: "PLAN implement X" と入力してもワークフローモードがトリガーされない。

**解決策**:

1. **キーワードがメッセージの先頭にあるか確認**
   ```
   # 正しい
   PLAN implement user login

   # 間違い - キーワードが先頭にない
   Can you PLAN implement user login
   ```

2. **大文字またはローカライズキーワードを使用**
   ```
   PLAN ...
   계획 ...  (Korean)
   計画 ...  (Japanese)
   ```

3. **MCP が接続されているか確認**
   - `/mcp` と入力して利用可能なツールを確認
   - `parse_mode` ツールが表示されるはず

### コンテキストが永続化されない

**症状**: ACT モードが PLAN の決定事項を覚えていない。

**解決策**:

1. **コンテキストファイルが存在するか確認**
   ```bash
   cat docs/codingbuddy/context.md
   ```

2. **PLAN が正しく完了したことを確認**
   - PLAN モードがコンテキストファイルを作成
   - 中断された場合は PLAN から再開

3. **ファイル権限を確認**
   ```bash
   ls -la docs/codingbuddy/
   # 書き込み権限があることを確認
   ```

### AUTO モードが停止しない

**症状**: 問題が修正されても AUTO モードがイテレーションを続ける。

**解決策**:

1. **イテレーション制限を確認**
   - デフォルトは 5 回のイテレーション
   - AUTO は Critical=0 かつ High=0 で停止

2. **EVAL の発見事項を確認**
   - 繰り返し発生する問題がある可能性
   - 症状ではなく根本原因に対処

3. **手動介入**
   - 任意のメッセージを入力して AUTO を中断
   - 発見事項を確認し、必要に応じて再開

---

## パフォーマンスの問題

### レスポンスが遅い

**症状**: ワークフローモードで Claude のレスポンスに時間がかかる。

**解決策**:

1. **タスクを簡素化**
   - 複雑なタスクを小さなチャンクに分割
   - 一度に 1 つの機能に対して PLAN を使用

2. **スペシャリストエージェントを減らす**
   - `codingbuddy.config.json` でスペシャリストを減らす設定
   ```javascript
   module.exports = {
     specialists: ['security-specialist']  // 必須のものだけ
   };
   ```

3. **コンテキストサイズを確認**
   - 大きなコンテキストファイルは処理を遅くする
   - 新機能では新しい PLAN を開始

### トークン使用量が多い

**症状**: コンテキスト制限にすぐ達する。

**解決策**:

1. **フォーカスしたプロンプトを使用**
   ```
   # より良い
   PLAN add email validation to registration

   # 効率が低い
   PLAN review the entire auth module and add validation
   ```

2. **コンテキストを自然にコンパクト化させる**
   - Claude Code は自動的に古いコンテキストを要約
   - 以前のコンテキストを手動で繰り返さない

---

## 設定の問題

### プロジェクト設定が読み込まれない

**症状**: `codingbuddy.config.json` の設定が適用されない。

**解決策**:

1. **ファイルの場所を確認**
   - プロジェクトルートにある必要がある
   - 正確に `codingbuddy.config.json` という名前

2. **構文を検証**
   ```bash
   node -e "console.log(require('./codingbuddy.config.json'))"
   ```

3. **エクスポート形式を確認**
   ```javascript
   // 正しい
   module.exports = { language: 'ja' };

   // 間違い
   export default { language: 'ja' };
   ```

### 間違った言語でレスポンスが返る

**症状**: Claude が間違った言語でレスポンスする。

**解決策**:

1. **設定で言語を指定**
   ```javascript
   // codingbuddy.config.json
   module.exports = {
     language: 'ja'  // 'en', 'ko', 'ja', 'zh', 'es'
   };
   ```

2. **環境変数を使用**
   ```bash
   export CODINGBUDDY_LANGUAGE=ja
   ```

3. **ローカライズキーワードを使用**
   - 日本語で始める: `計画 ユーザーログインを実装`
   - Claude は日本語でレスポンスする

---

## デバッグモード

### 詳細ログを有効化

詳細なデバッグのため:

```bash
# デバッグ出力付きで MCP サーバーを実行
CODINGBUDDY_DEBUG=true codingbuddy
```

### MCP 通信を確認

```bash
# Claude Code で MCP ステータスを確認
/mcp

# 以下が表示されるはず:
# - codingbuddy サーバーステータス
# - 利用可能なツール
# - 最後のエラー（あれば）
```

### コンテキストドキュメントを確認

```bash
# 永続化されているコンテキストを確認
cat docs/codingbuddy/context.md

# 確認事項:
# - 以前の PLAN の決定事項
# - ACT の進捗
# - EVAL の発見事項
```

---

## ヘルプを得る

### 問題を報告

1. **GitHub Issues**: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

2. **レポートに含める内容**:
   - Claude Code バージョン (`claude --version`)
   - プラグインバージョン（plugin.json から）
   - MCP サーバーバージョン (`codingbuddy --version`)
   - 再現手順
   - エラーメッセージ

### ドキュメントを確認

- [インストールガイド](./plugin-guide.md)
- [アーキテクチャ](./plugin-architecture.md)
- [FAQ](./plugin-faq.md)

---

## クイック診断チェックリスト

```
[ ] Node.js 18+ がインストールされている
[ ] Claude Code 1.0+ がインストールされている
[ ] `claude plugin list` でプラグインが表示される
[ ] MCP サーバーがインストールされている (`which codingbuddy`)
[ ] settings.json に MCP 設定がある
[ ] `/mcp` でツールが確認できる
[ ] PLAN キーワードでモードがトリガーされる
[ ] PLAN 後にコンテキストファイルが作成される
```

---

<sub>🤖 このドキュメントはAIの支援を受けて翻訳されました。誤りや改善点があれば、[GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)にてお知らせください。</sub>
