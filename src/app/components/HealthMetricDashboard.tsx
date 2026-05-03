/**
 * HealthMetricDashboard Component
 * Combines HealthMetricLogger and HealthMetricChart with summary stats.
 */

import { useCallback } from 'react';
import { HealthMetric } from '../../domain/types';
import { IHealthMetricRepository } from '../../domain/ports/health-metric-repository';
import { useHealthMetric } from '../hooks/useHealthMetric';
import { HealthMetricLogger } from './HealthMetricLogger';
import { HealthMetricChart } from './HealthMetricChart';

interface HealthMetricDashboardProps {
  repository: IHealthMetricRepository;
}

const METRIC_TYPE_LABELS: Record<HealthMetric['type'], string> = {
  weight: '体重',
  'body-fat': '体脂肪率',
  'blood-glucose': '血糖値',
  mood: '気分',
  energy: 'エネルギー',
};

const METRIC_TYPE_UNITS: Record<HealthMetric['type'], string> = {
  weight: 'kg',
  'body-fat': '%',
  'blood-glucose': 'mg/dL',
  mood: 'スコア',
  energy: 'スコア',
};

function formatValue(value: number, type: HealthMetric['type']): string {
  if (type === 'mood' || type === 'energy') {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

function get7DayAgoValue(metrics: HealthMetric[]): number | null {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  // Find the metric closest to 7 days ago
  const older = metrics.filter((m) => m.recordedAt <= cutoff);
  if (older.length === 0) return null;
  return older[older.length - 1].value;
}

export function HealthMetricDashboard({ repository }: HealthMetricDashboardProps) {
  const { metrics, isLoading, selectedType, setSelectedType } = useHealthMetric(repository);

  const handleMetricSaved = useCallback(() => {
    // useHealthMetric auto-refreshes after save; nothing extra needed
  }, []);

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const sevenDayAgoValue = get7DayAgoValue(metrics);
  const change =
    latestMetric !== null && sevenDayAgoValue !== null
      ? latestMetric.value - sevenDayAgoValue
      : null;

  const isImproving =
    change !== null &&
    (() => {
      if (
        selectedType === 'weight' ||
        selectedType === 'body-fat' ||
        selectedType === 'blood-glucose'
      ) {
        return change < 0;
      }
      return change > 0;
    })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric type tabs */}
      <div
        role="tablist"
        aria-label="指標タイプ"
        style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
      >
        {(Object.keys(METRIC_TYPE_LABELS) as HealthMetric['type'][]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selectedType === key}
            onClick={() => setSelectedType(key)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: selectedType === key ? '#10b981' : '#d1d5db',
              backgroundColor: selectedType === key ? '#10b981' : '#fff',
              color: selectedType === key ? '#fff' : '#374151',
              fontWeight: selectedType === key ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {METRIC_TYPE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Latest value */}
        <div
          style={{
            flex: 1,
            minWidth: '100px',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>最新値</span>
          {isLoading ? (
            <span style={{ fontSize: '1.25rem', color: '#d1d5db' }}>—</span>
          ) : latestMetric !== null ? (
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              {formatValue(latestMetric.value, selectedType)}{' '}
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>
                {METRIC_TYPE_UNITS[selectedType]}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '1.125rem', color: '#9ca3af' }}>未記録</span>
          )}
        </div>

        {/* 7-day change */}
        <div
          style={{
            flex: 1,
            minWidth: '100px',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>7日前との差</span>
          {isLoading ? (
            <span style={{ fontSize: '1.25rem', color: '#d1d5db' }}>—</span>
          ) : change !== null ? (
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: isImproving ? '#10b981' : change === 0 ? '#6b7280' : '#ef4444',
              }}
            >
              {change > 0 ? '+' : ''}
              {formatValue(change, selectedType)}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                {METRIC_TYPE_UNITS[selectedType]}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: '1.125rem', color: '#9ca3af' }}>—</span>
          )}
        </div>

        {/* Trend */}
        <div
          style={{
            flex: 1,
            minWidth: '80px',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>トレンド</span>
          {isLoading ? (
            <span style={{ fontSize: '1.5rem', color: '#d1d5db' }}>—</span>
          ) : change === null ? (
            <span style={{ fontSize: '1.5rem', color: '#9ca3af' }}>—</span>
          ) : change === 0 ? (
            <span style={{ fontSize: '1.5rem', color: '#6b7280' }}>→</span>
          ) : isImproving ? (
            <span style={{ fontSize: '1.5rem', color: '#10b981' }}>↓</span>
          ) : (
            <span style={{ fontSize: '1.5rem', color: '#ef4444' }}>↑</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {METRIC_TYPE_LABELS[selectedType]}の推移
        </h3>
        <HealthMetricChart metricType={selectedType} metrics={metrics} />
      </div>

      {/* Logger */}
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          新しい記録を追加
        </h3>
        <HealthMetricLogger repository={repository} onMetricSaved={handleMetricSaved} />
      </div>
    </div>
  );
}
