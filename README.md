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

1. Get Mozilla API credentials: https://addons.mozilla.org/developers/addon/api/key/
2. Add secrets `MOZILLA_API_KEY` and `MOZILLA_API_SECRET` to GitHub repo settings
3. Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
4. Download the signed `.xpi` from the Releases page
5. Open the `.xpi` file in Firefox to install

The addon persists across restarts and is signed by Mozilla.
