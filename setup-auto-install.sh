#!/bin/bash
# Setup Firefox Enterprise Policies for auto-installing Tab Reuse addon
# Run this once per Firefox installation

set -e

# Detect OS and set Firefox directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    FIREFOX_DIR="$HOME/Library/Application Support/Firefox"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    FIREFOX_DIR="$HOME/.mozilla/firefox"
else
    echo "Unsupported OS"
    exit 1
fi

# Create directories
mkdir -p "$FIREFOX_DIR/distribution"
mkdir -p "$FIREFOX_DIR/defaults/pref"

# Create policies.json for auto-installation
cat > "$FIREFOX_DIR/distribution/policies.json" << 'POLICIES_EOF'
{
  "policies": {
    "Extensions": {
      "Install": [
        "https://github.com/KMRH47/firefox-addon-open-specific-tab/releases/latest/download/tab-reuse-*.xpi"
      ]
    }
  }
}
POLICIES_EOF

# Create autoconfig.js
cat > "$FIREFOX_DIR/defaults/pref/autoconfig.js" << 'AUTOCONFIG_EOF'
pref("general.config.filename", "mozilla.cfg");
pref("general.config.obscure_value", 0);
AUTOCONFIG_EOF

# Create mozilla.cfg
cat > "$FIREFOX_DIR/mozilla.cfg" << 'MOZILLA_CFG_EOF'
// Auto-install Tab Reuse addon
lockPref("xpinstall.signatures.required", false);
defaultPref("extensions.autoDisableScopes", 0);
defaultPref("extensions.enabledScopes", 15);
MOZILLA_CFG_EOF

echo "? Firefox Enterprise Policies configured"
echo "? Addon will auto-install on next Firefox start"
echo ""
echo "Note: You may need to restart Firefox for changes to take effect."
