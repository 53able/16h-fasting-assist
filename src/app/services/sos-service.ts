/**
 * SOS Service
 * Records SOS events on a fasting session and persists via IFastingRepository.
 */

import { IFastingRepository } from '../../domain/ports/fasting-repository';
import { SOSEvent } from '../../domain/types';
import { now } from '../../domain/types';

export async function recordSOSEvent(
  repository: IFastingRepository,
  sessionId: string,
  foodCategory: SOSEvent['foodCategory'],
  calories?: number,
  note?: string,
): Promise<void> {
  const session = await repository.findById(sessionId);
  if (session === null) {
    throw new Error(`FastingSession not found: ${sessionId}`);
  }

  const event: SOSEvent = {
    id: crypto.randomUUID(),
    recordedAt: now(),
    foodCategory,
    estimatedCalories: calories !== undefined ? calories : null,
    note: note !== undefined ? note : null,
  };

  const updatedSession = {
    ...session,
    sosEvents: [...session.sosEvents, event],
  };

  await repository.save(updatedSession);
}
