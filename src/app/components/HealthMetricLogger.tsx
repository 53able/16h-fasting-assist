/**
 * HealthMetricLogger Component
 * Form for logging health metrics (weight, body-fat, blood-glucose, mood, energy).
 */

import { useState, useCallback } from 'react';
import { HealthMetric } from '../../domain/types';
import { IHealthMetricRepository } from '../../domain/ports/health-metric-repository';
import { useHealthMetric } from '../hooks/useHealthMetric';

interface HealthMetricLoggerProps {
  repository: IHealthMetricRepository;
  onMetricSaved: () => void;
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
  mood: 'score(1-5)',
  energy: 'score(1-5)',
};

const METRIC_TYPE_MIN: Record<HealthMetric['type'], number> = {
  weight: 0.1,
  'body-fat': 0.1,
  'blood-glucose': 0.1,
  mood: 1,
  energy: 1,
};

const METRIC_TYPE_MAX: Record<HealthMetric['type'], number> = {
  weight: 500,
  'body-fat': 100,
  'blood-glucose': 600,
  mood: 5,
  energy: 5,
};

const METRIC_TYPE_STEP: Record<HealthMetric['type'], number> = {
  weight: 0.1,
  'body-fat': 0.1,
  'blood-glucose': 1,
  mood: 1,
  energy: 1,
};

export function HealthMetricLogger({ repository, onMetricSaved }: HealthMetricLoggerProps) {
  const { saveMetric, isLoading } = useHealthMetric(repository);

  const [type, setType] = useState<HealthMetric['type']>('weight');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < METRIC_TYPE_MIN[type] || parsed > METRIC_TYPE_MAX[type]) {
        setError(
          `有効な値を入力してください（${METRIC_TYPE_MIN[type]} - ${METRIC_TYPE_MAX[type]}）`,
        );
        return;
      }

      try {
        await saveMetric(type, parsed, METRIC_TYPE_UNITS[type], note.trim() !== '' ? note.trim() : undefined);
        setValue('');
        setNote('');
        onMetricSaved();
      } catch {
        setError('保存に失敗しました。もう一度お試しください。');
      }
    },
    [saveMetric, type, value, note, onMetricSaved],
  );

  const handleTypeChange = useCallback((newType: HealthMetric['type']) => {
    setType(newType);
    setValue('');
    setError(null);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      aria-label="健康指標記録フォーム"
    >
      {/* Metric type tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
          指標タイプ
        </span>
        <div
          role="tablist"
          aria-label="指標タイプ選択"
          style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
        >
          {(Object.keys(METRIC_TYPE_LABELS) as HealthMetric['type'][]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={type === key}
              onClick={() => handleTypeChange(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: type === key ? '#10b981' : '#d1d5db',
                backgroundColor: type === key ? '#10b981' : '#fff',
                color: type === key ? '#fff' : '#374151',
                fontWeight: type === key ? 600 : 400,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {METRIC_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Value input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="metric-value"
          style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          値
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="metric-value"
            type="number"
            min={METRIC_TYPE_MIN[type]}
            max={METRIC_TYPE_MAX[type]}
            step={METRIC_TYPE_STEP[type]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`例: ${type === 'weight' ? '65.0' : type === 'body-fat' ? '18.5' : type === 'blood-glucose' ? '90' : '3'}`}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.9375rem',
              color: '#111827',
              width: '140px',
            }}
          />
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {METRIC_TYPE_UNITS[type]}
          </span>
        </div>
        {(type === 'mood' || type === 'energy') && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
            1（最低） 〜 5（最高）
          </p>
        )}
      </div>

      {/* Note */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="metric-note"
          style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          メモ（任意）
        </label>
        <textarea
          id="metric-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="体調や状況など"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9375rem',
            color: '#111827',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Error */}
      {error !== null && (
        <p role="alert" style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: isLoading ? '#9ca3af' : '#10b981',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {isLoading ? '保存中...' : '記録を保存'}
      </button>
    </form>
  );
}
