# Next.js + Claude Code プロジェクトテンプレート

Claude Code での開発に最適化された Next.js プロジェクトテンプレート。

## 含まれるもの

### Claude Code 設定
- **CLAUDE.md** — プロジェクトルール（設計・実装フロー、DB変更ルール等）
- **AGENTS.md** — Next.js 16 互換性の注意事項
- **.claude/agents/** — エージェント定義（code-reviewer, coding-specialist, documentation-manager, project-manager）
- **.claude/skills/** — スキル定義（build-check, code-review, design-review, new-feature, update-docs）

### 技術ドキュメント
- **.claude/01_development_docs/** — 技術設計書テンプレート（アーキテクチャ、DB、API、エラー処理、型定義、サービス、フック、AIプロンプト）
- **.claude/02_design_system/** — デザインシステムテンプレート
- **.claude/03_library_docs/** — ライブラリガイド（Next.js 16, Zustand 5, NextAuth 4）

### 設計書テンプレート
- **docs/設計書/** — API一覧、テーブル定義書、ER図、サービス一覧、フック一覧、対応表
- **docs/features/** — 機能設計書テンプレート
- **docs/reviews/** — レビュー結果の保存先

### ツール
- **tools/export-to-sql.ts** — DB バックアップツール（テーブル定義を設定して使用）

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

```
設計 → /design-review → 実装 → /code-review → /build-check → /update-docs → コミット
```

## DB スキーマ変更時

スキーマ変更前に `npx tsx tools/export-to-sql.ts` でバックアップを実行。
変更時は以下の3箇所を同時更新:

1. `prisma/schema.prisma`
2. `docs/設計書/テーブル定義書.md`
3. `tools/export-to-sql.ts`（ORDERED_TABLES + DB_TABLE_MAP）
