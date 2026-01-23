export function normalizeHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized.startsWith('www.')) {
    return normalized.slice(4);
  }
  return normalized;
}

export function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return normalizeHostname(urlObj.hostname);
  } catch (e) {
    return null;
  }
}

export function getUrlPath(url) {
  try {
    const urlObj = new URL(url);
    return (urlObj.pathname + urlObj.search).toLowerCase();
  } catch (e) {
    return null;
  }
}

export function hasReuseFlag(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has('__reuse_tab');
  } catch (e) {
    return false;
  }
}

export function removeReuseFlag(url) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('__reuse_tab');
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

export function getRunJSCode(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('__run_js');
  } catch (e) {
    return null;
  }
}

export function parseRunJSCommand(jsCode) {
  if (!jsCode) return { command: null, value: null };

  const parts = jsCode.split('=');
  if (parts.length === 1) {
    return { command: parts[0], value: null };
  }
  return { command: parts[0], value: parts.slice(1).join('=') };
}

export function removeRunJSFlag(url) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('__run_js');
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

export function normalizeUrlForComparison(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    while (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    let normalizedSearch = '';
    if (urlObj.search) {
      const params = new URLSearchParams(urlObj.search);
      params.delete('__reuse_tab');
      params.delete('__run_js');
      const sortedParams = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (sortedParams.length > 0) {
        normalizedSearch = '?' + sortedParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      }
    }

    const normalized = `${urlObj.protocol}//${normalizeHostname(urlObj.hostname)}${pathname}${normalizedSearch}`;
    return normalized;
  } catch (e) {
    return url;
  }
}

export function isRootUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const search = urlObj.search;
    return (pathname === '' || pathname === '/') && search === '';
  } catch (e) {
    return false;
  }
}

export function isPathPrefix(shortcutUrl, tabUrl) {
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
