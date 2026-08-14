# Next.js + Claude Code プロジェクトテンプレート

Claude Code での開発に最適化された Next.js プロジェクトテンプレート。

## 含まれるもの

### Claude Code 設定
- **CLAUDE.md** — プロジェクトルール（設計・実装フロー、規模判定、報告フォーマット等）
- **.claude/rules/** — パス条件付きルール（`paths:` に一致するファイルを読んだ時点で自動ロード）
- **.claude/settings.json** — フック定義（型チェック / DBバックアップ / 設計書同期チェック）
- **.claude/hooks/** — フックスクリプト（Node.js）
- **.claude/statusline.js** — ステータス行（モデル / ブランチ / コンテキスト使用率 / 未コミット・未プッシュ数）
- **.claude/agents/** — エージェント定義（browser-tester, code-reviewer, coding-specialist, documentation-manager, product-advisor）
- **.claude/skills/** — スキル定義（下表）
- **.mcp.json** — MCP サーバー定義（Playwright）

| スキル | 用途 |
|--------|------|
| `/new-feature` | 機能設計書をテンプレートから作成 |
| `/design-review` | 設計レビュー（`feature` = Stage 1 / `tech` = Stage 2） |
| `/review-impl` | 実装コードのレビュー＋指摘対応 |
| `/browser-test` | ブラウザでの動作確認・UX評価 |
| `/build-check` | ビルド + lint の一括実行 |
| `/update-docs` | 実装変更に基づく設計書の更新 |
| `/sync-check` | 設計書 ↔ 実装の網羅的な突き合わせ |
| `/complete-feature` | 機能設計書の完了処理（`completed/` へ移動） |
| `/pre-push-check` | push 前の設計書同期チェック |
| `/done` | 完了報告の出力 |

| ルール | 発火条件 |
|--------|---------|
| `typescript.md` | `src/**/*.{ts,tsx}` |
| `react-nextjs.md` | `src/features/**/*.tsx`, `src/components/**/*.tsx`, `src/app/**/*.tsx` |
| `api.md` | `src/app/api/**`, `src/features/**/hooks/**`, `src/lib/services/**` |
| `prisma.md` | `prisma/schema.prisma`, `tools/export-to-sql.ts` |
| `tools-scripts.md` | `tools/**` |
| `docs.md` | `docs/features/**`, `docs/設計書/**` |

### 技術ドキュメント
- **.claude/01_development_docs/** — 技術設計書テンプレート（アーキテクチャ、DB、API、エラー処理、型定義、サービス、フック、AIプロンプト、開発フローと規模判定）
- **.claude/02_design_system/** — デザインシステムテンプレート
- **.claude/03_library_docs/** — ライブラリガイド（Next.js 16, Zustand 5, NextAuth 4）
- **.claude/skills/browser-test/checklist.md** — ブラウザテストの共通チェックリスト（スキル同梱）

### 設計書テンプレート
- **docs/設計書/** — API一覧、テーブル定義書、ER図、サービス一覧、フック一覧、対応表、同期記録（`.doc-sync.md`）
- **docs/features/** — 機能設計書テンプレート（`TEMPLATE.md` / `completed/` / `pending/`）
- **docs/reviews/** — レビュー結果の保存先
- **docs/guide/** — 運用ガイド・手順書
  - バイブコーディング入門 / 運用 — 開発フローとスキルの使い方
  - プロジェクト作成手順 — 本テンプレートから新規プロジェクトを作る
  - 派生プロジェクト適用手順 — 既存の派生プロジェクトにテンプレートの改善を反映する
  - サンドボックス環境移行 — WSL / Dev Container と権限モード戦略
  - 共有VPS_DBセットアップ — PgBouncer 経由の DB 接続
  - オプションMCP追加 / アプリ集計サマリー
- **docs/diagrams/** — 役割比較図・開発フロー図・アーキテクチャ図

### ツール
- **tools/export-to-sql.ts** — DB バックアップツール（テーブル定義を設定して使用）
- **tools/scripts/generate-table-docs.ts** — `prisma/schema.prisma` からテーブル定義書を自動生成

## 前提スタック

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- TailwindCSS 4 + Zustand 5
- Prisma 6 (PostgreSQL) + NextAuth 4

## Dev Container での開発手順（推奨）

WSL2 + Dev Container を使うことで、ホスト（Windows）にランタイムを入れずに安全に開発できます。

### 前提

- Windows + WSL2（Ubuntu）セットアップ済み
- Docker Desktop インストール済み・WSL2 統合 ON
- VS Code に拡張機能 `ms-vscode-remote.remote-containers` インストール済み
- WSL 側で `claude` がログイン済み（`claude auth status` で確認）

### 手順

```bash
# 1. WSL ターミナルで WSL ネイティブ FS に clone（/mnt/c/ や /mnt/d/ 配下は I/O が遅いため避ける）
mkdir -p ~/Project/Web && cd ~/Project/Web
git clone <このリポジトリのURL> nextjs-claude-template
cd nextjs-claude-template

# 2. WSL から VS Code を起動（重要: Windows 側から直接開くと認証マウントが機能しない）
code .
```

VS Code が開いたら、コマンドパレット（`Ctrl+Shift+P`）→ **Dev Containers: Reopen in Container**

初回ビルドは数分かかります。ビルド完了後、コンテナ内ターミナルで `claude auth status` を実行して認証済み状態を確認してください。

### 注意

- **必ず WSL から `code .` で起動する** — Windows 側から VS Code を開くと `${localEnv:HOME}` が Windows のホームディレクトリを指してしまい、Claude Code の認証が引き継がれません
- WSL 側で `~/.claude.json` が存在しない場合は `touch ~/.claude.json` で作成してからコンテナを起動してください

---

## 使い方

1. GitHub で "Use this template" をクリック
2. 新しいリポジトリを作成
3. `CLAUDE.md` のプロジェクト概要を記入
4. `prisma/schema.prisma` を作成し、テーブル設計を開始
5. `/new-feature` スキルで機能設計書を作成して開発を開始

## 設計・実装フロー

変更規模 (S/M/L) に応じてフローを選択する。判定基準の詳細は [CLAUDE.md](./CLAUDE.md) と
[.claude/01_development_docs/09_開発フローと規模判定.md](./.claude/01_development_docs/09_開発フローと規模判定.md) を参照。

```
S（軽微な変更）
  実装 → /build-check → コミット → /done

M（機能追加・API変更・UX変更なし）
  設計 → 実装 → /review-impl → /browser-test → /build-check → /update-docs → コミット → /done → プッシュ

L（新機能・DBスキーマ変更・UX変更あり）
  Stage 1（機能・画面設計）→ /design-review feature → ユーザー承認
  Stage 2（技術設計）→ /design-review tech → 実装 → 以降 M と同じ

プッシュ前（共通）
  /pre-push-check → プッシュ
```

## DB スキーマ変更時

スキーマ変更前に `npx tsx tools/export-to-sql.ts` でバックアップを実行。
変更時は以下の3箇所を同時更新:

1. `prisma/schema.prisma`
2. `docs/設計書/テーブル定義書.md`
3. `tools/export-to-sql.ts`（ORDERED_TABLES + DB_TABLE_MAP）
