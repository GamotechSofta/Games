/** Quick status tab filter (all | won | lost | cancelled). */
export function matchesBetStatusTabFilter(verdictState, tabFilter) {
  if (!tabFilter || tabFilter === 'all') return true;
  return verdictState === tabFilter;
}
