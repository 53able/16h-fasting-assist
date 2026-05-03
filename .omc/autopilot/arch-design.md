# 16時間空腹アシスト — 技術設計書

## Summary

Web (React + TypeScript) + PWA構成で、IndexedDB を主データストア、Web Push (VAPID) サーバをバックグラウンド通知基盤とする。MVP は Phase 1（タイマー+スケジュール+SOS+通知基盤）→ Phase 2（筋トレ+ダッシュボード）→ Phase 3（コラム+通知最適化）の3段階で実装。最大の技術的リスク（iOS Safari の Web Push 制限、Storage eviction）を Phase 1 で検証する計画。通知は Service Worker `setTimeout` ではなく VAPID (Web Push Protocol) サーバで実装し、短時間の存続期間を前提とする。

---

## 1. システムアーキテクチャ

### 1.1 レイヤー構成図

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (PWA Shell)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Presentation Layer (React)                 │  │
│  │  - Pages: Home / Schedule / SOS / Workout / Dashboard  │  │
│  │  - Components: TimerRing, BodyStatusViz, MealCard      │  │
│  │  - State: Zustand (UI state) + TanStack Query (cache)  │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ↕                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Application Layer (Use Cases)              │  │
│  │  - FastingService / WorkoutService / HealthService     │  │
│  │  - NotificationScheduler / OnboardingFlow              │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ↕                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Domain Layer (Pure TypeScript)             │  │
│  │  - FastingSession (entity) / BodyStatus (VO)           │  │
│  │  - Schedule / Workout / HealthMetric                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                            ↕                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Infrastructure Layer                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │  IndexedDB   │  │ LocalStorage │  │  Static JSON │ │  │
│  │  │  (Dexie.js)  │  │  (settings)  │  │  (columns)   │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↕ (postMessage / BroadcastChannel)
┌──────────────────────────────────────────────────────────────┐
│              Service Worker (Background Layer)                │
│  - Notification scheduling (setTimeout + alarm fallback)      │
│  - Cache strategy (Workbox)                                   │
│  - Periodic Sync (Chrome only) for status check               │
└──────────────────────────────────────────────────────────────┘

V2+ 拡張ポイント (将来):
  ↓
┌──────────────────────────────────────────────────────────────┐
│  Cloud Sync API (Firebase Auth + Firestore / Supabase)        │
│  - Repository interface を切り替えるだけで対応可能            │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 アーキテクチャ原則

- **Hexagonal (Ports & Adapters)**: Domain層は IndexedDB に依存しない。`IFastingRepository` 抽象を通してアクセスし、V2 でクラウド同期に差し替え可能。
- **Single Source of Truth**: タイマー状態は IndexedDB が真実。UI の Zustand store は派生キャッシュ。
- **Offline First**: 全機能がオフラインで動作。ネットワークは Phase 3 のコラム取得のみで使用。

---

## 2. 技術スタック

### 2.1 フロントエンド

| カテゴリ | 技術 | 採用理由 |
|---------|------|---------|
| ビルド | **Vite 5+** | HMR 高速、PWA プラグイン (`vite-plugin-pwa`) が成熟 |
| 言語 | **TypeScript 5.x** (strict) | 型安全、ドメインモデルの不変条件を型で表現 |
| UI Framework | **React 18+** | エコシステム成熟、Concurrent Features でタイマー UI に有利 |
| Routing | **React Router 6** | SPAルーティング。タブベース構成 |
| State (UI) | **Zustand** | Redux より軽量、タイマー tick の頻繁な更新に強い |
| State (Server) | **TanStack Query v5** | コラム配信のキャッシュ。V2 同期時にも流用可 |
| スタイル | **Tailwind CSS** + **shadcn/ui** | 開発速度、スマホ最適化が容易 |
| アイコン | **Lucide React** | 軽量、tree-shakable |
| 図表 | **Recharts** | ダッシュボードグラフ（体重・血糖等の推移） |
| 日付 | **date-fns** | tree-shakable、moment より軽量 |

### 2.2 データストア

