# 16時間空腹アシスト — 実装計画

## Executive Summary

総工数 **6-8週間** の3フェーズ実装。**最大の技術的リスクは Web Push (VAPID) + iOS Safari の通知制限** であり、Phase 1 の最初の2週間でこれを Spike 検証する。検証結果に応じて Phase 1 完了時に**意思決定ゲート**を設け、通知実装が不可能な場合のフォールバック戦略（復帰時補正のみのモデル）への切り替えを判断する。

## Critical Path

```
[Day 1-3] セットアップ + Repository IF + Dexie schema
    ↓
[Day 4-10] VAPID Spike (CRITICAL) ← iOS実機で 16時間 push 検証
    ↓
[意思決定ゲート A] → push 実装可? Yes/No 判定
    ↓
[Day 11-21] タイマー + SOS + Body Status コア実装
    ↓
[Day 22-28] オンボーディング + 通知統合 + データエクスポート
    ↓
[意思決定ゲート B] → Phase 1 完了基準を全件満たすか
    ↓
[Phase 2 / Phase 3]
```

---

## 1. Phase 1 詳細タスク分解 (3-4週間)

### 1.0 前置タスク (Day 1-3) — Pre-flight

#### Task 1.0.1: Repository インターフェース定義
- **担当**: domain/ports/ 配下の TypeScript IF を全て先に書き切る
- **成果物**:
  - `src/domain/ports/fasting-repository.ts` (`IFastingRepository`)
  - `src/domain/ports/workout-repository.ts` (`IWorkoutRepository`)
  - `src/domain/ports/health-metric-repository.ts` (`IHealthMetricRepository`)
  - `src/domain/ports/notification-gateway.ts` (`INotificationGateway`)
  - `src/domain/ports/export-service.ts` (`IExportService`)
  - `src/domain/types.ts` (FastingSession, WorkoutLog, HealthMetric, UserProfile)
- **Acceptance Criteria**:
  - すべての IF は domain/ ディレクトリに閉じ、infra/ への import が0件
  - `tsc --noEmit` が通る
  - 各 IF メソッドに JSDoc で「不変条件」を明記 (例: `findActive()` は status==='active' のセッションのみ返す)

#### Task 1.0.2: Dexie schema v1 確定
- **成果物**: `src/infra/db.ts`
- **複合インデックス設計**:
  - `fasting_sessions`: `id, status, startedAt, [status+startedAt]`
  - `workout_logs`: `id, performedAt, type, fastingSessionId`
  - `health_metrics`: `id, recordedAt, type, [type+recordedAt]`
- **Acceptance Criteria**:
  - schema version=1 で固定。version=2 のマイグレーション戦略をコメントで記述
  - fake-indexeddb で初期化テストが通る

#### Task 1.0.3: VAPID サーバ Spike (CRITICAL)
- **目的**: iOS Safari PWA で 16時間後の Web Push が確実に届くか検証
- **手順**:
  1. Vercel Edge Functions または Cloudflare Workers でエコー Push サーバを構築
  2. `web-push` ライブラリ (Node) で VAPID キーペア生成 (`web-push generate-vapid-keys`)
  3. ローカル React 側で `serviceWorkerRegistration.pushManager.subscribe({ applicationServerKey })` し PushSubscription 取得
  4. POST /subscribe でサーバ保存 (KV または Supabase)
  5. POST /trigger?delay=900s で 15分後 push、次に 60分後、最後に 16時間後を実機検証
- **Acceptance Criteria**:
  - iOS 17+ Safari で PWA インストール後、permission granted で 16時間後の Push が表示される
  - フォアグラウンド/バックグラウンド/アプリ kill 後すべてで動作確認済み
  - **失敗の場合**: ゲートA で「フォールバック専用」へ計画変更を即決

### 1.1 セットアップマイルストーン (Day 1-3)

| Day | 成果 |
|-----|------|
| Day 1 | Vite + React 18 + TS strict + Tailwind + shadcn/ui 初期化、`pnpm` 確定、Vercel Project 連携、GitHub Actions skeleton |
| Day 2 | `vite-plugin-pwa` で Service Worker 雛形、manifest.webmanifest、icons (192/512)、Dexie + fake-indexeddb 環境、Vitest + Playwright 起動 |
| Day 3 | Repository IF 完了、Dexie 実装スケルトン、ESLint + Prettier 強制、PR で Preview Deploy 動作確認 |

### 1.2 Core 実装タスク

#### Task 1.2.1: タイマー (時刻ベース)
- **設計原則**: タイマーは `Date.now() - session.startedAt` で都度算出。setInterval は UI 描画専用 (1秒tick)。
- **実装**:
  - `src/domain/body-status.ts` (純粋関数 `computeBodyStatus(start, now): BodyStatus`)
  - `src/store/timer-store.ts` (Zustand、UI tick state のみ)
  - `src/hooks/use-fasting-timer.ts` (Repository から active session を読み、tick で再計算)
  - `src/components/timer/TimerRing.tsx`
  - `src/components/timer/BodyStatusCard.tsx`
