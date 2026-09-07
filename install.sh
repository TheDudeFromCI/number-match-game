#!/usr/bin/env bash

set -euo pipefail

CWD=$(pwd)
INCLUDE_DEV=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dev)
            INCLUDE_DEV=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dev]"
            exit 1
            ;;
    esac
done

install () {
    cd "$1"

    if [ "$INCLUDE_DEV" = true ]; then
        npm install --include=dev
    else
        npm install
    fi

    RETURN_CODE=$?

    if [ $RETURN_CODE -ne 0 ]; then
        cd "$CWD"
        exit $RETURN_CODE
    fi


    npm run build
    RETURN_CODE=$?
    cd "$CWD"

    if [ $RETURN_CODE -ne 0 ]; then
        exit $RETURN_CODE
    fi
}


echo "Installing common dependencies..."
install common

echo "Installing frontend dependencies..."
install frontend

echo "Installing backend dependencies..."
install backend

echo "Installation complete."
