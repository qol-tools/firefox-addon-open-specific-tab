# Tab Reuse

Firefox extension that reuses existing tabs when URLs are opened with `__reuse_tab=1` parameter.

## Usage

```bash
open -a "Firefox" "https://example.com/page?__reuse_tab=1"
```

- Exact URL match: reuses the matching tab
- Root domain (e.g., `youtube.com/?__reuse_tab=1`): reuses any tab on that domain
- No match: opens the URL normally

## Installation

### First Time Setup

1. Get Mozilla API credentials: https://addons.mozilla.org/developers/addon/api/key/
2. Add secrets `MOZILLA_API_KEY` and `MOZILLA_API_SECRET` to GitHub repo settings
3. Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
4. Download the signed `.xpi` from the Releases page
5. Open the `.xpi` file in Firefox to install

### Auto-Install on New Firefox Profiles

Since Firefox Sync doesn't sync unlisted addons, use one of these methods:

**Option 1: Bookmark the installer page**
1. Open `install.html` in Firefox (or host it somewhere)
2. Bookmark it
3. On new Firefox profiles, open the bookmark and click "Install Addon"

**Option 2: Direct XPI link**
1. Get the direct download URL from GitHub Releases (right-click `.xpi` ? Copy link)
2. Bookmark that URL
3. Open it in Firefox on new profiles

**Option 3: Firefox Enterprise Policies** (advanced)
Create `autoconfig.js` and `mozilla.cfg` in Firefox profile directory to auto-install from URL. See Firefox Enterprise documentation.

The addon persists across restarts and is signed by Mozilla.
