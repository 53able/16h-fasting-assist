/**
 * CountdownTimer Component
 * Displays HH:MM:SS countdown with Start/Pause/Reset controls.
 * Uses zustand timer store and calculates real elapsed time.
 * Auto-resumes on browser reload if session is active.
 */

import { useEffect, useCallback } from 'react';
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

  // Auto-resume on mount if session is active, always recompute real elapsed time
  useEffect(() => {
    if (session?.status === 'active') {
      // Compute real elapsed time from timestamps and sync to store
      const realElapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000),
      );
      useTimerStore.setState({ elapsedSeconds: realElapsed, isRunning: true, lastTickTime: Date.now() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.startedAt]);

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
      {/* HH:MM:SS countdown */}
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
