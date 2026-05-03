/**
 * Infrastructure Layer - Dexie Health Metric Repository
 * Implements IHealthMetricRepository using Dexie/IndexedDB.
 */

import Dexie from 'dexie';
import { db } from '../db';
import { IHealthMetricRepository } from '../../domain/ports/health-metric-repository';
import { HealthMetric } from '../../domain/types';

export class DexieHealthMetricRepository implements IHealthMetricRepository {
  async save(metric: HealthMetric): Promise<void> {
    await db.healthMetrics.put(metric);
  }

  async findByType(type: HealthMetric['type'], days: number): Promise<HealthMetric[]> {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const metrics = await db.healthMetrics
      .where('[type+recordedAt]')
      .between([type, fromISO], [type, toISO], true, true)
      .toArray();

    return metrics.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  async delete(id: string): Promise<void> {
    await db.healthMetrics.delete(id);
  }

  async findLatestByAllTypes(): Promise<Record<HealthMetric['type'], HealthMetric | null>> {
    const types: HealthMetric['type'][] = [
      'weight',
      'body-fat',
      'blood-glucose',
      'mood',
      'energy',
    ];

    const results = await Promise.all(
      types.map(async (type) => {
        const metric = await db.healthMetrics
          .where('[type+recordedAt]')
          .between([type, Dexie.minKey], [type, Dexie.maxKey])
          .last();
        return [type, metric ?? null] as const;
      })
    );

    return Object.fromEntries(results) as Record<HealthMetric['type'], HealthMetric | null>;
  }

  async findByDateRange(from: Date, to: Date): Promise<HealthMetric[]> {
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const metrics = await db.healthMetrics
      .where('recordedAt')
      .between(fromISO, toISO, true, true)
      .toArray();

    return metrics.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }
}
