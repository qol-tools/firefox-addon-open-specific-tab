// Track tabs that started blank (external opens) vs tabs created with URLs (restored)
// Key: tabId, Value: { startedBlank: boolean, createdAt: number }
const pendingTabs = new Map();

function isBlankUrl(url) {
  return !url || url === "about:blank" || url === "about:newtab" || url.startsWith("about:");
}

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

browser.tabs.onCreated.addListener(async (tab) => {
  const createdAt = Date.now();
  const startedBlank = isBlankUrl(tab.url);
  
  // Only track tabs that started blank (external opens)
  // Tabs created with URLs are likely restored - leave them alone
  if (startedBlank) {
    pendingTabs.set(tab.id, { startedBlank: true, createdAt });
    // Poll for URL if not set immediately
    pollForUrl(tab.id, 10);
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // ONLY act on tabs that started blank and now have a URL with reuse flag
  const tabInfo = pendingTabs.get(tabId);
  if (tabInfo && tabInfo.startedBlank && changeInfo.url && tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
    await handleTabReuse(tabId, tab.url);
    pendingTabs.delete(tabId);
  }
});

async function pollForUrl(tabId, maxAttempts) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
        await handleTabReuse(tab.id, tab.url);
        return;
      }
    } catch (e) {
      // Tab closed or doesn't exist
      pendingTabs.delete(tabId);
      return;
    }
  }
  
  // Give up after max attempts
  pendingTabs.delete(tabId);
}

async function handleTabReuse(newTabId, newUrl) {
  // Remove the reuse flag to get the target URL
  const cleanUrl = removeReuseFlag(newUrl);
  
  // Get all existing tabs (excluding the new one and other pending tabs)
  const allTabs = await browser.tabs.query({});
  const existingTabs = allTabs.filter(t => 
    t.id !== newTabId && !pendingTabs.has(t.id)
  );

  // Check for exact URL match first
  const exactMatch = existingTabs.find(t => t.url === cleanUrl);
  if (exactMatch) {
    await browser.tabs.update(exactMatch.id, { active: true });
    await browser.windows.update(exactMatch.windowId, { focused: true });
    await browser.tabs.remove(newTabId);
    pendingTabs.delete(newTabId);
    return;
  }

  // Otherwise use domain/path matching
  const target = findMatchingTab(cleanUrl, existingTabs);

  if (target) {
    // Focus existing tab, don't navigate it
    await browser.tabs.update(target.id, { active: true });
    await browser.windows.update(target.windowId, { focused: true });
    
    // Close the new one
    try {
      await browser.tabs.remove(newTabId);
      pendingTabs.delete(newTabId);
    } catch (e) {
      // Tab might already be closed
      pendingTabs.delete(newTabId);
    }
  } else {
    // No match found, open the target URL (remove the flag)
    await browser.tabs.update(newTabId, { url: cleanUrl });
    pendingTabs.delete(newTabId);
  }
}
