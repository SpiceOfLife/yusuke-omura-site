# 大村優介 Yusuke Omura 公式サイト

Cloudflare Pages（プロジェクト名 yusuke-omura）で公開する静的サイトです。フレームワークは使わず、小さなビルドスクリプトで `src/` から `dist/` を組み立てます。

## ページ

| URL | 内容 | 主な動き |
|---|---|---|
| `/` | トップ | 名前が波打つキネティックタイポ、役割ワードの回転、スクロールで点灯する文章、速度に反応するマーキー |
| `/profile` | プロフィール・年表・楽器 | スクロールで伸びる年表ライン、楽器チップ |
| `/works` | アルバム・作品・映像・レーベル | ジャケットの傾き＋レコードが滑り出す、回転するレーベルスタンプ |
| `/numbers` | 数字で見る大村優介 | カウントアップ、年数のガントバー、楽器のワッフル図、制作工程のリング、編成のドット |
| `/live` | ライブ・出演情報（`content/live.json` から生成。予定は MusicEvent の構造化データ付き。トップにも「Next Live」として次の公演を表示） | 公演の追加は live.json に1件足すだけ。日付が過ぎると自動で Past へ |
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

## ブログ（Google Drive 連携）

Google Drive の `blog` フォルダに **`YYYYMMDD_タイトル`** という名前の Google ドキュメントを置くと、記事になります。

| Drive でしたこと | サイトで起きること |
|---|---|
| `20261101_ライブのお知らせ` を作る | `/blog/20261101-…` に記事ができる（一覧・サイトマップ・RSS にも追加） |
| 本文を書き換える／名前のタイトル部分を変える | 記事が更新される（URL は変わらない） |
| 日付部分を変える | その日付の記事として出し直される |
| ドキュメントを削除する／別フォルダへ移す／名前の規則から外す | 記事が消える |
| 未来の日付で作る | その日（日本時間）になったら公開される |

- 見出し・太字・リスト・リンク・引用・表・画像が使えます。画像はWebP に縮小して掲載します。
- 一覧ページは日付とタイトルだけを表示します。記事の最初の画像は SNS 共有時の画像になります。
- 同期は `.github/workflows/blog-sync.yml` が **30分ごと** に実行します（Actions の「Run workflow」で今すぐ実行も可）。
- 手元で試す: `BLOG_SOURCE_DIR=tests/fixtures/blog npm run sync:blog && npm run build`

### 設定（GitHub の Settings → Secrets and variables → Actions）
| 種類 | 名前 | 値 |
|---|---|---|
| Variable | `BLOG_FOLDER_ID` | Drive の blog フォルダの ID |
| Variable | `GCP_WORKLOAD_IDENTITY_PROVIDER` / `GCP_SERVICE_ACCOUNT` | Workload Identity を使う場合（推奨・鍵なし） |
| Secret | `GCP_SA_KEY` | サービスアカウント鍵を使う場合の JSON |

サービスアカウントには Google Drive API を有効にしたプロジェクトで作成し、blog フォルダを **閲覧者** として共有します。
