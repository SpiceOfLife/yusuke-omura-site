# 大村優介 Yusuke Omura 公式サイト

Cloudflare Pages（プロジェクト名 yusuke-omura）で公開する静的サイトです。フレームワークは使わず、小さなビルドスクリプトで `src/` から `dist/` を組み立てます。

## ページ

| URL | 内容 | 主な動き |
|---|---|---|
| `/` | トップ | 名前が波打つキネティックタイポ、役割ワードの回転、スクロールで点灯する文章、速度に反応するマーキー |
| `/profile` | プロフィール・年表・楽器 | スクロールで伸びる年表ライン、楽器チップ |
| `/works` | アルバム・作品・映像・レーベル | ジャケットの傾き＋レコードが滑り出す、回転するレーベルスタンプ |
| `/numbers` | 数字で見る大村優介 | カウントアップ、年数のガントバー、楽器のワッフル図、制作工程のリング、編成のドット |
| `/lab` | ours-blanc のWebアプリ | 傾くカード、イコライザー／チューナー針のアニメーション |

動きはすべて OS の「視差効果を減らす」設定に従って止まります。

## 構成

```
src/pages/*.html     各ページ（<!--#head --> <!--#header --> <!--#footer --> は build で展開）
src/assets/css       style.css（全ページ共通）
src/assets/js        main.js（共通の動き）, home.js, profile.js, numbers.js
src/assets/img       画像（Google Drive の宣材写真・ジャケットから作成）
scripts/build.mjs    src → dist
scripts/check.mjs    dist の参照切れ・メタ情報の検査
scripts/serve.mjs    Cloudflare Pages と同じ URL 形式（/profile）で dist を配信
tests/               Playwright スモークテスト（PC・スマホ幅）
site.config.json     サイトURL・名前・YouTube など
src/_headers         Cloudflare Pages のヘッダー（キャッシュ・セキュリティ）
```

## 手元で動かす

```sh
npm ci
npm run build && npm run serve      # http://localhost:4173
npm run check
npx playwright install chromium && npm test
```

## 公開

### 手動
```sh
npx wrangler login       # ブラウザで Cloudflare にログイン
npm run deploy           # build → check → wrangler pages deploy
```

### GitHub Actions（`.github/workflows/ci.yml`）
- **Pull Request**: ビルド・検査・テストのあと `pr-<番号>.yusuke-omura.pages.dev` にプレビューを出し、URL を PR にコメント
- **main への push**: 同じ検査のあと本番へ公開し、各ページが 200 を返すか確認

リポジトリに次を登録してください（ours-blanc-sites と同じトークンを使えます）。

| 種類 | 名前 | 値 |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン（Account › Cloudflare Pages › Edit） |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウントID |
| Variable | `SITE_URL` | 独自ドメインにした場合のみ（例: `https://yusukeomura.com`） |

## 独自ドメインにするとき
Cloudflare ダッシュボードの Workers & Pages → yusuke-omura → カスタムドメインで追加し、`site.config.json` の `siteUrl` と変数 `SITE_URL` を新しいURLに変えます（OGP・canonical・sitemap に反映されます）。
