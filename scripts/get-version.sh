#!/bin/bash

# Simple script to get the current deployed version

VERSION=$(curl -s https://dark2048.com/config.js 2>/dev/null | grep APP_VERSION | sed -E "s/.*'(.*)'.*/\1/")

if [ -n "$VERSION" ]; then
    echo "$VERSION"
else
    echo "unknown"
    exit 1
fi