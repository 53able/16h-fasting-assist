/**
 * BodyStatusDisplay Component
 * Displays current body status during fasting with phase color coding,
 * milestone messages, and a circular progress indicator.
 */

import { BodyStatus } from '../../domain/types';

interface BodyStatusDisplayProps {
  bodyStatus: BodyStatus;
}

const PHASE_LABELS: Record<BodyStatus['phase'], string> = {
  digestion: '消化期',
  'glycogen-depletion': 'グリコーゲン消費期',
  'fat-burning': '脂肪燃焼期',
  autophagy: 'オートファジー期',
};

const PHASE_COLORS: Record<BodyStatus['phase'], string> = {
  digestion: '#6b7280',
  'glycogen-depletion': '#f59e0b',
  'fat-burning': '#f97316',
  autophagy: '#8b5cf6',
};

function getMilestoneMessage(elapsedHours: number): string | null {
  if (elapsedHours >= 16) {
    return 'オートファジー発動！細胞の再生が始まった！';
  }
  if (elapsedHours >= 10) {
    return '脂肪燃焼がスタート！内臓脂肪の分解が活発化中...';
  }
  return null;
}

interface CircularProgressProps {
  ratio: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ ratio, color, size = 120, strokeWidth = 8 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, ratio)));
  const center = size / 2;

  return (
    <svg width={size} height={size} aria-hidden="true">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}時間${m > 0 ? `${m}分` : ''}`;
}

export function BodyStatusDisplay({ bodyStatus }: BodyStatusDisplayProps) {
  const { phase, description, elapsedHours, remainingHours, progressRatio } = bodyStatus;
  const phaseColor = PHASE_COLORS[phase];
  const phaseLabel = PHASE_LABELS[phase];
  const milestoneMessage = getMilestoneMessage(elapsedHours);
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Circular progress */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress ratio={progressRatio} color={phaseColor} size={140} strokeWidth={10} />
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: phaseColor }}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Phase label */}
      <div
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '9999px',
          backgroundColor: phaseColor,
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        {phaseLabel}
      </div>

      {/* Description */}
      <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.875rem', maxWidth: '280px' }}>
        {description}
      </p>

      {/* Elapsed / Remaining */}
      <div style={{ display: 'flex', gap: '24px', fontSize: '0.875rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>経過</div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{formatHours(elapsedHours)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>残り</div>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {remainingHours > 0 ? formatHours(remainingHours) : '達成！'}
          </div>
        </div>
      </div>

      {/* Milestone message */}
      {milestoneMessage !== null && (
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#f3f4f6',
            borderLeft: `4px solid ${phaseColor}`,
            fontSize: '0.875rem',
            color: '#111827',
            maxWidth: '300px',
          }}
        >
          {milestoneMessage}
        </div>
      )}
    </div>
  );
}
