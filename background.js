import {
  getDomain,
  hasReuseFlag,
  removeReuseFlag,
  getRunJSCode,
  parseRunJSCommand,
  removeRunJSFlag,
  normalizeUrlForComparison,
  isRootUrl,
  isPathPrefix,
} from './url-utils.js';

const handledTabs = new Set();

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

        if (localStorage.getItem(name) !== null) {
          localStorage.removeItem(name);
          deleted = true;
        }

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

        const localKeysToDelete = localStorageKeys.filter(k => k.startsWith(prefix));
        for (const key of localKeysToDelete) {
          localStorage.removeItem(key);
        }

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

  await browser.tabs.update(tabId, { url: cleanUrl });
  if (command) {
    browser.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        executeCommand(tabId);
        browser.tabs.onUpdated.removeListener(listener);
      }
    });
  }
  setTimeout(() => handledTabs.delete(tabId), 5000);
}

browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (hasReuseFlag(details.url)) {
    await handleTabReuse(details.tabId, details.url);
  }
});

browser.tabs.onCreated.addListener(async (tab) => {
  if (tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
    await handleTabReuse(tab.id, tab.url);
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url && getDomain(tab.url) && hasReuseFlag(tab.url)) {
    await handleTabReuse(tabId, tab.url);
  }
});
