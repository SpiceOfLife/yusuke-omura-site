# 大村優介 Yusuke Omura 公式サイト

Firebase Hosting で公開する静的サイトです。フレームワークは使わず、小さなビルドスクリプトで `src/` から `dist/` を組み立てます。

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
scripts/serve.mjs    Firebase と同じ URL 形式（/profile）で dist を配信
tests/               Playwright スモークテスト（PC・スマホ幅）
site.config.json     サイトURL・名前・YouTube など
firebase.json        Hosting 設定（cleanUrls・キャッシュ・セキュリティヘッダー）
.firebaserc          Firebase プロジェクトID
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
npm i -g firebase-tools
firebase login
npm run deploy           # build → check → firebase deploy --only hosting
```

### GitHub Actions（`.github/workflows/ci.yml`）
- **Pull Request**: ビルド・検査・テストのあと、7日間有効のプレビューURLを PR にコメント
- **main への push**: 同じ検査のあと本番へ公開し、各ページが 200 を返すか確認

リポジトリに次を登録してください。

| 種類 | 名前 | 値 |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | Firebase のサービスアカウント JSON（`firebase init hosting:github` で自動登録も可） |
| Variable | `FIREBASE_PROJECT_ID` | 例: `yusuke-omura` |
| Variable | `SITE_URL` | 例: `https://yusuke-omura.web.app` |

## 独自ドメインにするとき
Firebase コンソールの Hosting → 「カスタムドメインを追加」で設定し、`site.config.json` の `siteUrl` と変数 `SITE_URL` を新しいURLに変えます（OGP・canonical・sitemap に反映されます）。
