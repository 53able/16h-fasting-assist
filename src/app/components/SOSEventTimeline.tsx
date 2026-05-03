/**
 * SOSEventTimeline Component
 * Displays SOS event history as a timeline in reverse chronological order.
 */

import { SOSEvent } from '../../domain/types';

interface SOSEventTimelineProps {
  sosEvents: SOSEvent[];
}

const FOOD_CATEGORY_LABELS: Record<SOSEvent['foodCategory'], string> = {
  nuts: '素焼きナッツ',
  cheese: 'チーズ',
  'protein-drink': 'プロテインドリンク',
  broth: 'ブロス（スープ）',
  other: 'その他',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function SOSEventTimeline({ sosEvents }: SOSEventTimelineProps) {
  if (sosEvents.length === 0) {
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
        SOSイベントはまだありません
      </div>
    );
  }

  const sortedEvents = [...sosEvents].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );

  return (
    <div
      role="list"
      aria-label="SOSイベント履歴"
      style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
    >
      {sortedEvents.map((event, index) => (
        <div
          key={event.id}
          role="listitem"
          style={{
            display: 'flex',
            gap: '12px',
            paddingBottom: index < sortedEvents.length - 1 ? '16px' : '0',
          }}
        >
          {/* Timeline line + dot */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0,
              width: '20px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                flexShrink: 0,
                marginTop: '4px',
              }}
              aria-hidden="true"
            />
            {index < sortedEvents.length - 1 && (
              <div
                style={{
                  width: '2px',
                  flex: 1,
                  backgroundColor: '#e5e7eb',
                  marginTop: '4px',
                }}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Event card */}
          <div
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #fecaca',
              backgroundColor: '#fff5f5',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: index < sortedEvents.length - 1 ? '4px' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#991b1b' }}>
                {FOOD_CATEGORY_LABELS[event.foodCategory]}
              </span>
              <time
                dateTime={event.recordedAt}
                style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}
              >
                {formatTimestamp(event.recordedAt)}
              </time>
            </div>
            {event.estimatedCalories !== null && (
              <span style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                推定カロリー: {event.estimatedCalories} kcal
              </span>
            )}
            {event.note !== null && (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.5 }}>
                {event.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
