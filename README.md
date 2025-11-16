# Tab Reuse

Firefox extension that reuses existing tabs when opening URLs with the `__reuse_tab=1` parameter.

## Why?

Prevent duplicate tabs when opening links from external applications or scripts. Instead of creating a new tab every time, this extension intelligently reuses existing tabs.

## Installation

1. Download the latest release from the [Releases page](https://github.com/qol-tools/firefox-addon-open-specific-tab/releases)
2. Open the `.xpi` file in Firefox
3. Confirm the installation

The extension persists across browser restarts and is signed by Mozilla.

## Usage

Add `__reuse_tab=1` to any URL when opening from external applications:

```bash
firefox "https://example.com/page?__reuse_tab=1"
```

**Behavior:**
- Exact URL match → switches to the existing tab
- Root domain (e.g., `youtube.com/?__reuse_tab=1`) → switches to any tab on that domain
- No match → opens URL normally in a new tab

## License

MIT