| ストア | 用途 | 採用理由 |
|--------|------|---------|
| **IndexedDB** (via Dexie.js) | FastingSession, WorkoutLog, HealthMetric の永続化 | 容量50MB+、トランザクション、複合インデックス対応。Dexie で型安全アクセス |
| **LocalStorage** | ユーザープロフィール、設定、利用規約同意フラグ | 同期APIで起動時の即時読み込みに適する。<5KBの小規模データ |
| **静的JSON** (`/public/columns/*.json`) | コラム記事 (Phase 3 初期版) | バックエンド不要、CDN キャッシュ可能 |

### 2.3 通知・スケジューリング (REVISED: VAPID Web Push ベース)

**実装方針（Critical Review by Critic より修正）**:

Service Worker の `setTimeout` がアプリ kill 後に保持されないため、信頼できる通知には **Web Push Protocol (VAPID)** サーバからのプッシュを使用。

| 機構 | 用途 | 制約 |
|------|------|------|
| **Web Push (VAPID)** | 16時間経過通知（サーバプッシュ） | iOS Safari PWA (16.4+) のみ、Notification.requestPermission() 必須 |
| **Local Notification API** (fallback) | フォアグラウンド時のみ表示 | Service Worker `setTimeout` は 30秒程度で kill される |
| **Periodic Background Sync** | (Chrome Android のみ) 定期ステータス同期 | iOS 非対応 |

**VAPID サーバ実装**:
- Cloudflare Workers / Vercel Edge Functions / Lambda などの軽量サーバ
- User のブラウザから `PushSubscription` (endpoint + keys) を取得、サーバ保存
- 16時間タイマー満了時に VAPID 署名付き POST で プッシュ配信
- バックエンド省力化のため、Vercel Cron Functions + Supabase Edge Function の組み合わせも検討

**iOS Safari フォールバック**:
- PWA インストール + 通知許諾が不可かつの場合、アプリ復帰時に「過去未発火通知」をダイジェスト表示
- アプリ復帰時に `Date.now()` と `session.startedAt` の差分から経過時間を再計算（タイマーは時刻ベース）
- 「完全なリアルタイム通知」ではなく「復帰時補正」で許容する設計に転換

---

## 3. データモデル・永続化戦略

### 3.0 Storage Persistence 戦略 (ADDED: Critical C1 対応)

**問題**: iOS Safari PWA は ITP (Intelligent Tracking Prevention) により、**7日間アクセスがないと IndexedDB / LocalStorage が自動削除**される。

**対処方針**:
1. **`navigator.storage.persist()` を必須化**: オンボーディング段階で `navigator.storage.persistent()` で永続化許可を要求。許可されない場合は警告を表示。
2. **ホーム画面追加を強制**: オンボーディング後に iOS PWA インストール手順を画像付きで提示。ホーム画面追加された PWA は eviction 制約が緩和される（ただし完全保証ではない）。
3. **データエクスポート機能を Phase 1 に前倒し**: ブラウザデータクリアや eviction 後の復旧手段として、JSON エクスポート (ダウンロード) + インポート機能を Phase 1 で実装。
4. **起動時の persistent() チェック**: 毎起動時に `navigator.storage.persisted()` をチェックし、未許諾なら警告 UI を表示。

**実装**:
```typescript
// src/infra/storage/persistence.ts
export async function ensurePersistent(): Promise<boolean> {
  if (navigator.storage?.persist) {
    const isPersistent = await navigator.storage.persist();
    if (!isPersistent) {
      console.warn('Storage persistence denied. Data may be auto-deleted in 7 days.');
      return false;
    }
    return true;
  }
  // persistent() 非対応環境 (非PWA等) では true を返す（スキップ）
  return true;
}
```

### 3.1 TypeScript 型定義

