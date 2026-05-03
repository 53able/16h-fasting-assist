/**
 * IExportService - Port for Data Export/Import
 * Domain layer abstraction. No infrastructure dependencies.
 * Handles data backup and recovery (Phase 1: JSON export/import).
 */

import { ExportData } from '../types';

export interface IExportService {
  /**
   * すべてのデータをエクスポート
   * Invariant: 返される JSON には version フィールドを含む
   * Invariant: 全セッション、全ワークアウト、全指標を含む
   * @returns ExportData オブジェクト（JSON 形式に変換可能）
   */
  exportAllData(): Promise<ExportData>;

  /**
   * エクスポートデータを JSON 文字列に変換（ブラウザダウンロード用）
   */
  exportAsJSON(): Promise<string>;

  /**
   * JSON データをインポート
   * Invariant: スキーマ version チェック（互換性確認）
   * Invariant: インポート前に既存データをバックアップ（テスト確認後に破棄）
   * @throws Schema version incompatible エラーの場合
   */
  importData(data: ExportData): Promise<void>;

  /**
   * JSON 文字列からインポート
   * @param jsonString JSON 形式の文字列
   * @throws JSON parse error / schema version error
   */
  importFromJSON(jsonString: string): Promise<void>;

  /**
   * エクスポートデータのスキーマバージョンを確認
   */
  getCompatibleVersion(): Promise<number>;
}
