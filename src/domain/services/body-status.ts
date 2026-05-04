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

const TARGET_HOURS_FALLBACK = 16;

const GOAL_SUB16_DESCRIPTION =
  '目標達成：設定した空腹時間を完了しました。無理のないペースで続けていきましょう。';

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
 * For goals under 16h, phase bands are scaled to the session length so the UI
 * does not imply late-stage autophagy before the scheduled end. For goals of
 * 16h or longer, wall-clock hours match the classic 16h milestone model.
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
  const targetHours =
    totalMs > 0 ? totalMs / (1000 * 60 * 60) : TARGET_HOURS_FALLBACK;
  const remainingHours = Math.max(0, targetHours - elapsedHours);

  const progressRatio = targetHours > 0 ? Math.min(1, elapsedHours / targetHours) : 0;

  if (elapsedHours >= targetHours) {
    if (targetHours >= 16) {
      return {
        elapsedHours,
        remainingHours: 0,
        phase: 'autophagy',
        description: PHASE_RANGES[3].description,
        progressRatio: 1,
      };
    }
    return {
      elapsedHours,
      remainingHours: 0,
      phase: 'fat-burning',
      description: GOAL_SUB16_DESCRIPTION,
      progressRatio: 1,
    };
  }

  const phaseLookupHours =
    targetHours < 16
      ? Math.min((elapsedHours / targetHours) * 16, 15.999)
      : elapsedHours;

  const phaseRange = determinePhase(phaseLookupHours);

  return {
    elapsedHours,
    remainingHours,
    phase: phaseRange.phase,
    description: phaseRange.description,
    progressRatio,
  };
}
