/**
 * IFastingRepository - Port for Fasting Session persistence
 * Domain layer abstraction. No infrastructure dependencies.
 *
 * Invariant: All sessions returned must have status in ('active', 'completed', 'aborted')
 */

import { FastingSession } from '../types';

export interface IFastingRepository {
  /**
   * 新しいセッションを保存（新規作成）
   * Invariant: session.id は UUID4 形式
   * Invariant: session.status は 'active' から始まる
   */
  save(session: FastingSession): Promise<void>;

  /**
   * セッションを ID で取得
   * @returns 見つからない場合は null
   */
  findById(id: string): Promise<FastingSession | null>;

  /**
   * 現在アクティブなセッション（status === 'active'）を取得
   * Invariant: 返されるセッションは必ず status === 'active'
   * @returns 見つからない場合は null
   */
  findActive(): Promise<FastingSession | null>;

  /**
   * 日付範囲内のセッションを取得（履歴表示用）
   * Invariant: from < to の時刻順に返す
   */
  findByDateRange(from: Date, to: Date): Promise<FastingSession[]>;

  /**
   * セッションを削除
   */
  delete(id: string): Promise<void>;

  /**
   * 特定の状態のセッション一覧を取得
   */
  findByStatus(status: FastingSession['status']): Promise<FastingSession[]>;
}
