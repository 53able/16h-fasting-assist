/**
 * CountdownTimer Component
 * Displays HH:MM:SS countdown with Start/Pause/Reset controls.
 * Uses zustand timer store and calculates real elapsed time.
 * Auto-resumes on browser reload if session is active.
 */

import { useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FastingSession } from '../../domain/types';
import { calculateBodyStatus } from '../../domain/services/body-status';
import { useTimerStore } from '../stores/timer-store';
import { BodyStatusDisplay } from './BodyStatusDisplay';

interface CountdownTimerProps {
  session: FastingSession | null;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function formatHHMMSS(totalSeconds: number): string {
  const absSeconds = Math.max(0, totalSeconds);
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

/**
 * Formats `scheduledEndAt` (ISO 8601) as local wall-clock time for the "hits 00:00:00" moment.
 */
function formatZeroAtClock(iso: string): string {
  return format(parseISO(iso), 'M月d日（EEE）HH:mm', { locale: ja });
}

/**
 * Derives elapsed seconds from wall clock vs {@link FastingSession.scheduledEndAt},
 * so remaining time matches "time until scheduled end" (same source as the corner label).
 *
 * @param session - Active fasting session (call only when `status === 'active'`).
 * @param nowMs - Current time in milliseconds (injectable for tests).
 * @returns Elapsed seconds in `[0, targetSeconds]`.
 */
function deriveElapsedSecondsFromScheduledEnd(session: FastingSession, nowMs: number): number {
  const targetSeconds = Math.max(
    0,
    Math.round(
      (new Date(session.scheduledEndAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
    ),
  );
  const endMs = new Date(session.scheduledEndAt).getTime();
  const remainingByWallClock = Math.max(0, Math.floor((endMs - nowMs) / 1000));
  const elapsed = targetSeconds - remainingByWallClock;
  return Math.min(targetSeconds, Math.max(0, elapsed));
}

export function CountdownTimer({ session, onStart, onPause, onReset }: CountdownTimerProps) {
  const { isRunning, elapsedSeconds, start, pause, reset, tick } = useTimerStore();

  // Derive remaining seconds from session or elapsed counter
  const targetSeconds = session
    ? Math.max(
        0,
        Math.round(
          (new Date(session.scheduledEndAt).getTime() - new Date(session.startedAt).getTime()) /
            1000,
        ),
      )
    : 0;

  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);

  // Auto-resume on mount if session is active; re-sync elapsed from scheduled end vs now
  useEffect(() => {
    if (session?.status === 'active') {
      const elapsed = deriveElapsedSecondsFromScheduledEnd(session, Date.now());
      useTimerStore.setState({ elapsedSeconds: elapsed, isRunning: true, lastTickTime: Date.now() });
    }
  }, [session]);

  // Tick every second while running
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      tick();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, tick]);

  const handleStart = useCallback(() => {
    start();
    onStart();
  }, [start, onStart]);

  const handlePause = useCallback(() => {
    pause();
    onPause();
  }, [pause, onPause]);

  const handleReset = useCallback(() => {
    reset();
    onReset();
  }, [reset, onReset]);

  const bodyStatus =
    session !== null
      ? calculateBodyStatus(session.startedAt, session.scheduledEndAt)
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      {/* HH:MM:SS countdown + corner label for wall-clock zero time */}
      <div
        style={{
          position: 'relative',
          alignSelf: 'stretch',
          maxWidth: 'min(100%, 22rem)',
          margin: '0 auto',
          paddingTop: '1.25rem',
        }}
      >
        {session !== null && (
          <time
            dateTime={session.scheduledEndAt}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '0.75rem',
              lineHeight: 1.3,
              color: '#6b7280',
              textAlign: 'right',
              maxWidth: '11rem',
            }}
          >
            0:00:00 になるのは
            <br />
            {formatZeroAtClock(session.scheduledEndAt)}
          </time>
        )}
        <div
          style={{
            fontSize: '4rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.05em',
            color: remainingSeconds === 0 && session !== null ? '#8b5cf6' : '#111827',
          }}
          aria-label={`残り時間 ${formatHHMMSS(remainingSeconds)}`}
        >
          {formatHHMMSS(remainingSeconds)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {elapsedSeconds > 0 ? '再開' : 'スタート'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f59e0b',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            一時停止
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            backgroundColor: '#fff',
            color: '#374151',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          リセット
        </button>
      </div>

      {/* Body status display */}
      {bodyStatus !== null && <BodyStatusDisplay bodyStatus={bodyStatus} />}
    </div>
  );
}
