/**
 * IHealthMetricRepository - Port for Health Metric persistence
 * Domain layer abstraction. No infrastructure dependencies.
 */

import { HealthMetric } from '../types';

export interface IHealthMetricRepository {
  /**
   * 健康指標を保存
   * Invariant: metric.id は UUID4 形式
   * Invariant: metric.recordedAt は過去の時刻
   */
  save(metric: HealthMetric): Promise<void>;

  /**
   * 特定の指標タイプのデータを取得（ダッシュボード用）
   * Invariant: recordedAt の昇順に返す
   * @param type 指標タイプ（weight / body-fat / blood-glucose など）
   * @param days 過去 N 日間のデータ
   */
  findByType(type: HealthMetric['type'], days: number): Promise<HealthMetric[]>;

  /**
   * 指標を削除
   */
  delete(id: string): Promise<void>;

  /**
   * 全指標タイプの最新データを取得
   */
  findLatestByAllTypes(): Promise<Record<HealthMetric['type'], HealthMetric | null>>;

  /**
   * 日付範囲内のすべての指標を取得
   */
  findByDateRange(from: Date, to: Date): Promise<HealthMetric[]>;
}
