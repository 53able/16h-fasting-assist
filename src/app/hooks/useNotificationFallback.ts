/**
 * useNotificationFallback Hook
 * Detects app resume and shows correction banner for milestones that passed while app was closed.
 * Stores last shown milestone in localStorage to avoid duplicate messages.
 */

import { useState, useEffect, useCallback } from 'react';
import { FastingSession } from '../../domain/types';

const STORAGE_KEY = 'notification_fallback_last_milestone';

interface LastMilestoneRecord {
  sessionId: string;
  lastShownMilestone: number;
}

function getLastMilestoneRecord(): LastMilestoneRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as LastMilestoneRecord;
  } catch {
    return null;
  }
}

function setLastMilestoneRecord(record: LastMilestoneRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage may be unavailable in some contexts; fail silently
  }
}

/** Milestone thresholds in hours with their messages */
const MILESTONES: { hours: number; message: string }[] = [
  { hours: 2, message: '消化フェーズ完了！グリコーゲン消費がスタートしました。' },
  { hours: 10, message: '脂肪燃焼がスタート！ケトン体が増加しています。' },
  { hours: 16, message: 'オートファジー活性！細胞の自己修復が始まりました。' },
];

function getMissedMilestones(
  session: FastingSession,
  lastShownMilestone: number,
): { hours: number; message: string }[] {
  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  return MILESTONES.filter(
    (m) => m.hours <= elapsedHours && m.hours > lastShownMilestone,
  );
}

export interface UseNotificationFallbackResult {
  showBanner: boolean;
  bannerMessage: string;
  closeBanner: () => void;
  /** Surfaces a banner when Web Push API (`/api/trigger`) fails after retries. */
  showPushFallback: (message: string) => void;
}

export function useNotificationFallback(
  activeSession: FastingSession | null,
): UseNotificationFallbackResult {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  const closeBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  const showPushFallback = useCallback((message: string) => {
    setBannerMessage(message);
    setShowBanner(true);
  }, []);

  useEffect(() => {
    if (activeSession === null) return;

    const record = getLastMilestoneRecord();
    const lastShownMilestone =
      record !== null && record.sessionId === activeSession.id
        ? record.lastShownMilestone
        : 0;

    const missed = getMissedMilestones(activeSession, lastShownMilestone);
    if (missed.length === 0) return;

    // Show the most advanced milestone message
    const latest = missed[missed.length - 1];
    setBannerMessage(latest.message);
    setShowBanner(true);

    setLastMilestoneRecord({
      sessionId: activeSession.id,
      lastShownMilestone: latest.hours,
    });
  }, [activeSession]);

  return { showBanner, bannerMessage, closeBanner, showPushFallback };
}
