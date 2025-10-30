// Track tabs we've already handled to avoid duplicates
const handledTabs = new Set();

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

function getUrlPath(url) {
  try {
    const urlObj = new URL(url);
    return (urlObj.pathname + urlObj.search).toLowerCase();
  } catch (e) {
    return null;
  }
}

function hasReuseFlag(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has('__reuse_tab');
  } catch (e) {
    return false;
  }
}

function removeReuseFlag(url) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('__reuse_tab');
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

function findMatchingTab(newUrl, existingTabs) {
  const newDomain = getDomain(newUrl);
  if (!newDomain) return null;

  const newPath = getUrlPath(newUrl);
  
  // Find all tabs with matching domain
  const domainMatches = existingTabs.filter(t => {
    if (!t.url) return false;
    const tabDomain = getDomain(t.url);
    return tabDomain === newDomain;
  });

  if (domainMatches.length === 0) return null;

  // If multiple matches, try to find exact path match first
  if (domainMatches.length > 1 && newPath) {
    const exactMatch = domainMatches.find(t => {
      const tabPath = getUrlPath(t.url);
      return tabPath === newPath;
    });
    if (exactMatch) return exactMatch;
  }

  // Otherwise return first match
  return domainMatches[0];
}

// Primary method: intercept navigation before it completes
browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  if (handledTabs.has(details.tabId)) return; // Already handled
  
  if (hasReuseFlag(details.url)) {
    handledTabs.add(details.tabId);
    
    const cleanUrl = removeReuseFlag(details.url);
    const allTabs = await browser.tabs.query({});
    const existingTabs = allTabs.filter(t => t.id !== details.tabId);
    
    // Check for exact URL match first
    const exactMatch = existingTabs.find(t => t.url === cleanUrl);
    if (exactMatch) {
      await browser.tabs.update(exactMatch.id, { active: true });
      await browser.windows.update(exactMatch.windowId, { focused: true });
      await browser.tabs.remove(details.tabId);
      setTimeout(() => handledTabs.delete(details.tabId), 5000);
      return;
    }
    
    // Otherwise use domain/path matching
    const target = findMatchingTab(cleanUrl, existingTabs);
    if (target) {
      await browser.tabs.update(target.id, { active: true });
      await browser.windows.update(target.windowId, { focused: true });
      await browser.tabs.remove(details.tabId);
      setTimeout(() => handledTabs.delete(details.tabId), 5000);
      return;
    }
    
    // No match found, navigate to clean URL (remove the flag)
    await browser.tabs.update(details.tabId, { url: cleanUrl });
    setTimeout(() => handledTabs.delete(details.tabId), 5000);
  }
});
