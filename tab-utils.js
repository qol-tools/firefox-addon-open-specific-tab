export function getLowestTabIndex(tabs) {
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null;
  }

  let lowest = null;
  for (const tab of tabs) {
    if (!tab || typeof tab.index !== 'number') {
      continue;
    }
    if (lowest === null || tab.index < lowest) {
      lowest = tab.index;
    }
  }

  return lowest;
}
