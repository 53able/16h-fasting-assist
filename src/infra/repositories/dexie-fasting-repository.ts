/**
 * Infrastructure Layer - Dexie Fasting Repository
 * Implements IFastingRepository using Dexie/IndexedDB.
 */

import Dexie from 'dexie';
import { db } from '../db';
import { IFastingRepository } from '../../domain/ports/fasting-repository';
import { FastingSession } from '../../domain/types';

export class DexieFastingRepository implements IFastingRepository {
  async save(session: FastingSession): Promise<void> {
    await db.fastingSessions.put(session);
  }

  async findById(id: string): Promise<FastingSession | null> {
    const session = await db.fastingSessions.get(id);
    return session ?? null;
  }

  async findActive(): Promise<FastingSession | null> {
    const session = await db.fastingSessions
      .where('[status+startedAt]')
      .between(['active', Dexie.minKey], ['active', Dexie.maxKey])
      .last();
    return session ?? null;
  }

  async findByDateRange(from: Date, to: Date): Promise<FastingSession[]> {
    const fromISO = from.toISOString();
    const toISO = to.toISOString();
    const sessions = await db.fastingSessions
      .where('startedAt')
      .between(fromISO, toISO, true, true)
      .toArray();
    return sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  async delete(id: string): Promise<void> {
    await db.fastingSessions.delete(id);
  }

  async findByStatus(status: FastingSession['status']): Promise<FastingSession[]> {
    return db.fastingSessions.where('status').equals(status).toArray();
  }
}
