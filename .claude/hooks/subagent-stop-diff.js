/**
 * SubagentStop フック: サブエージェント終了時に差分確認を促す
 *
 * CLAUDE.md「サブエージェント運用ルール」には既に
 * 「サブエージェントの結果は必ずメインで差分確認・フロー検証してからコミットする」がある。
 * 同じ文言を通知で重ねるだけでは既読スルーされるため、
 * **変更ファイル数と実行できるコマンドをその場に出す**ことで
 * 「読む」から「実行する」までの距離を縮めることを狙う。
 *
 * 数セッション運用して行動が変わらなければ撤去してよい（設計書 3-1(B) 参照）。
 *
 * 非ブロッキング。変更が無ければ何も出さない。
 */
const fs = require("fs");
const { execSync } = require("child_process");

let payload = {};
try {
  payload = JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
} catch {
  process.exit(0);
}

const agent = payload?.agent_type || payload?.subagent_type || "サブエージェント";

let files = [];
try {
  files = execSync("git status --porcelain", {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3000,
  })
    .split("\n")
    .filter(Boolean);
} catch {
  process.exit(0);
}

if (!files.length) process.exit(0);

const preview = files
  .slice(0, 5)
  .map((l) => `  ${l.trim()}`)
  .join("\n");
const more = files.length > 5 ? `\n  ...ほか ${files.length - 5} 件` : "";

console.log(
  JSON.stringify({
    systemMessage:
      `[subagent] ${agent} の終了時点で ${files.length} ファイルに変更があります。\n` +
      `${preview}${more}\n` +
      `コミット前に \`git diff\` で内容を確認すること（ビルド成功 ≠ 正しい実装）。`,
  })
);
