/**
 * IPresetRepository implementation backed by Dexie.
 */

import { db } from '../db';
import type { IPresetRepository } from '../../domain/ports/preset-repository';
import type { PresetSchedule } from '../../domain/types';

export class DexiePresetRepository implements IPresetRepository {
  /**
   * Lists all presets sorted by display name.
   * Uses in-memory sort because Dexie schema only indexes `id` and `lifestyle` (not `name`).
   */
  async findAll(): Promise<PresetSchedule[]> {
    const rows = await db.presetSchedules.toArray();
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
}
