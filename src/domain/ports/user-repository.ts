/**
 * Port — persistence for {@link UserProfile}.
 */

import type { UserProfile } from '../types';

export interface IUserRepository {
  /** Returns null if no profile row exists yet. */
  getProfile(): Promise<UserProfile | null>;

  saveProfile(profile: UserProfile): Promise<void>;
}
