#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Running pre-push tests..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Warning: Node.js not found. Skipping JavaScript syntax check.${NC}"
else
    # Check JavaScript syntax
    echo "Checking JavaScript syntax..."
    
    for file in *.js; do
        if [ -f "$file" ]; then
            echo -n "  Checking $file... "
            if node -c "$file" 2>/dev/null; then
                echo -e "${GREEN}OK${NC}"
            else
                echo -e "${RED}FAILED${NC}"
                echo -e "${RED}Syntax error in $file:${NC}"
                node -c "$file"
                exit 1
            fi
        fi
    done
fi

# Check HTML files for basic validity
echo "Checking HTML files..."
for file in *.html; do
    if [ -f "$file" ]; then
        echo -n "  Checking $file... "
        # Basic checks: matching tags, script references
        if grep -q '<script.*src="[^"]*\.js"' "$file"; then
            # Extract script sources and check they exist
            scripts=$(grep -o '<script.*src="[^"]*\.js"' "$file" | sed 's/.*src="\([^"]*\)".*/\1/')
            missing=false
            for script in $scripts; do
                # Skip external URLs
                if [[ ! "$script" =~ ^https?:// ]] && [ ! -f "$script" ]; then
                    echo -e "${RED}FAILED${NC}"
                    echo -e "${RED}    Missing script: $script${NC}"
                    missing=true
                fi
            done
            if [ "$missing" = false ]; then
                echo -e "${GREEN}OK${NC}"
            fi
        else
            echo -e "${GREEN}OK${NC}"
        fi
    fi
done

# Check for common issues
echo "Checking for common issues..."

# Check for console.log statements (optional warning)
if grep -n "console\.log" *.js 2>/dev/null | grep -v "No config.js found" | head -5; then
    echo -e "${YELLOW}Warning: console.log statements found (showing first 5)${NC}"
fi

# Check for debugger statements
if grep -n "debugger" *.js 2>/dev/null; then
    echo -e "${RED}Error: debugger statements found${NC}"
    exit 1
fi

# Check if required files exist
echo "Checking required files..."
required_files=("index.html" "game.js" "style.css" "manifest.json")
for file in "${required_files[@]}"; do
    echo -n "  Checking $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}exists${NC}"
    else
        echo -e "${RED}MISSING${NC}"
        exit 1
    fi
done

echo -e "${GREEN}All tests passed!${NC}"
exit 0