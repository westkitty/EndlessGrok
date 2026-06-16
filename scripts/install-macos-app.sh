#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Endless Grok"
BUNDLE_ID="com.endlessgrok.launcher"
BUILD_DIR="$PROJECT_DIR/scripts/macos/build"
APP_BUNDLE="$BUILD_DIR/${APP_NAME}.app"
INSTALL_DIR="${HOME}/Applications"
INSTALL_PATH="${INSTALL_DIR}/${APP_NAME}.app"
ICONSET_DIR="$BUILD_DIR/AppIcon.iconset"

echo "Building ${APP_NAME}.app..."

rm -rf "$APP_BUNDLE" "$ICONSET_DIR"
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources" "$ICONSET_DIR"

# Generate icon sizes from favicon.svg
BASE_PNG="$BUILD_DIR/icon-base.png"
qlmanage -t -s 1024 -o "$BUILD_DIR" "$PROJECT_DIR/public/favicon.svg" >/dev/null 2>&1
mv "$BUILD_DIR/favicon.svg.png" "$BASE_PNG"

make_icon() {
  local size="$1"
  local name="$2"
  sips -z "$size" "$size" "$BASE_PNG" --out "$ICONSET_DIR/$name" >/dev/null
}

make_icon 16 "icon_16x16.png"
make_icon 32 "icon_16x16@2x.png"
make_icon 32 "icon_32x32.png"
make_icon 64 "icon_32x32@2x.png"
make_icon 128 "icon_128x128.png"
make_icon 256 "icon_128x128@2x.png"
make_icon 256 "icon_256x256.png"
make_icon 512 "icon_256x256@2x.png"
make_icon 512 "icon_512x512.png"
make_icon 1024 "icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o "$APP_BUNDLE/Contents/Resources/AppIcon.icns"

cp "$PROJECT_DIR/scripts/macos/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

cat >"$APP_BUNDLE/Contents/MacOS/launcher" <<EOF
#!/bin/bash
exec "${PROJECT_DIR}/scripts/launcher.sh"
EOF
chmod +x "$APP_BUNDLE/Contents/MacOS/launcher"
chmod +x "$PROJECT_DIR/scripts/launcher.sh"

mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_PATH"
cp -R "$APP_BUNDLE" "$INSTALL_PATH"

echo ""
echo "Installed: ${INSTALL_PATH}"
echo ""
echo "To add to your Dock:"
echo "  1. Open Finder → Applications (in your home folder)"
echo "  2. Drag \"${APP_NAME}\" to the Dock"
echo ""
echo "Double-click the app anytime to launch the game in your browser."