/**
 * WorkoutStreak Component
 * Displays current and longest workout streak statistics.
 */

interface WorkoutStreakProps {
  currentStreak: number;
  longestStreak: number;
}

export function WorkoutStreak({ currentStreak, longestStreak }: WorkoutStreakProps) {
  const progressRatio = longestStreak > 0 ? Math.min(currentStreak / longestStreak, 1) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
      }}
      aria-label="ワークアウトストリーク"
    >
      {/* Current streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {currentStreak > 0 && (
          <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>🔥</span>
        )}
        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
          現在のストリーク: {currentStreak} 日
        </span>
      </div>

      {/* Best streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.9375rem', color: '#6b7280' }}>
          最長ストリーク: {longestStreak} 日
        </span>
      </div>

      {/* Progress bar */}
      {longestStreak > 0 && (
        <div
          role="progressbar"
          aria-valuenow={currentStreak}
          aria-valuemin={0}
          aria-valuemax={longestStreak}
          aria-label={`ストリーク進捗: 最長 ${longestStreak} 日中 ${currentStreak} 日`}
          style={{
            height: '8px',
            borderRadius: '4px',
            backgroundColor: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressRatio * 100}%`,
              borderRadius: '4px',
              backgroundColor: currentStreak > 0 ? '#f59e0b' : '#d1d5db',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