- **Acceptance Criteria**:
  - タブを閉じ→1時間後に再開して経過時間が正確
  - System clock 改竄テスト (Date.now を mock) で BodyStatus が phase 境界で正しく切り替わる
  - 60fps 維持 (Chrome DevTools Performance で confirm)
  - ユニットテスト: `computeBodyStatus` 全 phase boundary 網羅

#### Task 1.2.2: スケジュール (4プリセット)
- **実装**: `src/pages/SchedulePage.tsx`、`src/domain/schedule.ts`
- **プリセット**: morning (08-24)、evening (12-04)、shift (custom)、custom
- **Acceptance Criteria**:
  - LocalStorage に `UserProfile.lifestyle` が保存される
  - プリセット選択→ホーム遷移→次回開始時刻が表示される

#### Task 1.2.3: SOS 画面
- **実装**: `src/pages/SOSPage.tsx`、`src/components/sos/FoodCategoryGrid.tsx`
- **Acceptance Criteria**:
  - SOS タップで FastingSession.sosEvents に push される
  - SOS 履歴がセッション内で表示される
  - SOS 後にタイマーは継続 (リセットしない)

#### Task 1.2.4: オンボーディング
- **画面遷移**: 医療免責同意 → ライフスタイル選択 → PWA インストール案内 (iOS は画像付) → 通知許諾 → `navigator.storage.persist()` 要求
- **Acceptance Criteria**:
  - `termsAcceptedAt` と `termsVersion` が必ず保存される
  - `notificationEnabled` フラグが Permission API の結果と整合
  - persist denied 時は警告 banner が常時表示

### 1.3 通知基盤 (CRITICAL)

#### Task 1.3.1: PushSubscription 取得・保存
- **クライアント**: `src/infra/notifications/push-subscription.ts`
- **サーバ**: `api/subscribe.ts` (Vercel Edge Function) — Supabase or Upstash Redis に保存
- **Acceptance Criteria**:
  - 通知許諾→自動的に subscribe→サーバに保存される
  - 重複 subscribe を防ぐ (endpoint をユニークキー)

#### Task 1.3.2: VAPID Push 配信
- **サーバ**: `api/trigger-fasting-end.ts`
- **トリガ方式 (推奨): クライアント発火 + Vercel Cron**
  - active session DB に scheduledEndAt を入れ、cron が満了をスキャン
  - 単純、精度±1分
- **Acceptance Criteria**:
  - 16時間タイマー満了時に push が iOS / Android で表示される
  - サーバ側ログで 送信成功/失敗 を確認できる

#### Task 1.3.3: Service Worker push handler
- **実装**: `src/sw/service-worker.ts` の `self.addEventListener('push', ...)`
- **Acceptance Criteria**:
  - push 受信→ `self.registration.showNotification()` でローカル通知表示
  - 通知タップで PWA がフォアグラウンドに復帰

#### Task 1.3.4: フォールバック (復帰時補正)
- **実装**: アプリ復帰 (`visibilitychange`) で `Date.now() - session.scheduledEndAt > 0` をチェックし、未通知なら in-app banner 表示
- **Acceptance Criteria**:
  - 通知許諾なし or push 失敗時に必ず動作

### 1.4 データ移行・エクスポート (Phase 2 から前倒し)

#### Task 1.4.1: JSON Export / Import
- **実装**: `src/infra/export-service.ts` (`DexieExportService implements IExportService`)
- **形式**: `{ version: 1, profile, sessions[], workouts[], metrics[] }`
- **Acceptance Criteria**:
  - エクスポートしたファイルを別ブラウザでインポート→データ復元
  - schema version mismatch 時にエラーを明示

### 1.5 テスト・品質ゲート

- ドメイン層 90%+ カバレッジ (Vitest)
- E2E: タイマー開始→停止 / SOS 記録 / オンボーディング完走 (Playwright)
- iOS Safari 17+ 実機マトリクス手動確認

### 1.6 意思決定ゲート (Phase 1 完了時)

| ゲート | 判定基準 | 通過時 | 失敗時 |
|-------|---------|--------|--------|
| **Gate A (Day 10)** | iOS 実機で VAPID Push が 16時間後に着信 | Phase 1 完了基準に通知必須化 | フォールバック専用モードへ計画変更、Phase 1 短縮 |
| **Gate B (Phase 1 完了時)** | タイマー精度 / SOS / Persistence / Notifications すべて Pass | Phase 2 着手 | 失敗領域を1週間バッファで再対応 |

---

## 2. Phase 2・3 概要

### Phase 2: 筋トレ + ダッシュボード (2週間)

| Week | 主要タスク | 依存 |
|------|----------|------|
| W1 | `WorkoutService` + `DexieWorkoutRepository`、Exercise Form UI、ストリーク計算 | Phase 1 Repository IF |
| W2 | `HealthMetricService`、Recharts でダッシュボード (体重/血糖/気分推移)、統合テスト | WorkoutService 完了 |

### Phase 3: コラム + 通知最適化 (1.5-2週間)

