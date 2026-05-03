/**
 * Health Metric Service
 * Saves and retrieves HealthMetric records via IHealthMetricRepository.
 */

import { IHealthMetricRepository } from '../../domain/ports/health-metric-repository';
import { HealthMetric, now } from '../../domain/types';

export async function saveMetric(
  repository: IHealthMetricRepository,
  metric: HealthMetric,
): Promise<void> {
  await repository.save(metric);
}

export async function getMetricsByType(
  repository: IHealthMetricRepository,
  type: HealthMetric['type'],
  days = 30,
): Promise<HealthMetric[]> {
  return repository.findByType(type, days);
}

export function createMetric(
  type: HealthMetric['type'],
  value: number,
  unit: string,
  note?: string,
): HealthMetric {
  return {
    id: crypto.randomUUID(),
    recordedAt: now(),
    type,
    value,
    unit,
    note: note !== undefined ? note : null,
  };
}
