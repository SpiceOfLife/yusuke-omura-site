// node --test tests/sync-blog.test.mjs — ブログ同期（作成・更新・削除・予約・対象外）の確認
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, cpSync, readFileSync, existsSync, appendFileSync, rmSync, utimesSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const run = (src, out) => execFileSync("node", ["scripts/sync-blog.mjs"], { env: { ...process.env, BLOG_SOURCE_DIR: src, BLOG_OUT: out, BLOG_TODAY: "2026-10-21" }, encoding: "utf8" });
const posts = (out) => JSON.parse(readFileSync(join(out, "posts.json"), "utf8"));

test("作成・更新・削除・予約・対象外", () => {
  const src = mkdtempSync(join(tmpdir(), "blogsrc-")), out = mkdtempSync(join(tmpdir(), "blogout-"));
  cpSync("tests/fixtures/blog", src, { recursive: true });

  let log = run(src, out);
  let p = posts(out);
  assert.deepEqual(p.map((x) => x.title), ["Hello World", "ライブのお知らせ"], "新しい日付順に2件");
  assert.match(log, /予約: 20991231_未来の記事/);
  assert.match(log, /対象外の名前: メモ/);
  const hello = p.find((x) => x.title === "Hello World");
  assert.equal(hello.slug, "20261021-hello-world");
  assert.ok(hello.image && existsSync(join(out, "img", hello.slug, readdirSync(join(out, "img", hello.slug))[0])), "画像が書き出される");
  const md = readFileSync(join(out, `${hello.slug}.md`), "utf8");
  assert.ok(!md.includes("data:image"), "本文から data URI が消える");
  assert.ok(md.includes(hello.image), "本文が画像ファイルを参照する");

  // 変更なし → 何もしない
  assert.doesNotMatch(run(src, out), /作成|更新|削除/);

  // 更新
  const live = join(src, "20261019_ライブのお知らせ.md");
  appendFileSync(live, "\n追記\n"); utimesSync(live, new Date(), new Date(Date.now() + 5000));
  assert.match(run(src, out), /更新: ライブのお知らせ/);
  const slug = posts(out).find((x) => x.title === "ライブのお知らせ").slug;
  assert.match(readFileSync(join(out, `${slug}.md`), "utf8"), /追記/);

  // 削除
  rmSync(join(src, "20261021_Hello World.md"));
  assert.match(run(src, out), /削除: Hello World/);
  assert.equal(posts(out).length, 1);
  assert.ok(!existsSync(join(out, "20261021-hello-world.md")) && !existsSync(join(out, "img", "20261021-hello-world")), "記事と画像が消える");
});
