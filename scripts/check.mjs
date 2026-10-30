// ビルド後の dist/ を検査: 内部リンクと画像の参照切れ、未展開のインクルード、title/description の有無。
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
let errors = 0;
const fail = (m) => { console.error("✗ " + m); errors++; };
const walk = (d) => readdirSync(join("dist", d)).flatMap((n) => { const r = d ? `${d}/${n}` : n; return statSync(join("dist", r)).isDirectory() ? (r.startsWith("assets") ? [] : walk(r)) : [r]; });
const pages = walk("").filter((f) => f.endsWith(".html"));
for (const f of pages) {
  const html = readFileSync(join("dist", f), "utf8");
  if (/<!--#/.test(html)) fail(`${f}: 未展開のインクルード`);
  if (html.includes("__SITE_URL__")) fail(`${f}: __SITE_URL__ が残っています`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${f}: title がありません`);
  if (!/<meta name="description" content="[^"]+">/.test(html)) fail(`${f}: description がありません`);
  for (const [, ref] of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    const path = ref.replace(/^\//, "");
    const ok = ref === "/" || existsSync(join("dist", path)) || existsSync(join("dist", path + ".html"));
    if (!ok) fail(`${f}: 参照切れ ${ref}`);
  }
  // リダイレクトを挟む内部リンク（/blog、/profile.html、/blog/x/）は検索エンジンが「リダイレクトあり」として扱うので使わない
  for (const [, ref] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    if (ref.startsWith("/assets/") || ref === "/" || ref === "/favicon.ico") continue;
    if (ref.endsWith(".html") || ref === "/blog" || (ref.endsWith("/") && ref !== "/blog/")) fail(`${f}: リダイレクトされるリンク ${ref}（正規の URL を使う）`);
  }
  for (const [, set] of html.matchAll(/srcset="([^"]+)"/g))
    for (const u of set.split(",").map((s) => s.trim().split(" ")[0])) if (u.startsWith("/") && !existsSync(join("dist", u))) fail(`${f}: 参照切れ ${u}`);
}
console.log(errors ? `${errors} 件の問題` : `✓ ${pages.length} ページ OK`);
process.exit(errors ? 1 : 0);
