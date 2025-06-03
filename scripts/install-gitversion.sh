#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Installing GitVersion...${NC}"

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="osx"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

# Method 1: Install as .NET tool (recommended)
if command -v dotnet &> /dev/null; then
    echo -e "${GREEN}Installing GitVersion as .NET tool...${NC}"
    dotnet tool install --global GitVersion.Tool
    echo -e "${GREEN}✅ GitVersion installed as .NET tool${NC}"
    echo -e "${YELLOW}Run with: dotnet-gitversion${NC}"
    exit 0
fi

# Method 2: Install via Homebrew (macOS/Linux)
if command -v brew &> /dev/null; then
    echo -e "${GREEN}Installing GitVersion via Homebrew...${NC}"
    brew install gitversion
    echo -e "${GREEN}✅ GitVersion installed via Homebrew${NC}"
    exit 0
fi

# Method 3: Install via Chocolatey (Windows)
if command -v choco &> /dev/null; then
    echo -e "${GREEN}Installing GitVersion via Chocolatey...${NC}"
    choco install gitversion.portable -y
    echo -e "${GREEN}✅ GitVersion installed via Chocolatey${NC}"
    exit 0
fi

# Method 4: Download binary directly
echo -e "${YELLOW}Installing GitVersion binary...${NC}"

GITVERSION_VERSION="5.12.0"
DOWNLOAD_URL=""

case "$OS" in
    linux)
        DOWNLOAD_URL="https://github.com/GitTools/GitVersion/releases/download/$GITVERSION_VERSION/gitversion-linux-x64-$GITVERSION_VERSION.tar.gz"
        ;;
    osx)
        DOWNLOAD_URL="https://github.com/GitTools/GitVersion/releases/download/$GITVERSION_VERSION/gitversion-osx-x64-$GITVERSION_VERSION.tar.gz"
        ;;
    windows)
        DOWNLOAD_URL="https://github.com/GitTools/GitVersion/releases/download/$GITVERSION_VERSION/gitversion-win-x64-$GITVERSION_VERSION.zip"
        ;;
esac

if [ -n "$DOWNLOAD_URL" ]; then
    mkdir -p ~/.local/bin
    cd /tmp
    
    if [[ "$OS" == "windows" ]]; then
        curl -L -o gitversion.zip "$DOWNLOAD_URL"
        unzip gitversion.zip -d ~/.local/bin/
    else
        curl -L -o gitversion.tar.gz "$DOWNLOAD_URL"
        tar -xzf gitversion.tar.gz -C ~/.local/bin/
    fi
    
    chmod +x ~/.local/bin/gitversion
    
    echo -e "${GREEN}✅ GitVersion installed to ~/.local/bin/gitversion${NC}"
    echo -e "${YELLOW}Add ~/.local/bin to your PATH:${NC}"
    echo 'export PATH="$HOME/.local/bin:$PATH"'
else
    echo -e "${YELLOW}Please install GitVersion manually from:${NC}"
    echo "https://github.com/GitTools/GitVersion/releases"
fi