/**
 * WorkoutLogger Component
 * Form for logging a new workout session with exercises.
 */

import { useState, useCallback } from 'react';
import { WorkoutLog, ExerciseEntry } from '../../domain/types';
import { IWorkoutRepository } from '../../domain/ports/workout-repository';
import { useWorkout } from '../hooks/useWorkout';

interface WorkoutLoggerProps {
  repository: IWorkoutRepository;
  sessionId: string;
  onWorkoutSaved: () => void;
}

const WORKOUT_TYPE_LABELS: Record<WorkoutLog['type'], string> = {
  bodyweight: '自重トレーニング',
  weights: 'ウェイトトレーニング',
  cardio: '有酸素運動',
  flexibility: 'ストレッチ・柔軟',
};

const EMPTY_EXERCISE: ExerciseEntry = {
  name: '',
  sets: 1,
  reps: 1,
  weightKg: null,
};

export function WorkoutLogger({ repository, sessionId, onWorkoutSaved }: WorkoutLoggerProps) {
  const { saveWorkout, isLoading } = useWorkout(repository);

  const [type, setType] = useState<WorkoutLog['type']>('bodyweight');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([{ ...EMPTY_EXERCISE }]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = useCallback(() => {
    setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }]);
  }, []);

  const handleRemoveExercise = useCallback((index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleExerciseChange = useCallback(
    (index: number, field: keyof ExerciseEntry, value: string) => {
      setExercises((prev) =>
        prev.map((ex, i) => {
          if (i !== index) return ex;
          if (field === 'name') {
            return { ...ex, name: value };
          }
          if (field === 'sets') {
            return { ...ex, sets: Math.max(1, parseInt(value, 10) || 1) };
          }
          if (field === 'reps') {
            return { ...ex, reps: Math.max(1, parseInt(value, 10) || 1) };
          }
          if (field === 'weightKg') {
            const parsed = parseFloat(value);
            return { ...ex, weightKg: value === '' || isNaN(parsed) ? null : parsed };
          }
          return ex;
        }),
      );
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const validExercises = exercises.filter((ex) => ex.name.trim() !== '');
      if (validExercises.length === 0) {
        setError('運動を少なくとも1つ入力してください');
        return;
      }

      try {
        await saveWorkout(
          type,
          validExercises,
          durationMinutes,
          sessionId || undefined,
          note.trim() !== '' ? note.trim() : undefined,
        );
        // Reset form on success
        setType('bodyweight');
        setDurationMinutes(30);
        setExercises([{ ...EMPTY_EXERCISE }]);
        setNote('');
        onWorkoutSaved();
      } catch {
        setError('保存に失敗しました。もう一度お試しください。');
      }
    },
    [saveWorkout, type, durationMinutes, exercises, note, sessionId, onWorkoutSaved],
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      aria-label="ワークアウト記録フォーム"
    >
      {/* Workout type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="workout-type"
          style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          種目タイプ
        </label>
        <select
          id="workout-type"
          value={type}
          onChange={(e) => setType(e.target.value as WorkoutLog['type'])}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9375rem',
            color: '#111827',
            backgroundColor: '#fff',
          }}
        >
          {(Object.keys(WORKOUT_TYPE_LABELS) as WorkoutLog['type'][]).map((key) => (
            <option key={key} value={key}>
              {WORKOUT_TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="workout-duration"
          style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          時間（分）
        </label>
        <input
          id="workout-duration"
          type="number"
          min={1}
          max={360}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9375rem',
            color: '#111827',
            width: '120px',
          }}
        />
      </div>

      {/* Exercises */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
          運動リスト
        </span>
        {exercises.map((ex, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>
                運動 {index + 1}
              </span>
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveExercise(index)}
                  aria-label={`運動 ${index + 1} を削除`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #fca5a5',
                    backgroundColor: '#fff',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  削除
                </button>
              )}
            </div>

            {/* Exercise name */}
            <input
              type="text"
              placeholder="種目名（例: 腕立て伏せ）"
              value={ex.name}
              onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.9375rem',
                color: '#111827',
              }}
            />

            {/* Sets / Reps / Weight row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8125rem', color: '#374151' }}>
                セット数
                <input
                  type="number"
                  min={1}
                  value={ex.sets}
                  onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9375rem',
                    width: '80px',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8125rem', color: '#374151' }}>
                レップ数
                <input
                  type="number"
                  min={1}
                  value={ex.reps}
                  onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9375rem',
                    width: '80px',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8125rem', color: '#374151' }}>
                重量 (kg)
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="任意"
                  value={ex.weightKg !== null ? ex.weightKg : ''}
                  onChange={(e) => handleExerciseChange(index, 'weightKg', e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9375rem',
                    width: '90px',
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddExercise}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px dashed #9ca3af',
            backgroundColor: '#fff',
            color: '#6b7280',
            fontSize: '0.875rem',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          + 運動を追加
        </button>
      </div>

      {/* Note */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="workout-note"
          style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}
        >
          メモ（任意）
        </label>
        <textarea
          id="workout-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="体調や感想など"
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
        <p
          role="alert"
          style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem' }}
        >
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
        {isLoading ? '保存中...' : 'ワークアウトを保存'}
      </button>
    </form>
  );
}
