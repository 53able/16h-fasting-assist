/**
 * Domain Service - Body Status Calculator
 * Pure function with no framework dependencies.
 * Derives BodyStatus from fasting session timestamps.
 */

import { BodyStatus, ISO8601String } from '../types';

type Phase = BodyStatus['phase'];

interface PhaseRange {
  phase: Phase;
  minHours: number;
  maxHours: number;
  description: string;
}

const PHASE_RANGES: PhaseRange[] = [
  {
    phase: 'digestion',
    minHours: 0,
    maxHours: 2,
    description: '消化中：食べた物を消化・吸収しています。血糖値が上昇し、インスリンが分泌されています。',
  },
  {
    phase: 'glycogen-depletion',
    minHours: 2,
    maxHours: 10,
    description: 'グリコーゲン消費中：肝臓と筋肉のグリコーゲンが使われています。血糖値が安定してきます。',
  },
  {
    phase: 'fat-burning',
    minHours: 10,
    maxHours: 16,
    description: '脂肪燃焼中：グリコーゲンが枯渇し、体脂肪をエネルギーとして燃やし始めています。ケトン体が増加中。',
  },
  {
    phase: 'autophagy',
    minHours: 16,
    maxHours: Infinity,
    description: 'オートファジー活性中：細胞の自己修復が活発になっています。古いタンパク質や細胞小器官が分解・再利用されています。',
  },
];

const TARGET_HOURS = 16;

function determinePhase(elapsedHours: number): PhaseRange {
  for (const range of PHASE_RANGES) {
    if (elapsedHours < range.maxHours) {
      return range;
    }
  }
  return PHASE_RANGES[PHASE_RANGES.length - 1];
}

/**
 * Calculate body status from fasting session timestamps.
 *
 * @param startedAt - ISO8601 timestamp when fasting started
 * @param scheduledEndAt - ISO8601 timestamp when fasting is scheduled to end
 * @returns BodyStatus with elapsed hours, remaining hours, phase, description, and progress ratio
 */
export function calculateBodyStatus(
  startedAt: ISO8601String,
  scheduledEndAt: ISO8601String,
): BodyStatus {
  const now = Date.now();
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(scheduledEndAt).getTime();

  const totalMs = endMs - startMs;
  const elapsedMs = Math.max(0, now - startMs);

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const targetHours = totalMs > 0 ? totalMs / (1000 * 60 * 60) : TARGET_HOURS;
  const remainingHours = Math.max(0, targetHours - elapsedHours);

  const phaseRange = determinePhase(elapsedHours);

  // progressRatio: 0.0 at start, 1.0 at scheduledEndAt (capped)
  const progressRatio = targetHours > 0 ? Math.min(1, elapsedHours / targetHours) : 0;

  return {
    elapsedHours,
    remainingHours,
    phase: phaseRange.phase,
    description: phaseRange.description,
    progressRatio,
  };
}
