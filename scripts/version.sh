#!/bin/bash

# Script to manage versioning with GitVersion and conventional commits

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Find GitVersion executable
GITVERSION=""
if command -v gitversion &> /dev/null; then
    GITVERSION="gitversion"
elif command -v dotnet-gitversion &> /dev/null; then
    GITVERSION="dotnet-gitversion"
elif [ -f ~/.local/bin/gitversion ]; then
    GITVERSION="~/.local/bin/gitversion"
else
    echo -e "${RED}❌ GitVersion not found!${NC}"
    echo -e "${YELLOW}Install with: ./scripts/install-gitversion.sh${NC}"
    exit 1
fi

# Command handling
case "${1:-show}" in
    show)
        echo -e "${BLUE}Current version info:${NC}"
        $GITVERSION /showvariable SemVer
        ;;
        
    detailed)
        echo -e "${BLUE}Detailed version info:${NC}"
        $GITVERSION
        ;;
        
    next)
        echo -e "${BLUE}Next version preview based on commits:${NC}"
        
        # Show recent commits that affect versioning
        echo -e "\n${YELLOW}Recent version-affecting commits:${NC}"
        git log --oneline -10 | grep -E "^[a-f0-9]+ (feat|fix|BREAKING CHANGE)" || echo "No version-affecting commits found"
        
        echo -e "\n${BLUE}Next version will be:${NC}"
        $GITVERSION /showvariable SemVer
        ;;
        
    update-package)
        # Update package.json with current version
        VERSION=$($GITVERSION /showvariable SemVer)
        echo -e "${BLUE}Updating package.json to version ${VERSION}...${NC}"
        
        if [ -f package.json ]; then
            # Use node to update package.json to preserve formatting
            node -e "
                const fs = require('fs');
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                pkg.version = '$VERSION';
                fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
            "
            echo -e "${GREEN}✅ Updated package.json to version ${VERSION}${NC}"
        else
            echo -e "${RED}❌ package.json not found${NC}"
        fi
        ;;
        
    tag)
        # Create a git tag with current version
        VERSION=$($GITVERSION /showvariable SemVer)
        TAG="v${VERSION}"
        
        echo -e "${BLUE}Creating tag ${TAG}...${NC}"
        git tag -a "$TAG" -m "Release version ${VERSION}"
        echo -e "${GREEN}✅ Created tag ${TAG}${NC}"
        echo -e "${YELLOW}Push with: git push origin ${TAG}${NC}"
        ;;
        
    bump-major)
        echo -e "${YELLOW}To bump major version, use a breaking change commit:${NC}"
        echo "  feat!: breaking change description"
        echo "  fix!: breaking change description"
        echo "  feat(scope)!: breaking change description"
        echo ""
        echo "Or include BREAKING CHANGE: in the commit body"
        ;;
        
    bump-minor)
        echo -e "${YELLOW}To bump minor version, use a feature commit:${NC}"
        echo "  feat: new feature description"
        echo "  feat(scope): new feature description"
        ;;
        
    bump-patch)
        echo -e "${YELLOW}To bump patch version, use a fix commit:${NC}"
        echo "  fix: bug fix description"
        echo "  fix(scope): bug fix description"
        ;;
        
    help|*)
        echo -e "${BLUE}GitVersion Helper Script${NC}"
        echo ""
        echo "Usage: ./scripts/version.sh [command]"
        echo ""
        echo "Commands:"
        echo "  show           - Show current version (default)"
        echo "  detailed       - Show detailed version information"
        echo "  next           - Preview next version based on commits"
        echo "  update-package - Update package.json with current version"
        echo "  tag            - Create git tag with current version"
        echo "  bump-major     - Show how to bump major version"
        echo "  bump-minor     - Show how to bump minor version"
        echo "  bump-patch     - Show how to bump patch version"
        echo "  help           - Show this help message"
        echo ""
        echo -e "${BLUE}Version Bumping Rules:${NC}"
        echo "  • feat: commits bump minor version (1.2.0 → 1.3.0)"
        echo "  • fix: commits bump patch version (1.2.0 → 1.2.1)"
        echo "  • feat!, fix!, etc. or BREAKING CHANGE bump major (1.2.0 → 2.0.0)"
        echo "  • Other types (docs, style, refactor, etc.) don't bump version"
        ;;
esac