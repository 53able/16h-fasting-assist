/**
 * Domain Layer - Type Definitions
 * Pure TypeScript types with no framework dependencies.
 * All types are domain concepts, not database representations.
 */

export type ISO8601String = string & { readonly __brand: 'ISO8601' };

/** ユーザープロフィール */
export interface UserProfile {
  id: string; // UUID
  createdAt: ISO8601String;
  lifestyle: 'morning' | 'evening' | 'shift' | 'custom';
  defaultFastingHours: number;
  notificationEnabled: boolean;
  termsAcceptedAt: ISO8601String | null;
  termsVersion: string;
}

/** 空腹セッション */
export interface FastingSession {
  id: string; // UUID
  startedAt: ISO8601String;
  scheduledEndAt: ISO8601String;
  completedAt: ISO8601String | null;
  targetHours: number;
  status: 'active' | 'completed' | 'aborted';
  sosEvents: SOSEvent[];
  bodyStatusSnapshots: BodyStatusSnapshot[];
}

/** SOS イベント */
export interface SOSEvent {
  id: string; // UUID
  recordedAt: ISO8601String;
  foodCategory: 'nuts' | 'cheese' | 'protein-drink' | 'broth' | 'other';
  estimatedCalories: number | null;
  note: string | null;
}

/** 体内ステータス スナップショット */
export interface BodyStatusSnapshot {
  capturedAt: ISO8601String;
  phase: 'digestion' | 'glycogen-depletion' | 'fat-burning' | 'autophagy';
}

/** 体内ステータス（派生値） */
export interface BodyStatus {
  elapsedHours: number;
  remainingHours: number;
  phase: 'digestion' | 'glycogen-depletion' | 'fat-burning' | 'autophagy';
  description: string;
  progressRatio: number; // 0.0 - 1.0
}

/** 筋トレログ */
export interface WorkoutLog {
  id: string; // UUID
  performedAt: ISO8601String;
  type: 'bodyweight' | 'weights' | 'cardio' | 'flexibility';
  exercises: ExerciseEntry[];
  durationMinutes: number;
  fastingSessionId: string | null;
  note: string | null;
}

/** 運動エントリ */
export interface ExerciseEntry {
  name: string; // "腕立て伏せ", "スクワット"
  sets: number;
  reps: number;
  weightKg: number | null;
}

/** 健康指標 */
export interface HealthMetric {
  id: string; // UUID
  recordedAt: ISO8601String;
  type: 'weight' | 'body-fat' | 'blood-glucose' | 'mood' | 'energy';
  value: number;
  unit: string; // 'kg' | '%' | 'mg/dL' | 'score(1-5)'
  note: string | null;
}

/** プリセットスケジュール */
export interface PresetSchedule {
  id: string; // UUID
  name: string;
  fastingStartHour: number; // 0-23
  fastingDurationHours: number;
  lifestyle: UserProfile['lifestyle'];
  isCustom: boolean;
}

/** データエクスポート形式 */
export interface ExportData {
  version: number;
  exportedAt: ISO8601String;
  profile: UserProfile | null;
  sessions: FastingSession[];
  workouts: WorkoutLog[];
  metrics: HealthMetric[];
  presets: PresetSchedule[];
}


// ISO8601 文字列コンストラクタ
export function createISO8601String(date: Date | string): ISO8601String {
  if (typeof date === 'string') {
    return date as ISO8601String;
  }
  return date.toISOString() as ISO8601String;
}

// 現在時刻の ISO8601 文字列
export function now(): ISO8601String {
  return new Date().toISOString() as ISO8601String;
}
