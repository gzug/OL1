/** Temporary. Proves the duration guard fires. Removed in the next commit. */
export function badDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}
