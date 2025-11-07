#!/bin/bash
# Setup Firefox Enterprise Policies for auto-installing Tab Reuse addon
# Run this once per machine - the addon will auto-install on every Firefox profile

set -e

# Detect OS and set Firefox directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    FIREFOX_DIR="$HOME/Library/Application Support/Firefox"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    FIREFOX_DIR="$HOME/.mozilla/firefox"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    FIREFOX_DIR="$APPDATA/Mozilla/Firefox"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# Get latest release XPI URL
echo "Fetching latest release URL..."
LATEST_RELEASE=$(curl -s https://api.github.com/repos/KMRH47/firefox-addon-open-specific-tab/releases/latest)
XPI_URL=$(echo "$LATEST_RELEASE" | grep -o '"browser_download_url": "[^"]*\.xpi"' | head -1 | cut -d'"' -f4)

if [ -z "$XPI_URL" ]; then
    echo "Error: Could not find XPI download URL"
    exit 1
fi

echo "Found XPI: $XPI_URL"

# Create distribution directory (works for all profiles)
mkdir -p "$FIREFOX_DIR/distribution"

# Create policies.json for auto-installation
cat > "$FIREFOX_DIR/distribution/policies.json" << POLICIES_EOF
{
  "policies": {
    "Extensions": {
      "Install": [
        "$XPI_URL"
      ]
    }
  }
}
POLICIES_EOF

echo ""
echo "? Firefox Enterprise Policies configured"
echo "? Addon will auto-install for all Firefox profiles on this machine"
echo "? Works with Firefox Sync - new profiles will get the addon automatically"
echo ""
echo "Restart Firefox to install the addon."
