/**
 * PreCompact フック: コンパクト前に進行中の文脈を退避する
 *
 * `.claude/rules/` の paths ルールはコンパクト後に自動再注入されない。
 * また、会話中にのみ存在した情報（進行中の設計書、規模判定の結果）も失われる。
 * そこで退避ファイルに書き出し、SessionStart(source=compact) で読み戻す。
 *
 * PreCompact は additionalContext に非対応のため、この「ファイル経由の受け渡し」が必要になる。
 *
 * 失敗しても落とさない（コンパクト自体は止めない）。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SAVE_FILE = path.join(".claude", ".session-context.json");

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
} catch {
  /* 入力が読めなくても退避処理は続行する */
}

function git(args) {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }).trim();
  } catch {
    return "";
  }
}

function activeFeatureDocs() {
  const dir = path.join("docs", "features");
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "TEMPLATE.md")
      .map((e) => path.join(dir, e.name).replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

try {
  const payload = {
    // Date は使えるが、退避の目的は「何を作業中だったか」なので最小限に留める
    trigger: input.trigger || "unknown",
    branch: git("branch --show-current"),
    uncommittedFiles: (git("status --porcelain") || "").split("\n").filter(Boolean).length,
    activeFeatureDocs: activeFeatureDocs(),
    note: "コンパクト前に退避。paths ルール（.claude/rules/）はコンパクト後に自動再注入されないため、該当ファイルを次に読むまで有効にならない点に注意。",
  };

  fs.writeFileSync(SAVE_FILE, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify({
      systemMessage: `[precompact] 進行中の文脈を ${SAVE_FILE} に退避しました。`,
    })
  );
} catch {
  process.exit(0);
}
