#!/bin/bash
# QuteNote LIVE RELOAD dev copy — installs "Qute Dev" (bundle club.cutenote.app.dev)
# onto Emerald's plugged-in iPhone, pointed at the Vite dev server on this mini.
# Changes to apps/web/src appear on the phone in ~1s. The TestFlight QuteNote
# app is untouched (different bundle id, separate icon on her home screen).
#
#   ./scripts/ios/dev-phone.sh            # build + install + start dev server
#   ./scripts/ios/dev-phone.sh server     # just (re)start the dev server
#
# SAFETY: this temporarily writes server.url into the native capacitor config
# and ATS/display-name tweaks into Info.plist, and ALWAYS restores them on exit.
# The ship pipeline must never see those edits — verify with:
#   grep '"server"' apps/web/ios/App/App/capacitor.config.json   (must be empty)
set -euo pipefail

WEB=~/Documents/QUTENOTEDEV/apps/web
UDID="00008150-000451E03C7A401C"   # Shellular 🐚
PORT=5173
TEAM=97276PB95S
KEY=~/.appstoreconnect/private_keys/AuthKey_Y5NXGFNCFV.p8
KEYID=Y5NXGFNCFV
ISSUER=a8f9ba85-917d-49e9-888e-e128d4ef6822

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1)
echo "→ mini LAN IP: $IP"

start_server() {
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT"; then
    echo "→ dev server already running on :$PORT"
  else
    echo "→ starting Vite dev server on 0.0.0.0:$PORT (API → prod)"
    cd "$WEB"
    VITE_API_BASE=https://qutenote.com/api VITE_BUILD=dev \
      nohup npx vite --host 0.0.0.0 --port $PORT > /tmp/qutenote-dev-server.log 2>&1 &
    for i in $(seq 1 20); do
      curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT" && break
      sleep 1
    done
    curl -s -o /dev/null --max-time 5 "http://127.0.0.1:$PORT" && echo "→ dev server up" || { echo "dev server failed — see /tmp/qutenote-dev-server.log"; exit 1; }
  fi
}

start_server
[ "${1:-}" = "server" ] && exit 0

CFG="$WEB/ios/App/App/capacitor.config.json"
PLIST="$WEB/ios/App/App/Info.plist"
cp "$CFG" "$CFG.shipbackup"
cp "$PLIST" "$PLIST.shipbackup"
restore() {
  mv -f "$CFG.shipbackup" "$CFG" 2>/dev/null || true
  mv -f "$PLIST.shipbackup" "$PLIST" 2>/dev/null || true
  echo "→ native config restored (ship-safe)"
}
trap restore EXIT

# point the dev copy at the live server
python3 - "$CFG" "$IP" "$PORT" << 'EOF'
import json, sys
p, ip, port = sys.argv[1], sys.argv[2], sys.argv[3]
c = json.load(open(p))
c['server'] = {'url': f'http://{ip}:{port}', 'cleartext': True}
json.dump(c, open(p, 'w'), indent=2)
EOF

# dev display name + allow plain-http to the mini on the local network
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Qute Dev" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" "$PLIST" 2>/dev/null || true

echo "→ building Qute Dev (Debug, automatic signing)"
cd "$WEB"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "id=$UDID" -derivedDataPath /tmp/qutenote-dev-dd \
  PRODUCT_BUNDLE_IDENTIFIER=club.cutenote.app.dev \
  CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=$TEAM \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  -authenticationKeyPath "$KEY" -authenticationKeyID $KEYID -authenticationKeyIssuerID $ISSUER \
  build | tail -2

APP=/tmp/qutenote-dev-dd/Build/Products/Debug-iphoneos/App.app
echo "→ installing on Shellular 🐚"
xcrun devicectl device install app --device "$UDID" "$APP"
xcrun devicectl device process launch --device "$UDID" club.cutenote.app.dev || true
echo ""
echo "✓ Qute Dev is on the phone. Edits under apps/web/src appear live."
echo "  Phone and mini must share the same WiFi. Dev server log: /tmp/qutenote-dev-server.log"
