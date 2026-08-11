# 昇降ストローク計算

ドラムの初期径、ベルト厚さ、巻き数などから、巻き数ごとの昇降ストロークとモータ軸回転角を計算するブラウザアプリです。

## 必要な環境

- Node.js 20 LTS 以上
- npm 10 以上

## 起動方法

> [!IMPORTANT]
> `index.html` をファイルとして直接開いても起動しません。必ず以下の開発サーバーを起動し、ターミナルに表示されるURLへアクセスしてください。

```bash
npm install
npm run dev
```

Windows PowerShellで`npm`の実行がスクリプト実行ポリシーにより拒否される場合は、次のように`npm.cmd`を使用してください。

```powershell
npm.cmd install
npm.cmd run dev
```

通常は <http://localhost:5173/> で表示されます。ターミナルに別のURLが表示された場合は、そちらを開いてください。

### 画面が表示されない場合

1. `npm install` がエラーなく完了したことを確認します。
2. `npm run dev` を実行したターミナルを終了せず、そのままにします。
3. ブラウザで `http://localhost:5173/` を開きます（`file:///.../index.html` ではありません）。
4. 5173番ポートが使用中の場合、Viteが表示した別ポートのURLを開きます。
5. 古いキャッシュが残る場合は、ブラウザでスーパーリロードします。

外部APIやデータベースは使用せず、計算とCSV生成はすべてブラウザ内で完結します。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 型検査と本番用ビルド |
| `npm run preview` | 本番用ビルドをローカルで確認 |
| `npm test` | 計算ロジックの自動テスト |
| `npm run lint` | ESLintを実行 |

本番ビルドを確認する場合は、次の順番で実行します。

```bash
npm run build
npm run preview
```

## Vercelへのデプロイ

Vercelで動作します。リポジトリをVercelへインポートすると、ルートの`vercel.json`に従ってViteアプリとしてビルドされます。

Vercelのプロジェクト設定は次のとおりです。`vercel.json`に設定済みのため、通常は手動変更不要です。

| 設定 | 値 |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install`（Vercelのデフォルト） |
| Node.js | 20.x以上 |

### Git連携でデプロイする手順

1. このリポジトリをGitHub、GitLab、またはBitbucketへpushします。
2. Vercelのダッシュボードで **Add New → Project** を選択します。
3. 対象リポジトリを選択し、ルートディレクトリをリポジトリ直下のままにします。
4. **Deploy** を選択します。環境変数は不要です。

Vercel CLIを利用する場合は、リポジトリ直下で次を実行します。

```bash
npx vercel
```

本番環境へ反映する場合は次を実行します。

```bash
npx vercel --prod
```

デプロイ後に読み込み画面から進まない場合は、Vercelのデプロイログで`npm run build`が成功していることと、Output Directoryが`dist`になっていることを確認してください。

## 主な機能

- 6項目の入力を変更した際のリアルタイム再計算
- 最大・最小ストローク、ストローク差、最大モータ軸回転角のサマリー
- 昇順・降順と基本・詳細表示を切り替えられる計算結果テーブル
- 巻き数と昇降ストロークの関係グラフ
- 計算結果のCSVダウンロード
- 計算式の折りたたみ表示
- 空欄、非数値、負数に対する日本語エラー表示
- PC・スマートフォン対応

## 計算式

巻き数を `k`、結果を求める巻き数を `n` とします。

```text
Dout(k)   = D0 + 2kt
Dc(k)     = D0 + (2k - 1)t
L(k)      = π × Dc(k)
S(n)      = SN + π(N - n){D0 + t(N + n - 2)}
θ0        = SN ÷ {π × Dc(N)} × Δθ
θdrum(n)  = θ0 + Δθ(N - n)
θmotor(n) = i × θdrum(n)
Btotal    = Smax + Lm
```

内部計算では値を丸めず、画面表示時のみ原則として小数第2位まで表示します。

`Δθ`はドラム1巻当たりの回転角です。1巻きはドラム1回転に相当するため、入力値ではなく`360°`の計算値として扱います。

ドラム初期回転角`θ0`は入力値ではありません。最大巻き時の残りストローク`SN`を、最大巻き時のベルト中心円周`π × Dc(N)`に対する回転角へ換算して自動計算します。初期条件では約`179.05°`です。

必要なベルト全長`Btotal`は、最大ストローク`Smax`に、入力した機構内長さ`Lm`を加えて算出します。初期条件では約`3,752.56 mm`です。

## ディレクトリ構成

```text
src/
├── App.tsx                # 画面、入力検証、グラフ、CSV出力
├── calculations.ts        # UIから独立した純粋な計算関数
├── calculations.test.ts   # 計算ロジックの自動テスト
├── main.tsx               # Reactのエントリーポイント
└── styles.css             # レスポンシブスタイル
```
