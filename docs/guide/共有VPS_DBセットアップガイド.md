# 共有VPS DBセットアップガイド（新規アプリのDB追加）

> **対象読者**: このテンプレートから作った Next.js + Prisma アプリに、本番＆開発用の PostgreSQL を用意する人（または Claude Code セッション）。
> **前提**: 共有 ConoHa VPS の初期構築（OS 堅牢化・PostgreSQL 17・PgBouncer・バックアップ cron）は AIStory の Phase 1 で**完了済み**。本ガイドは「共有基盤に DB を1つ追加する」手順のみを扱う。
> **方針（合意済み）**: 全アプリで **dev も本番も同じ共有VPSの DB に接続する**（ローカル PostgreSQL は使わない）。アプリごとに「DB 1つ + owner ロール 1つ」を追加する。命名は DB = `<app>`、ロール = `<app>_app`（例: `aistory` / `aistory_app`）。
> **秘匿情報の扱い**: `<VPS_IP>`・`<PGB_PORT>`・パスワード類は本ガイドにもリポジトリにも書かない。実値はパスワードマネージャおよび VPS 上の `/root/<app>-db-credentials.txt` で管理する。
> **既存DB（Azure 等）からデータを移行する場合**: 本ガイドは「空の新規DBを足す」手順のみ。既存DBからの dump/restore/リハーサル/切替が必要なら engineer_potal `docs/ConoHaVPS_DB移行ガイド.md` §3・§4 を参照する（二重管理を避けるためここには複製しない）。

---

## 0. 構築済みの共有基盤（再構築不要）

| 要素 | 状態 |
|------|------|
| VPS | ConoHa 2GB / Ubuntu 24.04。SSH は `deploy@<VPS_IP>`（鍵認証のみ・ポート22・sudo NOPASSWD） |
| PostgreSQL | 17（PGDG）。`localhost` のみ listen。 |
| PgBouncer | `0.0.0.0:<PGB_PORT>` で TLS 必須・scram・transaction モード。**全アプリでこの1ポートを共有**（DB 名でルーティング） |
| バックアップ | postgres ユーザーの cron（毎日 04:00 JST）が `/usr/local/bin/backup-db.sh` を実行 → `/var/backups/postgres/`（7世代） |
| ConoHa セキュリティグループ | SSH(22) と `<PGB_PORT>` 開放済み。**追加アプリで新規開放は不要** |

> 共有基盤そのものの初期構築・設計判断は engineer_potal `docs/features/20260611_ConoHaVPS移行Phase1_DB移行.md` を参照。

---

## 1. 新規アプリDBの追加（VPS 側）

`<app>` を実際のアプリ名（DB 名）に置換し、`deploy` ユーザーで実行する。

### 1-1. ロールと DB の作成（パスワードは表示せずファイル保管）

```bash
ssh deploy@<VPS_IP> 'bash -s' <<'EOF'
set -e
APP=<app>
PW=$(openssl rand -base64 64 | tr -dc "A-Za-z0-9" | head -c 40)
sudo install -m 600 -o root -g root /dev/null /root/${APP}-db-credentials.txt
echo "${APP}_app / ${APP} DB password: $PW" | sudo tee /root/${APP}-db-credentials.txt > /dev/null
echo "CREATE ROLE ${APP}_app LOGIN PASSWORD '$PW';
CREATE DATABASE ${APP} OWNER ${APP}_app;" | sudo -u postgres psql -q
echo "done"
EOF
```

> Prisma が `plpgsql` 以外の拡張を要求する場合は、この後 VPS 側で `sudo -u postgres psql -d <app> -c 'CREATE EXTENSION <名前>;'` を実行する。

### 1-2. pg_hba にアプリ行を追加

```bash
ssh deploy@<VPS_IP> 'sudo sed -i "/^# TYPE/a host  <app>  <app>_app  127.0.0.1\/32  scram-sha-256" /etc/postgresql/17/main/pg_hba.conf && sudo systemctl reload postgresql@17-main'
```

### 1-3. PgBouncer に DB エントリとユーザーを追加

```bash
ssh deploy@<VPS_IP> 'bash -s' <<'EOF'
set -e
APP=<app>
# [databases] セクション直後にエントリ追加
sudo sed -i "/^\[databases\]/a ${APP} = host=127.0.0.1 port=5432 dbname=${APP}" /etc/pgbouncer/pgbouncer.ini
# userlist.txt に SCRAM ハッシュを追記（平文は書かない）
sudo -u postgres psql -Atc \
  "SELECT '\"' || rolname || '\" \"' || rolpassword || '\"' FROM pg_authid WHERE rolname='${APP}_app'" \
  | sudo tee -a /etc/pgbouncer/userlist.txt > /dev/null
sudo systemctl reload pgbouncer   # reload なら既存アプリの接続は切れない
EOF
```

> **注意**: `restart` ではなく `reload` を使うこと。restart すると稼働中の他アプリの接続が一瞬切れる。

### 1-4. バックアップ対象に追加

`/usr/local/bin/backup-db.sh` の pg_dump 行を複製して新 DB を追加する:

