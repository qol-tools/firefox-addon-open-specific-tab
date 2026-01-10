// Track tabs we've already handled to avoid duplicates
const handledTabs = new Set();

function normalizeHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized.startsWith('www.')) {
    return normalized.slice(4);
  }
  return normalized;
}

function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return normalizeHostname(urlObj.hostname);
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

function getRunJSCode(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('__run_js');
  } catch (e) {
    return null;
  }
}

function parseRunJSCommand(jsCode) {
  if (!jsCode) return { command: null, value: null };

  const parts = jsCode.split('=');
  if (parts.length === 1) {
    return { command: parts[0], value: null };
  }
  return { command: parts[0], value: parts.slice(1).join('=') };
}

function removeRunJSFlag(url) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('__run_js');
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
    // Reconstruct URL with normalized hostname and pathname
    const normalized = `${urlObj.protocol}//${normalizeHostname(urlObj.hostname)}${pathname}${urlObj.search}`;
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
    return (pathname === '' || pathname === '/') && search === '';
  } catch (e) {
    return false;
  }
}

function isPathPrefix(shortcutUrl, tabUrl) {
  try {
    const shortcutObj = new URL(shortcutUrl);
    const tabObj = new URL(tabUrl);

    if (normalizeHostname(shortcutObj.hostname) !== normalizeHostname(tabObj.hostname)) {
      return false;
    }

    if (shortcutObj.search) {
      return false;
    }

    let shortcutPath = shortcutObj.pathname;
    let tabPath = tabObj.pathname;

    if (shortcutPath.length > 1 && shortcutPath.endsWith('/')) {
      shortcutPath = shortcutPath.slice(0, -1);
    }
    if (tabPath.length > 1 && tabPath.endsWith('/')) {
      tabPath = tabPath.slice(0, -1);
    }

    if (!tabPath.startsWith(shortcutPath)) {
      return false;
    }

    if (tabPath.length === shortcutPath.length) {
      return false;
    }

    return tabPath.charAt(shortcutPath.length) === '/';
  } catch (e) {
    return false;
  }
}

async function copyCookies(tabId) {
  try {
    const result = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const cookies = document.cookie;
        const textarea = document.createElement('textarea');
        textarea.value = cookies;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return cookies;
      }
    });
    return result[0].result;
  } catch (error) {
    console.error('[Tab Reuse] Error copying cookies:', error);
    return null;
  }
}

async function deleteCookie(tabId, cookieName) {
  try {
    const result = await browser.scripting.executeScript({
      target: { tabId },
      func: (name) => {
        let deleted = false;

        // Try localStorage
        if (localStorage.getItem(name) !== null) {
          localStorage.removeItem(name);
          deleted = true;
        }

        // Try sessionStorage
        if (sessionStorage.getItem(name) !== null) {
          sessionStorage.removeItem(name);
          deleted = true;
        }

        return deleted;
      },
      args: [cookieName]
    });

    if (result[0].result) {
      console.log(`[Tab Reuse] Deleted storage item: ${cookieName}`);
    } else {
      console.log(`[Tab Reuse] Storage item not found: ${cookieName}`);
    }
  } catch (error) {
    console.error('[Tab Reuse] Error deleting storage item:', error);
  }
}

async function deleteCookiesByPrefix(tabId, prefix) {
  try {
    const result = await browser.scripting.executeScript({
      target: { tabId },
      func: (prefix) => {
        const localStorageKeys = Object.keys(localStorage);
        const sessionStorageKeys = Object.keys(sessionStorage);

        // Delete from localStorage
        const localKeysToDelete = localStorageKeys.filter(k => k.startsWith(prefix));
        for (const key of localKeysToDelete) {
          localStorage.removeItem(key);
        }

        // Delete from sessionStorage
        const sessionKeysToDelete = sessionStorageKeys.filter(k => k.startsWith(prefix));
        for (const key of sessionKeysToDelete) {
          sessionStorage.removeItem(key);
        }

        return {
          deletedLocal: localKeysToDelete,
          deletedSession: sessionKeysToDelete
        };
      },
      args: [prefix]
    });

    const data = result[0].result;
    const totalDeleted = data.deletedLocal.length + data.deletedSession.length;
    console.log(`[Tab Reuse] Deleted ${totalDeleted} storage items with prefix '${prefix}'`);
    if (data.deletedLocal.length > 0) {
      console.log(`[Tab Reuse] localStorage:`, data.deletedLocal);
    }
    if (data.deletedSession.length > 0) {
      console.log(`[Tab Reuse] sessionStorage:`, data.deletedSession);
    }
  } catch (error) {
    console.error('[Tab Reuse] Error deleting storage items by prefix:', error);
  }
}

async function handleTabReuse(tabId, url) {
  if (handledTabs.has(tabId)) return;
  handledTabs.add(tabId);

  const jsCode = getRunJSCode(url);
  const { command, value } = parseRunJSCommand(jsCode);
  let cleanUrl = removeReuseFlag(url);
  cleanUrl = removeRunJSFlag(cleanUrl);
  const normalizedCleanUrl = normalizeUrlForComparison(cleanUrl);
  const allTabs = await browser.tabs.query({});
  const existingTabs = allTabs.filter(t => t.id !== tabId);

  // Helper to execute JS command on a tab
  const executeCommand = async (targetTabId) => {
    if (!command) return;

    if (command === 'copy_cookies') {
      await new Promise(resolve => setTimeout(resolve, 100));
      await copyCookies(targetTabId);
    } else if (command === 'delete_cookie' && value) {
      await deleteCookie(targetTabId, value);
    } else if (command === 'delete_cookies' && value) {
      await deleteCookiesByPrefix(targetTabId, value);
    }
  };

  // Check for exact URL match first
  const exactMatch = existingTabs.find(t => {
    if (!t.url) return false;
    const normalizedTabUrl = normalizeUrlForComparison(t.url);
    return normalizedTabUrl === normalizedCleanUrl;
  });

  if (exactMatch) {
    await browser.tabs.update(exactMatch.id, { active: true });
    await browser.windows.update(exactMatch.windowId, { focused: true });
    await executeCommand(exactMatch.id);
    await browser.tabs.remove(tabId);
    setTimeout(() => handledTabs.delete(tabId), 5000);
    return;
  }

  const prefixMatch = existingTabs.find(t => {
    if (!t.url) return false;
    return isPathPrefix(cleanUrl, t.url);
  });
  if (prefixMatch) {
    await browser.tabs.update(prefixMatch.id, { active: true });
    await browser.windows.update(prefixMatch.windowId, { focused: true });
    await executeCommand(prefixMatch.id);
    await browser.tabs.remove(tabId);
    setTimeout(() => handledTabs.delete(tabId), 5000);
    return;
  }

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
        await executeCommand(domainMatch.id);
        await browser.tabs.remove(tabId);
        setTimeout(() => handledTabs.delete(tabId), 5000);
        return;
      }
    }
  }

  // No match found, navigate to clean URL (remove the flags)
  await browser.tabs.update(tabId, { url: cleanUrl });
  if (command) {
    // Wait for page to load before executing command
    browser.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        executeCommand(tabId);
        browser.tabs.onUpdated.removeListener(listener);
      }
    });
  }
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
    await handleTabReuse(tabId, tab.url);
  }
});
