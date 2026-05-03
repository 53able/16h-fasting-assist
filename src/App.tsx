/**
 * App - Main application component
 * Tab-based navigation integrating all Phase 1 Core UI components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FastingSession, ISO8601String } from './domain/types';
import { createISO8601String, now } from './domain/types';
import { useTimerStore } from './app/stores/timer-store';
import { useWorkout } from './app/hooks/useWorkout';
import { useSOS } from './app/hooks/useSOS';
import { useNotificationFallback } from './app/hooks/useNotificationFallback';
import { useNotificationScheduler } from './app/hooks/useNotificationScheduler';
import { CountdownTimer } from './app/components/CountdownTimer';
import { SOSButton } from './app/components/SOSButton';
import { SafeFoodList } from './app/components/SafeFoodList';
import { SOSEventTimeline } from './app/components/SOSEventTimeline';
import { WorkoutLogger } from './app/components/WorkoutLogger';
import { WorkoutStreak } from './app/components/WorkoutStreak';
import { WorkoutHistory } from './app/components/WorkoutHistory';
import { HealthMetricDashboard } from './app/components/HealthMetricDashboard';
import { NotificationBanner } from './app/components/NotificationBanner';
import { DexieFastingRepository } from './infra/repositories/dexie-fasting-repository';
import { DexieWorkoutRepository } from './infra/repositories/dexie-workout-repository';
import { DexieHealthMetricRepository } from './infra/repositories/dexie-health-metric-repository';
import {
  saveMilestoneTimestamp,
  getMilestoneTimestamp,
  checkMissingMilestones,
} from './infra/notification-storage';
import { NotificationGateway } from './infra/notification-gateway';
import { getOrCreateSubscriberId } from './infra/subscriber-id';

// Repository singletons — stable across renders
const fastingRepository = new DexieFastingRepository();
const workoutRepository = new DexieWorkoutRepository();
const healthMetricRepository = new DexieHealthMetricRepository();

const DEFAULT_FASTING_HOURS = 16;

type TabId = 'timer' | 'sos' | 'workout' | 'health';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { id: 'timer', label: 'タイマー', emoji: '⏱️' },
  { id: 'sos', label: 'SOS', emoji: '🆘' },
  { id: 'workout', label: 'ワークアウト', emoji: '💪' },
  { id: 'health', label: '健康', emoji: '📊' },
];

function createNewSession(): FastingSession {
  const startedAt = now();
  const scheduledEndMs =
    new Date(startedAt).getTime() + DEFAULT_FASTING_HOURS * 60 * 60 * 1000;
  const scheduledEndAt = createISO8601String(new Date(scheduledEndMs));

  return {
    id: crypto.randomUUID(),
    startedAt,
    scheduledEndAt,
    completedAt: null,
    targetHours: DEFAULT_FASTING_HOURS,
    status: 'active',
    sosEvents: [],
    bodyStatusSnapshots: [],
  };
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('timer');
  const [activeSession, setActiveSession] = useState<FastingSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showSafeFoodList, setShowSafeFoodList] = useState(false);

  const resetStore = useTimerStore((s) => s.reset);

  const { workouts, currentStreak, longestStreak } = useWorkout(workoutRepository);
  const { sosEvents, recordSOSEvent, deleteSOSEvent } = useSOS(
    fastingRepository,
    activeSession?.id ?? null,
  );
  const { showBanner, bannerMessage, closeBanner, showPushFallback } =
    useNotificationFallback(activeSession);

  const subscriberId = useMemo(() => getOrCreateSubscriberId(), []);

  const milestoneStorage = useMemo(
    () => ({
      saveMilestoneTimestamp,
      getMilestoneTimestamp,
      checkMissingMilestones,
    }),
    [],
  );

  useNotificationScheduler({
    sessionId: activeSession?.id ?? '',
    startedAt: (activeSession?.startedAt ?? '') as ISO8601String,
    subscriberId,
    storage: milestoneStorage,
    onFallback: showPushFallback,
  });

  // Load active session from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    fastingRepository
      .findActive()
      .then((session) => {
        if (!cancelled) {
          setActiveSession(session);
          setSessionLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Service worker + optional Web Push subscribe (after permission)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }
    const registerAndSubscribe = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      } catch {
        return;
      }
      const trySubscribe = (): void => {
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          subscriberId !== ''
        ) {
          const gateway = new NotificationGateway(null);
          void gateway.subscribeToPushNotifications(subscriberId);
        }
      };
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
          .then((p) => {
            if (p === 'granted') {
              trySubscribe();
            }
          })
          .catch(() => {});
      } else {
        trySubscribe();
      }
    };
    void registerAndSubscribe();
    return undefined;
  }, [subscriberId]);

  const handleStart = useCallback(async () => {
    if (activeSession !== null) return;
    const session = createNewSession();
    try {
      await fastingRepository.save(session);
      setActiveSession(session);
    } catch {
      // Persist failure — still update UI optimistically
      setActiveSession(session);
    }
  }, [activeSession]);

  const handlePause = useCallback(async () => {
    // Timer store pause handled by CountdownTimer; session stays active
  }, []);

  const handleReset = useCallback(async () => {
    if (activeSession !== null) {
      const aborted: FastingSession = {
        ...activeSession,
        status: 'aborted',
        completedAt: now(),
      };
      try {
        await fastingRepository.save(aborted);
      } catch {
        // Persist failure — proceed with UI reset
      }
    }
    resetStore();
    setActiveSession(null);
  }, [activeSession, resetStore]);

  const handleSOSPress = useCallback(async () => {
    setShowSafeFoodList(true);
    setActiveTab('sos');
    if (activeSession !== null) {
      try {
        await recordSOSEvent('other');
      } catch {
        // SOS record failure — UI already shows safe food list
      }
    }
  }, [activeSession, recordSOSEvent]);

  const handleWorkoutSaved = useCallback(() => {
    // useWorkout auto-refreshes; no extra action needed
  }, []);

  if (!sessionLoaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: '0.9375rem' }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      {/* Notification banner */}
      <NotificationBanner
        visible={showBanner}
        message={bannerMessage}
        onClose={closeBanner}
        type="success"
      />

      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            padding: '12px 0 0',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.01em',
            }}
          >
            16時間空腹アシスト
          </h1>
        </div>

        {/* Tab navigation */}
        <nav
          role="tablist"
          aria-label="メインナビゲーション"
          style={{
            display: 'flex',
            marginTop: '8px',
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '8px 4px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#10b981' : '#6b7280',
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: '0.6875rem',
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
                {tab.emoji}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main style={{ flex: 1, padding: '20px 16px 80px' }}>
        {/* Timer tab */}
        <section
          id="tabpanel-timer"
          role="tabpanel"
          aria-label="タイマー"
          hidden={activeTab !== 'timer'}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
            }}
          >
            <CountdownTimer
              session={activeSession}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
            />
          </div>

          {activeSession !== null && (
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <SOSButton onSOSPress={handleSOSPress} />
            </div>
          )}
        </section>

        {/* SOS tab */}
        <section
          id="tabpanel-sos"
          role="tabpanel"
          aria-label="SOSレスキュー"
          hidden={activeTab !== 'sos'}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* SOS button */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                緊急時レスキュー
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
                断食が辛くなったらSOSボタンを押してください
              </p>
              <SOSButton onSOSPress={handleSOSPress} />
            </div>

            {/* Safe food list */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                  安全な食品リスト
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSafeFoodList((v) => !v)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  {showSafeFoodList ? '閉じる' : '表示'}
                </button>
              </div>
              <SafeFoodList visible={showSafeFoodList} />
            </div>

            {/* SOS event timeline */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                SOSイベント履歴
              </h2>
              <SOSEventTimeline sosEvents={sosEvents} onDeleteEvent={deleteSOSEvent} />
            </div>
          </div>
        </section>

        {/* Workout tab */}
        <section
          id="tabpanel-workout"
          role="tabpanel"
          aria-label="ワークアウト"
          hidden={activeTab !== 'workout'}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Streak */}
            <WorkoutStreak
              currentStreak={currentStreak}
              longestStreak={longestStreak}
            />

            {/* Logger */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                ワークアウトを記録
              </h2>
              <WorkoutLogger
                repository={workoutRepository}
                sessionId={activeSession?.id ?? ''}
                onWorkoutSaved={handleWorkoutSaved}
              />
            </div>

            {/* History */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '20px',
              }}
            >
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                ワークアウト履歴
              </h2>
              <WorkoutHistory workouts={workouts} />
            </div>
          </div>
        </section>

        {/* Health tab */}
        <section
          id="tabpanel-health"
          role="tabpanel"
          aria-label="健康指標"
          hidden={activeTab !== 'health'}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '20px',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#111827',
              }}
            >
              健康指標ダッシュボード
            </h2>
            <HealthMetricDashboard repository={healthMetricRepository} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '600px',
          textAlign: 'center',
          padding: '8px 16px',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.6875rem',
          color: '#9ca3af',
        }}
      >
        v0.0.1 &mdash; 16時間空腹アシスト
      </footer>
    </div>
  );
}