```bash
ssh deploy@<VPS_IP> 'sudo sed -i "/^pg_dump -Fc/a pg_dump -Fc <app> -f \"\$BACKUP_DIR/<app>_\$(date +%Y%m%d).dump\"" /usr/local/bin/backup-db.sh'
# 動作確認（手動実行 → 新 DB の dump ができること）
ssh deploy@<VPS_IP> 'sudo -u postgres /usr/local/bin/backup-db.sh && sudo ls -lh /var/backups/postgres/'
```

> 世代削除の find パターンが特定アプリ名固定になっている場合は、初回のみ全 DB 共通パターン（`'*_*.dump'`）に直す。

### 1-5. 接続検証（DB がまだ空の状態で）

アプリのリポジトリから、本番と同じ経路（PgBouncer + TLS）で疎通確認:

```bash
# パスワードを一時取得（表示しない）
ssh deploy@<VPS_IP> 'sudo awk "{print \$NF}" /root/<app>-db-credentials.txt' > /tmp/dbpw && chmod 600 /tmp/dbpw

PW=$(tr -d '\n' < /tmp/dbpw) \
&& TEST_URL="postgresql://<app>_app:${PW}@<VPS_IP>:<PGB_PORT>/<app>?pgbouncer=true&sslmode=require&connection_limit=5" \
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasourceUrl: process.env.TEST_URL });
p.\$queryRawUnsafe('SELECT current_database()').then(console.log).finally(() => p.\$disconnect());
"
rm -f /tmp/dbpw
```

---

## 2. マイグレーション運用

新規アプリは初回 `migrate deploy` で空DBにスキーマを適用する。

- **`prisma migrate` は PgBouncer 経由では実行不可**（transaction モード非対応）。スキーマ変更時は SSH トンネルで PostgreSQL に直結する:

  ```bash
  # ローカルから VPS の PostgreSQL(5432) を localhost:15432 へトンネル
  ssh -f -N -L 15432:localhost:5432 deploy@<VPS_IP>

  # トンネル直結URL（schema=public・pgbouncer は付けない）で適用
  DATABASE_URL="postgresql://<app>_app:<PW>@localhost:15432/<app>?schema=public" npx prisma migrate deploy
  ```

- アプリ実行用 URL には **`pgbouncer=true` を必ず付ける**（Prisma が prepared statement を無効化し transaction モードと互換になる）。
- パスワードは VPS の `/root/<app>-db-credentials.txt` が原本。`ssh deploy@<VPS_IP> 'sudo cat /root/<app>-db-credentials.txt'` で取得。

---

## 3. DATABASE_URL の形

| 用途 | URL |
|------|-----|
| **アプリ実行（dev / 本番とも）** | `postgresql://<app>_app:<PW>@<VPS_IP>:<PGB_PORT>/<app>?pgbouncer=true&sslmode=require&connection_limit=5` |
| **マイグレーション時のみ（SSHトンネル直結）** | `postgresql://<app>_app:<PW>@localhost:15432/<app>?schema=public` |

- ローカル `.env` も本番（Vercel 等の環境変数）も、アプリ実行用は同じ PgBouncer URL を使う。
- `.env.example` には実パスワードを書かず、`<app>_app`・`<VPS_IP>`・`<PGB_PORT>` をプレースホルダのまま記載する。
- 本番の環境変数を切り替える際は、**旧 URL を切り戻し用に必ず控える**。

---

## 4. ハマりどころ集

| 症状 | 原因と対処 |
|------|-----------|
| `pg_dump: error: invalid URI query parameter: "schema"` / `"connection_limit"` | URL に付く **Prisma 専用パラメータを pg_dump/psql は解釈できない**。`?` 以降を捨てて `?sslmode=require` だけ付け直す |
| PgBouncer 経由で `prisma migrate` がエラー | 仕様（transaction モード非対応）。SSH トンネル直結で実行する（§2） |
| 非 TLS で接続できてしまう気がする | 正常なら `FATAL: SSL required` で拒否される。なるなら PgBouncer の `client_tls_sslmode = require` を確認 |
| PgBouncer の設定変更後、他アプリの接続が切れた | `systemctl restart` を使ったため。**`reload` を使う** |
| `sudo -u postgres <スクリプト>` が `find: Failed to restore initial working directory` で失敗 | postgres が読めないディレクトリ（/home/deploy 等）から実行したのが原因。スクリプト冒頭で読めるディレクトリへ `cd` する |

---

## 5. 完了チェックリスト（アプリごと）

- [ ] ロール・DB 作成、パスワードは `/root/<app>-db-credentials.txt` とパスワードマネージャのみ
- [ ] pg_hba 追記 + reload
- [ ] PgBouncer `[databases]` + userlist 追記 + **reload**
- [ ] backup-db.sh に dump 行追加・手動実行で生成確認
- [ ] PgBouncer 経由の疎通確認（Prisma・TLS）
- [ ] 初回 `migrate deploy`（SSHトンネル）でスキーマ適用
- [ ] `.env`（dev）と本番環境変数の DATABASE_URL を PgBouncer URL に設定

---

## 改訂履歴

| 版数 | 日付 | コミット | 内容 | 担当 |
|------|------|---------|------|------|
| 1.0 | 2026-06-18 | - | 初版作成。engineer_potal `ConoHaVPS_DB移行ガイド.md`（Azure→ConoHa 移行）の §0/§2/§5/§6 を、新規アプリのDB追加向けに汎用化して移植 | Claude |
