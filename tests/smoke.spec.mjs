import { test, expect } from "@playwright/test";

const PAGES = [["/", /Yusuke Omura/], ["/profile", /プロフィール/], ["/works", /作品/], ["/numbers", /数字で見る/], ["/lab", /Lab/]];

for (const [path, title] of PAGES) {
  test(`${path} が表示され、エラーがなく、横スクロールしない`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // 外部（Google Fonts・YouTube サムネイル）の読み込み失敗は環境依存なので数えず、自サイトの参照切れだけを見る
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on("response", (r) => { const u = new URL(r.url()); if (u.origin === new URL(page.url() || r.url()).origin && r.status() >= 400) errors.push(`${r.status()} ${u.pathname}`); });
    const res = await page.goto(path);
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("Numbers: スクロールすると数字がカウントアップし、図が描かれる", async ({ page }) => {
  await page.goto("/numbers");
  const first = page.locator("[data-count]").first();
  await expect(first).toHaveText("23", { timeout: 5000 });
  for (const sel of [".gantt", ".waffle", ".ring", ".ensembles", ".honors"]) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await expect(page.locator(sel)).toHaveClass(/\bin\b/, { timeout: 5000 });
  }
  await expect(page.locator(".ring .ring-seg")).toHaveCount(5);
  await expect(page.locator(".ensembles .dots i")).toHaveCount(1 + 2 + 3 + 4 + 17 + 24);
});

test("存在しないページは 404 ページを返す", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res.status()).toBe(404);
  await expect(page.locator(".nf-code")).toBeVisible();
});

test("404 ページは5秒でトップへ移動する", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.locator(".lead")).toContainText("このページは存在しません。");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 8000 });
});

test("検索エンジン向けの情報がそろっている", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/大村優介/);
  await expect(page.locator("h1")).toContainText("大村優介");
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld["@graph"].find((n) => n["@type"] === "Person").name).toBe("大村優介");
});

test("ブログ一覧が表示され、記事があれば記事ページも開ける", async ({ page }) => {
  const res = await page.goto("/blog/");
  expect(res.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText(/Blog/i);
  const first = page.locator(".post-card a").first();
  if (await first.count()) {
    const href = await first.getAttribute("href");
    const r = await page.goto(href);
    expect(r.status()).toBe(200);
    await expect(page.locator(".post-title")).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(ld).toContain("BlogPosting");
  }
});
