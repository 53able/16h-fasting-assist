/**
 * SOS Service
 * Records and removes SOS events on a fasting session; persists via {@link IFastingRepository}.
 */

import { IFastingRepository } from '../../domain/ports/fasting-repository';
import { SOSEvent } from '../../domain/types';
import { now } from '../../domain/types';

/**
 * Appends one SOS event to the session identified by `sessionId` and persists.
 *
 * @throws When no session exists for `sessionId`
 */
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

/**
 * Removes the SOS event with `eventId` from the session identified by `sessionId`.
 * Idempotent: if the event is already absent, does not call `save`.
 *
 * @throws When no session exists for `sessionId`
 */
export async function deleteSOSEvent(
  repository: IFastingRepository,
  sessionId: string,
  eventId: string,
): Promise<void> {
  const session = await repository.findById(sessionId);
  if (session === null) {
    throw new Error(`FastingSession not found: ${sessionId}`);
  }

  const nextSosEvents = session.sosEvents.filter((e) => e.id !== eventId);
  if (nextSosEvents.length === session.sosEvents.length) {
    return;
  }

  await repository.save({
    ...session,
    sosEvents: nextSosEvents,
  });
}
