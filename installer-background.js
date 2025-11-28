// Installer addon - syncs via Firefox Sync and installs the actual addon
const INSTALLER_ADDON_ID = "tab-reuse-installer@kmrh47.github.io";
const TARGET_ADDON_ID = "tab-reuse@kmrh47.github.io";
const TARGET_ADDON_URL = "https://github.com/KMRH47/firefox-addon-open-specific-tab/releases/latest/download/tab-reuse-*.xpi";

async function getLatestXpiUrl() {
  try {
    const response = await fetch('https://api.github.com/repos/KMRH47/firefox-addon-open-specific-tab/releases/latest');
    const data = await response.json();
    const xpiAsset = data.assets.find(a => a.name.endsWith('.xpi'));
    return xpiAsset?.browser_download_url || null;
  } catch (e) {
    console.error('Failed to fetch latest release:', e);
    return null;
  }
}

async function installTargetAddon() {
  // Check if target addon already installed
  const existing = await browser.management.get(TARGET_ADDON_ID).catch(() => null);
  if (existing && existing.enabled) {
    console.log('Target addon already installed');
    return;
  }

  // Get latest XPI URL
  const xpiUrl = await getLatestXpiUrl();
  if (!xpiUrl) {
    console.error('Could not find XPI URL');
    return;
  }

  // Install the addon
  try {
    await browser.management.install({
      url: xpiUrl,
      hash: '' // Firefox will verify signature
    });
    console.log('Target addon installed successfully');
  } catch (e) {
    console.error('Failed to install target addon:', e);
  }
}

// Install on startup
browser.runtime.onStartup.addListener(() => {
  installTargetAddon();
});

// Install when addon is enabled
browser.runtime.onInstalled.addListener(() => {
  installTargetAddon();
});

// Also try immediately
installTargetAddon();
