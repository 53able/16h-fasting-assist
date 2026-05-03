/**
 * HealthMetricChart Component
 * SVG line chart displaying past 30 days of a health metric.
 */

import { HealthMetric } from '../../domain/types';

interface HealthMetricChartProps {
  metricType: HealthMetric['type'];
  metrics: HealthMetric[];
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

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

function getLast30DaysBuckets(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function HealthMetricChart({ metricType, metrics }: HealthMetricChartProps) {
  if (metrics.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: '10px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
        }}
      >
        {METRIC_TYPE_LABELS[metricType]}のデータがまだありません
      </div>
    );
  }

  // Aggregate: last recorded value per day
  const dayBuckets = getLast30DaysBuckets();
  const byDay = new Map<string, number>();
  for (const m of metrics) {
    const day = m.recordedAt.slice(0, 10);
    byDay.set(day, m.value);
  }

  // Build data points only for days that have data
  const dataPoints: Array<{ day: string; value: number; index: number }> = [];
  dayBuckets.forEach((day, index) => {
    if (byDay.has(day)) {
      dataPoints.push({ day, value: byDay.get(day) as number, index });
    }
  });

  if (dataPoints.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: '10px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
        }}
      >
        {METRIC_TYPE_LABELS[metricType]}のデータがまだありません
      </div>
    );
  }

  // Determine trend
  const isImproving =
    dataPoints.length >= 2 &&
    (() => {
      const first = dataPoints[0].value;
      const last = dataPoints[dataPoints.length - 1].value;
      if (metricType === 'weight' || metricType === 'body-fat' || metricType === 'blood-glucose') {
        return last < first;
      }
      // mood / energy: higher is better
      return last > first;
    })();
  const trendSymbol = dataPoints.length < 2 ? '—' : isImproving ? '↓' : '↑';
  const trendColor = dataPoints.length < 2 ? '#6b7280' : isImproving ? '#10b981' : '#ef4444';

  // SVG dimensions
  const svgWidth = 320;
  const svgHeight = 140;
  const paddingLeft = 40;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 32;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const values = dataPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const toX = (index: number) =>
    paddingLeft + (index / 29) * chartWidth;

  const toY = (value: number) =>
    paddingTop + chartHeight - ((value - minVal) / range) * chartHeight;

  // Build polyline points
  const polylinePoints = dataPoints
    .map((p) => `${toX(p.index)},${toY(p.value)}`)
    .join(' ');

  // X-axis tick positions: every 5-7 days
  const tickIndices = [0, 6, 13, 20, 27, 29].filter((i) => i <= 29);

  // Y-axis ticks: 3 ticks
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];

  const lineColor = isImproving || dataPoints.length < 2 ? '#10b981' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
          過去30日間 ({METRIC_TYPE_UNITS[metricType]})
        </span>
        <span
          aria-label={`トレンド: ${trendSymbol}`}
          style={{ fontSize: '1.25rem', color: trendColor, fontWeight: 700 }}
        >
          {trendSymbol}
        </span>
      </div>

      {/* SVG chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-label={`${METRIC_TYPE_LABELS[metricType]}の折れ線グラフ`}
        style={{ overflow: 'visible' }}
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#9ca3af"
              >
                {Number.isInteger(tick) ? tick : tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="#d1d5db"
          strokeWidth={1}
        />

        {/* X-axis tick labels */}
        {tickIndices.map((tickIdx) => {
          const x = toX(tickIdx);
          const day = dayBuckets[tickIdx];
          return (
            <text
              key={tickIdx}
              x={x}
              y={svgHeight - paddingBottom + 18}
              textAnchor="middle"
              fontSize={9}
              fill="#9ca3af"
            >
              {formatDateLabel(day)}
            </text>
          );
        })}

        {/* Line */}
        {dataPoints.length >= 2 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.index)}
            cy={toY(p.value)}
            r={3}
            fill={lineColor}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </div>
  );
}
