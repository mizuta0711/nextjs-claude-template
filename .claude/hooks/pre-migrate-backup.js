/**
 * PreToolUse フック: prisma migrate 実行前の DB バックアップ
 *
 * コマンド判定は本スクリプト内で stdin の JSON (tool_input.command) を読んで行う。
 * settings.json 側の `if: "Bash(*prisma migrate*)"` は粗いフィルタでしかない
 * （公式ドキュメントも「引数を制約する Bash パターンは fragile」と警告している）。
 * 実際、コミットメッセージ本文に `prisma migrate` と書いただけで `git commit` が
 * この `if` にマッチし、バックアップが誤発火してコミットがブロックされた。
 * よって最終判定は本スクリプトが持ち、`if` は起動回数を減らすためだけに使う。
 *
 * 先頭一致（`Bash(npx prisma migrate:*)`）に戻せば誤発火は消えるが、
 * `docs/guide/共有VPS_DBセットアップガイド.md` の正規手順である
 * `DATABASE_URL="..." npx prisma migrate deploy` を取りこぼしてバックアップが
 * 迂回されるため、広い `if` + 厳密なスクリプト判定の組み合わせを採る。
 *
 * - 実際に prisma migrate を「実行する」コマンド時のみ `tools/export-to-sql.ts` を実行
 * - それ以外の Bash コマンドは即 exit 0 でスキップ
 * - backup 失敗時は continue:false で migrate をブロックし、Claude を停止させる。
 *   pre-commit-type-check.js が permissionDecision:"deny"（Claude が自力で修正して
 *   再試行できる）を使うのに対し、こちらを強い停止にしているのは意図的:
 *   バックアップなしで破壊的な DB 操作へ進ませないため、人間の判断を必ず挟む。
 */
const { execSync } = require("child_process");

let input = "";
try {
  input = require("fs").readFileSync(0, "utf-8");
} catch {
  process.exit(0);
}

let payload = {};
try {
  payload = JSON.parse(input || "{}");
} catch {
  process.exit(0);
}

const command = payload?.tool_input?.command || "";

/**
 * コマンド文字列に `prisma migrate` が「含まれる」かではなく、
 * 実際にそれを「実行しようとしている」かを判定する。
 *
 * 1. ヒアドキュメント本文を除去する（コミットメッセージ等に書かれた
 *    `npx prisma migrate deploy` で誤発火しないようにするため）
 * 2. `&&` `||` `;` `|` 改行 でコマンドを分割する
 * 3. 各セグメントの先頭にある環境変数代入（`DATABASE_URL="..."` 等）を剥がす
 * 4. 残りが prisma migrate の起動そのものであるかを先頭一致で判定する
 */
function runsPrismaMigrate(raw) {
  // 1. ヒアドキュメント本文の除去
  let text = raw;
  const heredoc = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/g;
  let m;
  while ((m = heredoc.exec(raw)) !== null) {
    const delim = m[2];
    const bodyStart = raw.indexOf("\n", m.index);
    if (bodyStart === -1) continue;
    const end = raw.search(
      new RegExp("^[ \\t]*" + delim + "[ \\t]*$", "m")
    );
    if (end > bodyStart) {
      text = text.replace(raw.slice(bodyStart, end), "\n");
    }
  }

  // 2. コマンドの分割
  const segments = text.split(/&&|\|\||;|\||\n/);

  for (const segment of segments) {
    // 3. 先頭の環境変数代入を剥がす
    const stripped = segment
      .trim()
      .replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+)+/, "");

    // 4. prisma migrate の起動そのものか
    if (/^(?:(?:npx|pnpm|yarn|bunx|bun)\s+)?prisma\s+migrate\b/.test(stripped)) {
      return true;
    }
  }
  return false;
}

if (!runsPrismaMigrate(command)) {
  process.exit(0);
}

try {
  execSync("npx tsx tools/export-to-sql.ts", {
    stdio: "inherit",
    timeout: 30000,
  });
  console.log(
    JSON.stringify({ systemMessage: "DB backup completed before migrate." })
  );
} catch (e) {
  console.log(
    JSON.stringify({
      continue: false,
      stopReason: "DB backup failed. Fix before running migrate: " + e.message,
    })
  );
}
