# Tab Reuse Extension

Firefox extension that reuses existing tabs when URLs are opened externally with a special flag.

## Usage

The extension **only** acts when URLs contain the `__reuse_tab` query parameter. This ensures it doesn't interfere with normal browsing or restored tabs.

```bash
open -a "Firefox" "https://outlook.office.com/mail?__reuse_tab=1"
```

## How It Works

1. URL opened with `?__reuse_tab=1` parameter
2. Extension detects new tab with this flag
3. Checks for exact URL match first
4. If no exact match: searches for existing tab with matching domain
5. If multiple domain matches: prefers exact path match
6. If found: focuses existing tab and closes new one
7. If not found: removes the flag and opens the URL normally

## Installation

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the extension folder
4. Extension loads automatically after Firefox restarts (if you save it permanently)
