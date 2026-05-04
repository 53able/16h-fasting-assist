/**
 * Local-calendar weekend check for {@link UserProfile.weekendOnly} MVP.
 */

/**
 * Returns true if `date` falls on Saturday or Sunday in the runtime timezone.
 *
 * @param date - Reference instant (default: now).
 */
export const isWeekendLocal = (date: Date = new Date()): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
