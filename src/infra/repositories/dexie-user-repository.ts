/**
 * IUserRepository implementation backed by Dexie.
 */

import { db } from '../db';
import type { IUserRepository } from '../../domain/ports/user-repository';
import { userProfileSchema } from '../../domain/schemas/user-profile-schema';
import type { UserProfile } from '../../domain/types';
import { DEFAULT_USER_PROFILE_ID } from '../../domain/user-profile-default';

const PROFILE_PK = DEFAULT_USER_PROFILE_ID;

export class DexieUserRepository implements IUserRepository {
  async getProfile(): Promise<UserProfile | null> {
    const row = await db.userProfiles.get(PROFILE_PK);
    if (row === undefined) {
      return null;
    }
    const parsed = userProfileSchema.safeParse(row);
    if (!parsed.success) {
      return null;
    }
    return parsed.data as unknown as UserProfile;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const parsed = userProfileSchema.safeParse(profile);
    if (!parsed.success) {
      throw new Error(`Invalid UserProfile: ${parsed.error.message}`);
    }
    await db.userProfiles.put(parsed.data as unknown as UserProfile);
  }
}
