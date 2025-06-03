#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read the commit message from the file passed as argument
commit_file=$1
commit_message=$(cat "$commit_file")

# Remove comments and empty lines
commit_message=$(echo "$commit_message" | grep -v '^#' | grep -v '^$' | head -1)

# Conventional commit regex pattern
# Format: <type>(<scope>): <subject>
# or:     <type>: <subject>
pattern="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([a-zA-Z0-9_-]+\))?: .{1,100}$"

# Check if the commit message matches the pattern
if [[ ! "$commit_message" =~ $pattern ]]; then
    echo -e "${RED}❌ Invalid commit message format!${NC}"
    echo -e "${RED}Your message: ${NC}$commit_message"
    echo ""
    echo -e "${BLUE}📝 Conventional Commits Format:${NC}"
    echo -e "  ${GREEN}<type>${NC}[${GREEN}<scope>${NC}]: ${GREEN}<description>${NC}"
    echo ""
    echo -e "${BLUE}📋 Valid types:${NC}"
    echo -e "  ${YELLOW}feat${NC}     - A new feature"
    echo -e "  ${YELLOW}fix${NC}      - A bug fix"
    echo -e "  ${YELLOW}docs${NC}     - Documentation only changes"
    echo -e "  ${YELLOW}style${NC}    - Code style changes (formatting, semicolons, etc)"
    echo -e "  ${YELLOW}refactor${NC} - Code change that neither fixes a bug nor adds a feature"
    echo -e "  ${YELLOW}test${NC}     - Adding or updating tests"
    echo -e "  ${YELLOW}chore${NC}    - Changes to build process or auxiliary tools"
    echo -e "  ${YELLOW}perf${NC}     - Performance improvements"
    echo -e "  ${YELLOW}ci${NC}       - CI/CD configuration changes"
    echo -e "  ${YELLOW}build${NC}    - Changes that affect the build system"
    echo -e "  ${YELLOW}revert${NC}   - Reverts a previous commit"
    echo ""
    echo -e "${BLUE}✨ Examples:${NC}"
    echo -e "  feat: add dark mode toggle"
    echo -e "  fix(game): prevent duplicate tile spawning"
    echo -e "  docs: update README with setup instructions"
    echo -e "  style: format code with prettier"
    echo -e "  refactor(touch): simplify gesture handling"
    echo -e "  test: add unit tests for game logic"
    echo -e "  chore: update dependencies"
    echo ""
    echo -e "${BLUE}📏 Rules:${NC}"
    echo -e "  • Type and description are mandatory"
    echo -e "  • Scope is optional but recommended"
    echo -e "  • Description must be <= 100 characters"
    echo -e "  • Use present tense ('add' not 'added')"
    echo -e "  • Don't capitalize first letter"
    echo -e "  • No period at the end"
    echo ""
    exit 1
fi

# Extract parts of the commit message
type_pattern="^([a-zA-Z]+)"
scope_pattern="(\(([a-zA-Z0-9_-]+)\))?"
desc_pattern=": (.+)$"
full_pattern="${type_pattern}${scope_pattern}${desc_pattern}"

if [[ "$commit_message" =~ $full_pattern ]]; then
    type="${BASH_REMATCH[1]}"
    scope="${BASH_REMATCH[3]}"
    description="${BASH_REMATCH[4]}"
    
    # Check description length
    if [ ${#description} -gt 100 ]; then
        echo -e "${RED}❌ Commit description too long!${NC}"
        echo -e "Description length: ${#description} characters (max: 100)"
        echo -e "Description: $description"
        exit 1
    fi
    
    # Check for capital letter at start of description
    if [[ "$description" =~ ^[A-Z] ]]; then
        echo -e "${YELLOW}⚠️  Warning: Description should start with lowercase${NC}"
        echo -e "Description: $description"
    fi
    
    # Check for period at end
    if [[ "$description" =~ \.$ ]]; then
        echo -e "${YELLOW}⚠️  Warning: Description should not end with a period${NC}"
        echo -e "Description: $description"
    fi
    
    echo -e "${GREEN}✅ Valid commit message!${NC}"
    echo -e "Type: ${BLUE}$type${NC}"
    if [ -n "$scope" ]; then
        echo -e "Scope: ${BLUE}$scope${NC}"
    fi
    echo -e "Description: ${BLUE}$description${NC}"
fi

exit 0