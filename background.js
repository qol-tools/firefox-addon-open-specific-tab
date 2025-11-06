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

function normalizeUrlForComparison(url) {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash from pathname (except root)
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    // Reconstruct URL with normalized pathname
    const normalized = `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${pathname}${urlObj.search}`;
    return normalized;
  } catch (e) {
    return url;
  }
}

function isRootUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const search = urlObj.search;
    // Root URL if pathname is empty or just "/", and no search params
    return (pathname === '' || pathname === '/') && search === '';
  } catch (e) {
    return false;
  }
}

async function handleTabReuse(tabId, url) {
  if (handledTabs.has(tabId)) return;
  handledTabs.add(tabId);
  
  const cleanUrl = removeReuseFlag(url);
  const normalizedCleanUrl = normalizeUrlForComparison(cleanUrl);
  const allTabs = await browser.tabs.query({});
  const existingTabs = allTabs.filter(t => t.id !== tabId);
  
  // Check for exact URL match first
  const exactMatch = existingTabs.find(t => {
    if (!t.url) return false;
    const normalizedTabUrl = normalizeUrlForComparison(t.url);
    return normalizedTabUrl === normalizedCleanUrl;
  });
  if (exactMatch) {
    await browser.tabs.update(exactMatch.id, { active: true });
    await browser.windows.update(exactMatch.windowId, { focused: true });
    await browser.tabs.remove(tabId);
    setTimeout(() => handledTabs.delete(tabId), 5000);
    return;
  }
  
  // If the URL is just the root domain, match any tab on that domain
  if (isRootUrl(cleanUrl)) {
    const domain = getDomain(cleanUrl);
    if (domain) {
      const domainMatch = existingTabs.find(t => {
        if (!t.url) return false;
        return getDomain(t.url) === domain;
      });
      if (domainMatch) {
        await browser.tabs.update(domainMatch.id, { active: true });
        await browser.windows.update(domainMatch.windowId, { focused: true });
        await browser.tabs.remove(tabId);
        setTimeout(() => handledTabs.delete(tabId), 5000);
        return;
      }
    }
  }
  
  // No match found, navigate to clean URL (remove the flag)
  await browser.tabs.update(tabId, { url: cleanUrl });
  setTimeout(() => handledTabs.delete(tabId), 5000);
}

// Primary method: intercept navigation before it completes
browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  if (hasReuseFlag(details.url)) {
    await handleTabReuse(details.tabId, details.url);
  }
});

// Fallback: handle tabs created with URL already set
browser.tabs.onCreated.addListener(async (tab) => {
  if (tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
    await handleTabReuse(tab.id, tab.url);
  }
});

// Fallback: handle tabs that get URL set after creation
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
    // Only act on recent tabs (created within last 2 seconds) to avoid interfering with normal navigation
    const tabInfo = await browser.tabs.get(tabId);
    // Use a simple check: if URL just changed and has flag, handle it
    // The handledTabs set prevents duplicates
    await handleTabReuse(tabId, tab.url);
  }
});
