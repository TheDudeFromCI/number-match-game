#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
RELEASE_DIR="$ROOT_DIR/release"
TARGET="linux"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --linux)
            TARGET="linux"
            shift
            ;;
        --win|--windows)
            TARGET="win"
            shift
            ;;
        --all)
            TARGET="all"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--linux | --win | --all]"
            exit 1
            ;;
    esac
done

cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required to build the release."
    exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ -d "$RELEASE_DIR" ]; then
    echo "Cleaning existing release directory..."
    rm -rf "$RELEASE_DIR"
fi

mkdir -p "$RELEASE_DIR"

echo "Building desktop release into $RELEASE_DIR"

BUILD_SCRIPT="package:$TARGET"

if [ "$TARGET" = "all" ]; then
    BUILD_SCRIPT="build"
fi

run_package_target() {
    local script_name="$1"

    if ! npm run "$script_name"; then
        cat <<'EOF'
Release build failed.

If Electron was not downloaded, your package manager may have blocked install scripts.
Allow Electron's postinstall step, rerun `npm install`, and try again.
EOF
        exit 1
    fi
}

if [ "$TARGET" = "all" ]; then
    run_package_target package:linux
    run_package_target package:win
else
    run_package_target "$BUILD_SCRIPT"
fi

echo "Release build complete."
echo "Artifacts are available in $RELEASE_DIR"