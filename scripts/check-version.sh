#!/bin/bash

# Script to check the current deployed version of 2048 Dark

echo "Checking 2048 Dark version..."
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check local git info
echo -e "${BLUE}Local Repository:${NC}"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
LATEST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "unknown")
echo "  Branch: $CURRENT_BRANCH"
echo "  Latest commit: $LATEST_COMMIT"
echo ""

# Check deployed version
echo -e "${BLUE}Deployed Version:${NC}"
DEPLOYED_VERSION=$(curl -s https://dark2048.com/config.js | grep APP_VERSION | sed -E "s/.*'(.*)'.*/\1/")
if [ -n "$DEPLOYED_VERSION" ]; then
    echo -e "  ${GREEN}https://dark2048.com: v${DEPLOYED_VERSION}${NC}"
else
    echo -e "  ${YELLOW}Unable to fetch version from site${NC}"
fi
echo ""

# Check GitHub deployment status
echo -e "${BLUE}GitHub Deployment Status:${NC}"
if command -v gh >/dev/null 2>&1; then
    # Get latest deployment workflow
    LATEST_RUN=$(gh run list --workflow "Build and Deploy with Secrets" --limit 1 2>/dev/null)
    if [ -n "$LATEST_RUN" ]; then
        STATUS=$(echo "$LATEST_RUN" | awk '{print $1}')
        CONCLUSION=$(echo "$LATEST_RUN" | awk '{print $2}')
        COMMIT_MSG=$(echo "$LATEST_RUN" | awk '{for(i=3;i<=NF-5;i++) printf "%s ", $i; print ""}' | sed 's/ *$//')
        TIME=$(echo "$LATEST_RUN" | awk '{print $(NF)}')
        
        if [ "$STATUS" = "completed" ]; then
            if [ "$CONCLUSION" = "success" ]; then
                echo -e "  Status: ${GREEN}✓ Deployed${NC}"
            else
                echo -e "  Status: ${YELLOW}✗ Failed${NC}"
            fi
        elif [ "$STATUS" = "queued" ] || [ "$STATUS" = "in_progress" ]; then
            echo -e "  Status: ${YELLOW}⏳ Deploying...${NC}"
        else
            echo -e "  Status: ${YELLOW}$STATUS${NC}"
        fi
        echo "  Commit: $COMMIT_MSG"
        echo "  Time: $TIME"
    else
        echo "  No recent deployments found"
    fi
else
    echo "  GitHub CLI not installed (install with: brew install gh)"
fi
echo ""

# Check for pending changes
echo -e "${BLUE}Pending Changes:${NC}"
CHANGED_FILES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGED_FILES" -gt 0 ]; then
    echo -e "  ${YELLOW}$CHANGED_FILES file(s) with uncommitted changes${NC}"
    git status --porcelain | head -5 | sed 's/^/    /'
    if [ "$CHANGED_FILES" -gt 5 ]; then
        echo "    ... and $((CHANGED_FILES - 5)) more"
    fi
else
    echo -e "  ${GREEN}✓ No uncommitted changes${NC}"
fi

# Show version in browser
echo ""
echo -e "${BLUE}To see version in the game:${NC}"
echo "  1. Visit https://dark2048.com"
echo "  2. Look at bottom right corner"
echo "  3. Hover (desktop) or tap (mobile) to reveal version"