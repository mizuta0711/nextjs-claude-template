# CLAUDE.md

対話は日本語で行うこと。

<!-- BEGIN:nextjs-agent-rules -->
**Next.js 16 注意**: このバージョンには破壊的変更がある。コードを書く前に `node_modules/next/dist/docs/` のガイドを参照し、非推奨APIに注意すること。
<!-- END:nextjs-agent-rules -->

## サブエージェントのモデル指定

コスト最適化のため、サブエージェント起動時は原則 `model: "sonnet"` を指定すること。
Opus を使う例外: 複雑な設計判断やアーキテクチャ決定など、高度な推論が必要な場合のみ。

## プロジェクト概要

<!-- プロジェクトの概要を記載 -->

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict) + TailwindCSS 4 + Zustand 5 + Prisma 6 (PostgreSQL) + NextAuth 4

```
src/
├── app/           # Next.js App Router（ページ・API）
├── features/      # 機能別モジュール
│   └── {feature}/ # components/, stores/, hooks/, services/, data/
├── components/    # 共通コンポーネント（layout/, providers/, common/）
├── lib/           # ユーティリティ（ai/, api/, auth.ts, db.ts, services/）
└── types/         # 型定義
```

## Build & Dev Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## コーディングルール（全エージェント共通）

### TypeScript
- **`any` 型は禁止**。`unknown`、union型、ジェネリクスで代替すること
- 適切な型定義を必ず行う（API レスポンス、Props、イベントハンドラー等）

### React / Next.js コンポーネント
- `memo<Props>` パターン + `displayName` 設定
- `useCallback` / `useMemo` で不要な再レンダリングを防止
- Server / Client Components を適切に分離

### API Route
- `NextRequest` / `NextResponse` パターン
- try/catch でエラーハンドリング、適切な HTTP ステータスコード
- 直接 DB 操作禁止 — 必ず Service 層を経由

### UI 実装
- 縦スクロール対応（`overflow-y-auto`、`max-h-*` 等）
- `min-h-screen` / `h-full` 等の適切な高さ設定
- レスポンシブデザイン（モバイル・デスクトップ両対応）

## ドキュメント構成と役割分離

ドキュメントは **方針（How）** と **実態（What）** に分離されている。同じ情報を2箇所に書かないこと。

| 場所 | 役割 | 変更頻度 |
|------|------|----------|
| `.claude/01_development_docs/` | **設計方針・パターン・ルール**（命名規則、エラー処理方式、API設計ルール等） | 低 |
| `.claude/02_design_system/` | **デザインシステム方針**（コンポーネント設計パターン、スタイリング方針） | 低 |
| `.claude/03_library_docs/` | **ライブラリ利用ガイド**（Next.js 16, Zustand 5, NextAuth 4 の使い方） | 低 |
| `docs/設計書/` | **実態の一覧・定義**（API一覧, テーブル定義書, ER図, サービス一覧, フック一覧, 対応表） | 高（コードと同期） |
| `docs/features/` | **機能設計書**（`yyyymmdd_機能名.md`） | 高 |
| `docs/reviews/` | レビュー結果の記録 | 高 |

**参照ルール**: 全てを読まず、作業内容に応じて該当ドキュメントのみ読むこと。
**二重管理の禁止**: 個別APIのエンドポイント定義は `docs/設計書/API一覧.md` にのみ書く。`.claude/01_development_docs/03_api_design.md` には設計ルール（命名規則、ページネーション方式、エラーレスポンス形式）だけを書く。他のドキュメントも同様。

## 設計書の改訂履歴ルール

`docs/設計書/` および `docs/features/` 配下の設計ドキュメントには末尾に改訂履歴テーブルを設け、改訂時は必ず更新すること。

**改訂履歴のフォーマット:**
```
| 版数 | 日付 | コミット | 内容 | 担当 |
```
- コミット列にはトリガーとなったコミットの短縮ハッシュ（7文字）を記入
- `/update-docs` 実行時は `docs/設計書/.doc-sync.md` にも同期記録を追記すること

## 機能設計書の運用ルール

- 新規機能開発時は `docs/features/TEMPLATE.md` をコピーして作成（`/new-feature` Skillで自動化可能）
- 命名: `docs/features/yyyymmdd_機能名.md`
- タスクステータス: 🔵未実施 / 🟡実装中 / ✅完了 / ⏸️保留(理由必須) / ❌却下(理由必須)
- 全タスク完了時はメタ情報のステータスを 🟢完了 に更新

## 設計・実装フロー（変更規模別）

変更規模に応じてフローを選択する。迷ったら M を使うこと。

### S: バグ修正・軽微な変更（UI微調整、テキスト修正、1ファイル程度の修正）

```
実装 → /build-check → コミット
```

### M: 機能追加・API変更・複数ファイル変更

```
設計 → 実装 → /code-review → /build-check → /update-docs → コミット → プッシュ
```

- `/update-docs` で全タスク完了を検知すると、自動で sync-check → `completed/` 移動が実行される

### L: 新機能・大規模変更・DB スキーマ変更

```
設計 → /design-review → 実装 → /code-review → /build-check → /update-docs → コミット → プッシュ
```

- それ以外は M と同じ

### プッシュ前（共通）

```
/pre-push-check → プッシュ
```
- `/sync-check` は `/update-docs` の全タスク完了時に自動実行。手動実行は `/complete-feature` で可能（フェーズ完了時・大規模変更後）

### フロー共通ルール
- **レビュー前にコミットしないこと**（M, L の場合）
- 設計時、APIのリクエスト・レスポンスJSON例は必須（M, L の場合）
- サブエージェント委譲時はAPI設計書のパスを明示

## DB スキーマ変更時の必須ルール

テーブル構造の変更（カラム追加・削除・型変更・テーブル追加/削除）を行う際は、以下を**必ず**守ること:

1. **バックアップ実行**: スキーマ変更の**前に** `npx tsx tools/export-to-sql.ts` を実行
2. **コメント必須**: カラム追加・変更時は `/// 説明` コメントを必ず付与する（テーブル定義書の自動生成に使用）
3. **3点同期**: スキーマ変更時は以下の3箇所を**必ず同時に更新**する:

| # | 対象 | ファイル |
|---|------|---------|
| 1 | スキーマ | `prisma/schema.prisma` |
| 2 | 設計書 | `npx tsx tools/scripts/generate-table-docs.ts` を実行して自動生成 |
| 3 | バックアップツール | `tools/export-to-sql.ts`（`ORDERED_TABLES` + `DB_TABLE_MAP`） |

**1つでも更新漏れがあると、バックアップが不完全になる。**

## 作業の進め方

- 一度に編集するファイルは最大5ファイル
- 段階的にビルド確認
- 大きなフェーズは細分化してコミット

## よくあるエラーと対処法

| エラー | 対処法 |
|-------|--------|
| Module not found | `rm -rf node_modules package-lock.json && npm install` |
| TypeScript エラー | 型定義を確認し、`any` を使わず適切な型を設定 |
| ビルドエラー | `rm -rf .next && npm run build` |
