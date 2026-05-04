# 16時間空腹アシスト（16h-fasting-assist）

16時間ファスティングを支援するクライアント中心の Web アプリ（Vite + React）。オフライン対応の PWA と、Web Push による通知（Vercel サーバーレス + Upstash Redis）を想定している。

## 必要条件

- [Node.js](https://nodejs.org/) **20 以上**
- [pnpm](https://pnpm.io/) **9 以上**

## セットアップ

```bash
git clone https://github.com/53able/16h-fasting-assist.git
cd 16h-fasting-assist
pnpm install
```

ディレクトリ名は clone 先のフォルダ名に合わせてよい（例ではリポジトリ名に合わせている）。

環境変数はリポジトリ直下の `.env.example` をコピーして埋める。

```bash
cp .env.example .env.local
```

| 変数 | 用途 |
|------|------|
| `VITE_VAPID_PUBLIC_KEY` | ブラウザ側の Push 登録用（VAPID 公開鍵。サーバの `VAPID_PUBLIC_KEY` と一致させる） |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` | サーバー側 Web Push（`/api/subscribe`・`/api/trigger`） |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Push 購読情報の保存（Upstash Redis REST） |

`.env.local` は Git に含めない（各自のマシン用）。

## 開発サーバー

```bash
pnpm dev
```

Vite の開発サーバーが起動する。`vite.config.ts` により **`/api/subscribe` と `/api/trigger`** はローカルでも `api/*.ts` のハンドラに接続されるため、Push 登録まわりを本番と同じパスで試せる。

## よく使うコマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 開発サーバー（HMR） |
| `pnpm build` | 本番用ビルド（`dist/`） |
| `pnpm exec vite preview` | ビルド結果のローカル確認（`pnpm build` のあと） |
| `pnpm typecheck` | TypeScript チェック（`tsc --noEmit`） |
| `pnpm test` | 単体テスト（Vitest、一回実行） |
| `pnpm test:watch` | Vitest ウォッチ |
| `pnpm test:ui` | Vitest UI |
| `pnpm lint` | ESLint（`src/`・`api/` など） |
| `pnpm format` | Prettier（`src/`・`api/`） |

HMR で開発中はフルビルドより **`pnpm typecheck`** で型だけ確認する運用が向いている。

## 本番デプロイの目安

- フロントは Vite の静的出力（`pnpm build` の `dist/`）。
- `api/subscribe.ts` と `api/trigger.ts` は Vercel の Node ランタイム向けのエクスポート形式を想定している。環境変数はホスティング側のダッシュボードに `VAPID_*` と `UPSTASH_*`、フロント用に `VITE_VAPID_PUBLIC_KEY` を設定する。

## エージェント・ドキュメント

リポジトリ運用や Issue トリアージはルートの [AGENTS.md](./AGENTS.md) と [docs/agents/](./docs/agents/) を参照。

## ライセンス

MIT（`package.json` の `license` フィールドに準拠）
