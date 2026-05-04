/**
 * useNotificationFallback Hook
 * Detects app resume and shows correction banner for milestones that passed while app was closed.
 * Stores last shown milestone in localStorage to avoid duplicate messages.
 */

import { useState, useEffect, useCallback } from 'react';
import { buildScheduledMilestones } from '../../domain/milestone-plan';
import type { FastingSession } from '../../domain/types';
import { getPushMilestoneBannerMessage } from '../services/api-client';

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

function buildResumeMilestoneList(targetHours: number): { hours: number; message: string }[] {
  const digestion = {
    hours: 2,
    message: '消化フェーズ完了！グリコーゲン消費がスタートしました。',
  };
  const pushLinked = buildScheduledMilestones(targetHours).map((m) => ({
    hours: m.hours,
    message: getPushMilestoneBannerMessage(m.label),
  }));
  return [digestion, ...pushLinked];
}

function getMissedMilestones(
  session: FastingSession,
  lastShownMilestone: number,
): { hours: number; message: string }[] {
  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const milestones = buildResumeMilestoneList(session.targetHours);
  return milestones.filter(
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
