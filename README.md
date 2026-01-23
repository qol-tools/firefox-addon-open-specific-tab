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
- Path prefix match → switches to tab with matching path prefix
- Root domain (e.g., `youtube.com/?__reuse_tab=1`) → switches to any tab on that domain
- No match → opens URL normally in a new tab

### Run JS Commands

Execute commands on the target tab using `__run_js`:

```bash
# Delete localStorage/sessionStorage items by prefix
firefox "https://example.com?__reuse_tab=1&__run_js=delete_cookies=myprefix"

# Delete a specific storage item
firefox "https://example.com?__reuse_tab=1&__run_js=delete_cookie=mykey"

# Copy cookies to clipboard
firefox "https://example.com?__reuse_tab=1&__run_js=copy_cookies"
```

## Development

### Testing

```bash
npm install
npm test
```

Tests include property-based testing with ~10,000 random cases to catch edge cases in URL normalization.

### Release

Uses conventional commits to determine version bump:

```bash
./bump-version.sh        # Analyzes commits, bumps version, creates tag
git push origin master
git push origin v<version>
```

GitHub Actions automatically builds, signs with Mozilla, and creates a release.

## License

MIT
