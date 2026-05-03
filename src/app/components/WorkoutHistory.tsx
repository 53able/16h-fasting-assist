/**
 * WorkoutHistory Component
 * Displays past workout logs as a list with date, type, duration, and exercise count.
 */

import { WorkoutLog } from '../../domain/types';

interface WorkoutHistoryProps {
  workouts: WorkoutLog[];
}

const WORKOUT_TYPE_LABELS: Record<WorkoutLog['type'], string> = {
  bodyweight: '自重トレーニング',
  weights: 'ウェイトトレーニング',
  cardio: '有酸素運動',
  flexibility: 'ストレッチ・柔軟',
};

const WORKOUT_TYPE_COLORS: Record<WorkoutLog['type'], string> = {
  bodyweight: '#10b981',
  weights: '#3b82f6',
  cardio: '#f59e0b',
  flexibility: '#8b5cf6',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function WorkoutHistory({ workouts }: WorkoutHistoryProps) {
  if (workouts.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
        }}
      >
        ワークアウト履歴はまだありません
      </div>
    );
  }

  const sorted = [...workouts].sort((a, b) =>
    b.performedAt.localeCompare(a.performedAt),
  );

  return (
    <div
      role="list"
      aria-label="ワークアウト履歴"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      {sorted.map((workout) => (
        <div
          key={workout.id}
          role="listitem"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
          }}
        >
          {/* Color indicator */}
          <div
            aria-hidden="true"
            style={{
              width: '4px',
              height: '40px',
              borderRadius: '2px',
              backgroundColor: WORKOUT_TYPE_COLORS[workout.type],
              flexShrink: 0,
            }}
          />

          {/* Main info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                {WORKOUT_TYPE_LABELS[workout.type]}
              </span>
              <time
                dateTime={workout.performedAt}
                style={{ fontSize: '0.8125rem', color: '#6b7280', flexShrink: 0 }}
              >
                {formatDate(workout.performedAt)}
              </time>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem', color: '#4b5563' }}>
              <span>{workout.durationMinutes} 分</span>
              <span>{workout.exercises.length} 種目</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