```typescript
// src/domain/types.ts

/** ユーザープロフィール (LocalStorage) */
export interface UserProfile {
  id: string;
  createdAt: ISO8601String;
  lifestyle: 'morning' | 'evening' | 'shift' | 'custom';
  defaultFastingHours: number;
  notificationEnabled: boolean;
  termsAcceptedAt: ISO8601String | null;
  termsVersion: string;
}

/** 空腹セッション (IndexedDB) */
export interface FastingSession {
  id: string;
  startedAt: ISO8601String;
  scheduledEndAt: ISO8601String;
  completedAt: ISO8601String | null;
  targetHours: number;
  status: 'active' | 'completed' | 'aborted';
  sosEvents: SOSEvent[];
  bodyStatusSnapshots: BodyStatusSnapshot[];
}

/** 筋トレログ (IndexedDB) */
export interface WorkoutLog {
  id: string;
  performedAt: ISO8601String;
  type: 'bodyweight' | 'weights' | 'cardio' | 'flexibility';
  exercises: ExerciseEntry[];
  durationMinutes: number;
  fastingSessionId: string | null;
  note: string | null;
}

/** 健康指標 (IndexedDB) */
export interface HealthMetric {
  id: string;
  recordedAt: ISO8601String;
  type: 'weight' | 'body-fat' | 'blood-glucose' | 'mood' | 'energy';
  value: number;
  unit: string;
  note: string | null;
}

type ISO8601String = string;
```

---

## 3.2 Repository インターフェース (Ports) — ADDED: Critical C3 対応

ドメイン層が Infrastructure に依存しないよう、抽象インターフェースを domain/ports/ に定義：

```typescript
// src/domain/ports/fasting-repository.ts
export interface IFastingRepository {
  save(session: FastingSession): Promise<void>;
  findById(id: string): Promise<FastingSession | null>;
  findActive(): Promise<FastingSession | null>;
  findByDateRange(from: Date, to: Date): Promise<FastingSession[]>;
  delete(id: string): Promise<void>;
}

// src/domain/ports/workout-repository.ts
export interface IWorkoutRepository {
  save(log: WorkoutLog): Promise<void>;
  findByDateRange(from: Date, to: Date): Promise<WorkoutLog[]>;
  delete(id: string): Promise<void>;
}

// src/domain/ports/health-metric-repository.ts
export interface IHealthMetricRepository {
  save(metric: HealthMetric): Promise<void>;
  findByType(type: HealthMetric['type'], days: number): Promise<HealthMetric[]>;
  delete(id: string): Promise<void>;
}

// src/domain/ports/notification-gateway.ts
export interface INotificationGateway {
  subscribeToPushNotifications(): Promise<PushSubscription>;
  sendNotification(title: string, options: NotificationOptions): Promise<void>;
}

// src/domain/ports/export-service.ts
export interface IExportService {
  exportAllData(): Promise<ExportData>;
  importData(data: ExportData): Promise<void>;
}
```

**V2+ での差し替え**:
- Phase 1: `DexieFastingRepository`, `DexieWorkoutRepository` (IndexedDB 実装)
- V2: `SupabaseFastingRepository`, `SupabaseWorkoutRepository` (クラウド同期)

---

## 4. ファイル構成

```
src/
├── main.tsx
├── App.tsx
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
├── domain/
│   ├── types.ts
│   ├── body-status.ts
│   └── schedule.ts
├── application/
│   ├── fasting-service.ts
│   ├── workout-service.ts
│   └── health-metric-service.ts
├── infra/
│   ├── db.ts
│   ├── repositories/
│   └── notifications/
├── store/
│   ├── timer-store.ts
│   └── ui-store.ts
├── hooks/
│   ├── use-fasting-timer.ts
│   └── use-active-session.ts
└── sw/
    └── service-worker.ts

public/
├── manifest.webmanifest
├── icons/
└── columns/
    └── index.json
```

---

## 5. 実装フェーズ (REVISED: 通知をPhase 1に前倒し)

### Phase 1 (MVP コア + 通知基盤) — 3-4週間

**目的**: 基本的なタイマー + 通知の実装可能性をすべて検証する

**前置タスク**:
- Repository インターフェース定義 (domain/ports/)
- Dexie schema v1 確定 (複合インデックス含)
- VAPID サーバ Spike (Cloudflare Workers/Vercel Edge Functions で WebPush 送信テスト)

