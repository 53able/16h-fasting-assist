/**
 * Port — read preset fasting schedules (seeded in IndexedDB).
 */

import type { PresetSchedule } from '../types';

export interface IPresetRepository {
  findAll(): Promise<PresetSchedule[]>;
}
