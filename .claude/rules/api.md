---
paths:
  - "src/app/api/**"
  - "src/features/**/hooks/**"
  - "src/lib/services/**"
---

# API 実装のルール

## API Route

- `NextRequest` / `NextResponse` パターン
- try/catch でエラーハンドリング、適切な HTTP ステータスコード
- 直接 DB 操作禁止 — 必ず Service 層を経由

## API 型契約の必須化

BE/FE を別サブエージェントに委譲する場合、必ず共有型定義を先に作成してから委譲する。

- API ルート実装前に `src/types/` に共有レスポンス型を定義する
- バックエンド（route.ts）とフロントエンド（hooks）の両方がその型を import する
- レビュー時に API 提供側と消費側の型突き合わせを必須とする

> このルールは BE 側だけでは成立しない。そのため本ファイルは `src/app/api/**` だけでなく
> `src/features/**/hooks/**`（消費側）と `src/lib/services/**`（Service 層）でもロードされる。

## 参照

- 設計ルール（命名規則、ページネーション方式、エラーレスポンス形式）: [.claude/01_development_docs/03_api_design.md](../01_development_docs/03_api_design.md)
- 個別エンドポイントの定義: [docs/設計書/API一覧.md](../../docs/設計書/API一覧.md)
- Service / Repository 設計: [.claude/01_development_docs/06_service_repository_design.md](../01_development_docs/06_service_repository_design.md)