**主要実装**:
- [ ] プロジェクトセットアップ (Vite + React + TS + Tailwind + Dexie + vite-plugin-pwa)
- [ ] PWA 基盤 (manifest.webmanifest, service-worker.ts skeleton)
- [ ] Storage persistence 戦略実装 (`navigator.storage.persist()` + 起動時チェック)
- [ ] オンボーディング (医療免責同意 + PWA インストール案内 + 通知許諾)
- [ ] ドメイン層: `FastingSession`, `BodyStatus` 計算 (純粋関数)
- [ ] Repository インターフェース + Dexie 実装
- [ ] `FastingService` (ドメイン層ロジック)
- [ ] ホーム画面 (TimerRing + BodyStatusCard)
- [ ] スケジュール設定 (4プリセット)
- [ ] SOS 画面 (記録ロジック)
- [ ] **通知基盤 Spike** (CRITICAL C2 対応):
  - PushSubscription 取得・サーバ保存
  - VAPID サーバからの 16時間満了プッシュ送信テスト (iOS実機)
  - Service Worker push イベント ハンドラ
- [ ] データエクスポート・インポート機能 (JSON) — **Phase 2 から前倒し**
- [ ] ユニットテスト (ドメイン層 90%+ カバレッジ)
- [ ] E2E テスト (タイマー開始→停止シナリオ)

**完了基準**:
- タブを閉じて再開してもタイマーが正確に継続する
- iOS 実機 (PWA インストール) で 16時間通知が受信される or フォールバック補正が動作する
- 通知実装不可の場合、代替案を決定

### Phase 2 (筋トレ + ダッシュボード) — 2週間

- [ ] `WorkoutService` + `IWorkoutRepository` 実装
- [ ] 筋トレ記録 UI (Exercise Form)
- [ ] 筋トレ履歴 + ストリーク
- [ ] `HealthMetricService` + 実装
- [ ] ダッシュボード (Recharts でグラフ表示)
- [ ] 統合テスト

### Phase 3 (コラム + 通知最適化) — 1.5-2週間

- [ ] 通知 UX 最適化
- [ ] 静的コラム配信 (`/public/columns/index.json`)
- [ ] コラム一覧/詳細画面
- [ ] E2E テスト (全フロー統合)
- [ ] iOS 実機マトリクステスト

**総工数**: 6-8週間 (iOS 実機テストバッファ 1-2週を含む)

---

## 6. テスト戦略

### 6.1 ユニットテスト (Vitest)

**対象**: ドメイン層の純粋関数、Service ロジック

```typescript
describe('computeBodyStatus', () => {
  it('returns digestion phase before 4 hours', () => {
    const start = new Date('2026-05-03T08:00:00Z');
    const now = new Date('2026-05-03T11:00:00Z');
    expect(computeBodyStatus(start, now).phase).toBe('digestion');
  });
});
```

### 6.2 統合テスト (Vitest + fake-indexeddb)

**対象**: Service ↔ Repository ↔ IndexedDB の連携

### 6.3 E2E テスト (Playwright)

**対象**: ユーザーフロー全体、PWA 挙動

---

## 7. デプロイ・運用

### 7.1 ホスティング

**推奨**: Vercel（バックエンド不要のため）

### 7.2 デバイステストマトリクス

| デバイス | OS/Browser | 必須確認項目 |
|---------|-----------|-------------|
| iPhone 14+ | iOS 17+ Safari | PWAインストール、通知、タイマー精度 |
| Android Pixel | Chrome 最新 | Periodic Sync、通知、PWA |

### 7.3 監視・ロギング

- **エラー追跡**: Sentry (無料枠)
- **使用統計**: Plausible Analytics

---

## 8. リスク・トレードオフ分析

| リスク | 影響度 | 対処 |
|-------|-------|------|
| iOS Safari の通知制限 | 高 | PWA インストール案内、復帰時補正発火 |
| Service Worker のタイマー精度 | 高 | 時刻ベース計算 + IndexedDB 永続化 |
| ユーザーがブラウザデータをクリア | 中 | データエクスポート機能を Phase 2 で提供 |
| 健康データの法的責任 | 高 | 医療免責の同意必須化 |

---

## 9. V2+ 拡張ロードマップ

- **クラウド同期**: Repository インターフェースを Supabase / Firebase 実装に差し替え
- **Apple Health / Google Fit 連携**: 体重・心拍データ自動取り込み
- **ネイティブ化**: Capacitor で iOS/Android アプリストア配布
