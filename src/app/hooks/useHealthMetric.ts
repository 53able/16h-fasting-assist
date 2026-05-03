/**
 * useHealthMetric Hook
 * Manages health metric logging and retrieval.
 */

import { useState, useEffect, useCallback } from 'react';
import { HealthMetric } from '../../domain/types';
import { IHealthMetricRepository } from '../../domain/ports/health-metric-repository';
import { saveMetric, getMetricsByType, createMetric } from '../services/health-metric-service';

interface UseHealthMetricResult {
  metrics: HealthMetric[];
  saveMetric: (
    type: HealthMetric['type'],
    value: number,
    unit: string,
    note?: string,
  ) => Promise<void>;
  isLoading: boolean;
  selectedType: HealthMetric['type'];
  setSelectedType: (type: HealthMetric['type']) => void;
}

export function useHealthMetric(repository: IHealthMetricRepository): UseHealthMetricResult {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<HealthMetric['type']>('weight');

  const loadMetrics = useCallback(
    (type: HealthMetric['type']) => {
      let cancelled = false;

      setIsLoading(true);

      getMetricsByType(repository, type, 30)
        .then((data) => {
          if (!cancelled) {
            setMetrics(data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMetrics([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    },
    [repository],
  );

  useEffect(() => {
    const cleanup = loadMetrics(selectedType);
    return cleanup;
  }, [loadMetrics, selectedType]);

  const handleSaveMetric = useCallback(
    async (
      type: HealthMetric['type'],
      value: number,
      unit: string,
      note?: string,
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const metric = createMetric(type, value, unit, note);
        await saveMetric(repository, metric);
        const updated = await getMetricsByType(repository, selectedType, 30);
        setMetrics(updated);
      } finally {
        setIsLoading(false);
      }
    },
    [repository, selectedType],
  );

  return {
    metrics,
    saveMetric: handleSaveMetric,
    isLoading,
    selectedType,
    setSelectedType,
  };
}
