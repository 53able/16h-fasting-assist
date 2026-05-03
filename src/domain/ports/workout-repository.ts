/**
 * IWorkoutRepository - Port for Workout Log persistence
 * Domain layer abstraction. No infrastructure dependencies.
 */

import { WorkoutLog } from '../types';

export interface IWorkoutRepository {
  /**
   * 筋トレログを保存
   * Invariant: log.id は UUID4 形式
   * Invariant: log.performedAt は過去の時刻
   */
  save(log: WorkoutLog): Promise<void>;

  /**
   * 日付範囲内のログを取得（カレンダー表示・グラフ用）
   * Invariant: performedAt の昇順に返す
   */
  findByDateRange(from: Date, to: Date): Promise<WorkoutLog[]>;

  /**
   * ログを削除
   */
  delete(id: string): Promise<void>;

  /**
   * 特定の空腹セッション中に行われたワークアウトを取得
   */
  findByFastingSessionId(sessionId: string): Promise<WorkoutLog[]>;

  /**
   * ワークアウトの連続実施日数（ストリーク）を計算
   * Invariant: 今日から遡って連続した記録日数を返す
   */
  calculateStreak(): Promise<{ currentStreak: number; longestStreak: number }>;
}
