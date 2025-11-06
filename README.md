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

### Option 1: Temporary Add-on (Development)

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the extension folder
4. Note: Extension unloads after Firefox restarts

### Option 2: Self-Signed Add-on (Persistent)

1. Install `web-ext`:
   ```bash
   npm install -g web-ext
   ```

2. Sign the addon (requires Mozilla API credentials):
   ```bash
   web-ext sign --api-key=YOUR_API_KEY --api-secret=YOUR_API_SECRET
   ```
   This creates a signed `.xpi` file in `web-ext-artifacts/`

3. Install the signed `.xpi`:
   - Drag and drop the `.xpi` file onto Firefox, or
   - Go to `about:addons` ? Install from file

**Get API credentials:**
- Go to https://addons.mozilla.org/developers/addon/api/key/
- Create new API credentials (no addon submission required)

### Option 3: Private Cloud Distribution (Recommended)

Build and host the signed XPI file privately:

1. **Build the signed addon:**
   ```bash
   export MOZILLA_API_KEY=your_key
   export MOZILLA_API_SECRET=your_secret
   ./build.sh
   ```
   Get API credentials: https://addons.mozilla.org/developers/addon/api/key/

2. **Upload the XPI to private storage:**
   - **GitHub Releases** (private repo): 
     - Add secrets `MOZILLA_API_KEY` and `MOZILLA_API_SECRET` to repo settings
     - Push a tag: `git tag v1.0.0 && git push origin v1.0.0`
     - GitHub Actions will build and create a release with the XPI
     - Download link will be available on the releases page
   - **Dropbox/Google Drive**: Upload XPI, get shareable link (set to "Anyone with link")
   - **Private S3/Cloud Storage**: Upload with a signed URL
   - **Your own server**: Host the XPI file

3. **Install from URL:**
   - Get the direct download link to your `.xpi` file
   - Open the link in Firefox (or use `firefox https://your-link.com/addon.xpi`)
   - Firefox will prompt to install the addon
   - The addon persists across restarts

**Benefits:**
- ? Private (only you/authorized users have access)
- ? Persistent (survives Firefox restarts)
- ? Easy installation on multiple devices
- ? No manual file copying needed

### Option 4: Unlisted on AMO (Public but Hidden)

1. Submit to https://addons.mozilla.org/developers/addon/submit/
2. Choose "On your own" distribution
3. Keep it unlisted (only accessible via direct link)
4. Users can install via the download link without manual installation
