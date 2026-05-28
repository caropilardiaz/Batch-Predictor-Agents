/**
 * Converts a "HH:mm:ss" or "HH:mm" string to total minutes from midnight.
 */
export const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
};

/**
 * Converts total minutes from midnight to a "HH:mm" string.
 */
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${paddedHours}:${paddedMinutes}`;
};

/**
 * Rounds a number of minutes to the nearest 5-minute interval.
 */
export const roundToNearest5 = (minutes: number): number => {
  return Math.round(minutes / 5) * 5;
};