- 通知 UX 最適化 (頻度調整、quiet hours)
- 静的コラム配信・UI
- 全フロー E2E + iOS 実機マトリクス

---

## 3. 開発環境・ツール

### ランタイム・フレームワーク

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | **20.x LTS** | Vercel 互換 |
| pnpm | **9.x** | パッケージ管理 |
| TypeScript | **5.4+** | strict mode |
| React | **18.2+** | UI Framework |
| Vite | **5.x** | ビルド |
| Service Worker | vite-plugin-pwa | PWA |

### テスト・品質

| ツール | 用途 |
|--------|------|
| Vitest | Unit + Integration |
| Playwright | E2E |
| fake-indexeddb | IndexedDB mock |
| ESLint | Code lint |
| Prettier | Format |

### CI/CD

- **GitHub Actions**: lint → test → build → preview deploy
- **Vercel**: main branch 自動本番デプロイ
- **Branch protection**: PR + all checks pass 必須

---

## 4. 技術的チェックリスト

### Repository インターフェース実装
- [ ] domain/ → infra/ import ゼロ (ESLint 強制)
- [ ] 各 Repository が IF を完全実装
- [ ] V2 でクラウド実装に差し替え可能な設計

### Storage Persistence テスト
- [ ] `navigator.storage.persisted()` 起動時チェック
- [ ] iOS 17 実機で 7日放置テスト
- [ ] clear site data 後の復旧テスト (export/import)

### VAPID 署名テスト
- [ ] VAPID キーペア生成 (web-push CLI)
- [ ] iOS 実機での PushSubscription 取得
- [ ] 16時間後の push 配信確認

### iOS 実機テスト前提
- [ ] iOS 16.4 以上の実機
- [ ] HTTPS 配信確認 (Vercel)
- [ ] PWA ホーム画面追加
- [ ] Safari Push API フラグ有効

---

## 5. リスク・意思決定ゲート

### Phase 1 完了ゲート

| 項目 | 基準 | 失敗時 |
|------|------|--------|
| iOS Push | >= 90% 着信率 | フォールバック専用へ転換 |
| タイマー精度 | ±10秒/16h | ロジック見直し |
| Storage 永続化 | persist() 許諾 50%+ | UI 改善で誘導 |

### 通知不可時のフォールバック
- In-app banner only
- Periodic Sync (Chrome)
- メール連携 (Phase 4+)

---

## 6. デプロイ・運用

### Vercel 連携
- **Project**: https://vercel.com/53ables-projects-6a9f4ad2
- **Repo**: https://github.com/53able
- **Branch**: main (本番) / develop (staging) / PR (preview)

### GitHub Actions
```
lint → typecheck → test → e2e → build → preview deploy (PR)
```

### ステージング検証
- Lighthouse スコア 90+ (PWA)
- iOS/Android 実機テスト
- Service Worker 更新フロー
- Sentry エラー 0 件

---

## 7. ファイル初期構成 (Day 1)

```
src/
├── domain/
│   ├── types.ts
│   ├── body-status.ts
│   ├── schedule.ts
│   └── ports/
│       ├── fasting-repository.ts
│       ├── workout-repository.ts
│       ├── health-metric-repository.ts
│       ├── notification-gateway.ts
│       └── export-service.ts
├── application/
│   ├── fasting-service.ts
│   ├── workout-service.ts
│   └── health-metric-service.ts
├── infra/
│   ├── db.ts
│   ├── repositories/
│   │   ├── dexie-fasting-repository.ts
│   │   ├── dexie-workout-repository.ts
│   │   └── dexie-health-repository.ts
│   ├── notifications/
│   │   ├── push-subscription.ts
│   │   └── notification-gateway.ts
│   └── export/
│       └── dexie-export-service.ts
├── pages/
│   ├── HomePage.tsx
│   ├── OnboardingPage.tsx
│   ├── SchedulePage.tsx
│   ├── SOSPage.tsx
│   ├── WorkoutPage.tsx
│   ├── DashboardPage.tsx
│   └── ColumnsPage.tsx
├── components/
│   ├── timer/
│   │   ├── TimerRing.tsx
│   │   └── BodyStatusCard.tsx
│   ├── sos/
│   │   └── FoodCategoryGrid.tsx
│   └── ui/
├── store/
│   ├── timer-store.ts
│   └── ui-store.ts
├── hooks/
│   ├── use-fasting-timer.ts
│   ├── use-active-session.ts
│   └── use-notification-permission.ts
└── sw/
    └── service-worker.ts

api/
├── subscribe.ts
└── trigger.ts

.github/workflows/
└── ci.yml

public/
├── manifest.webmanifest
├── icons/
└── columns/
    └── index.json
```

---

## 8. 工数サマリ

| Phase | 期間 | 主要成果 |
|-------|------|---------|
| Phase 1 | 3-4週 | タイマー / SOS / 通知基盤 / Persistence |
| Phase 2 | 2週 | 筋トレ / ダッシュボード |
| Phase 3 | 1.5-2週 | コラム / iOS 実機検証 |
| **合計** | **6.5-8週** | MVP リリース |

