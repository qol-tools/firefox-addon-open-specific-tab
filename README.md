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

### Auto-Install on New Machines/Profiles

Firefox Sync doesn't sync unlisted addons. To auto-install on new machines:

**Run once per machine:**
```bash
./setup-auto-install.sh
```

This configures Firefox Enterprise Policies to automatically install the addon for all profiles on that machine. After running this script, any Firefox profile (including new ones via Sync) will automatically get the addon installed.

The addon persists across restarts and is signed by Mozilla.
