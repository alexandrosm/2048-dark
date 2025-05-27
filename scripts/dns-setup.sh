#!/bin/bash
# DNS automation wrapper script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if GANDI_PAT is set
if [ -z "$GANDI_PAT" ]; then
    echo -e "${RED}Error: GANDI_PAT environment variable not set${NC}"
    echo "Export your Gandi Personal Access Token:"
    echo "  export GANDI_PAT='your-token-here'"
    exit 1
fi

# Change to script directory
cd "$(dirname "$0")"

# Make Python script executable
chmod +x gandi_dns.py

# Function to setup a domain
setup_domain() {
    local domain=$1
    echo -e "${YELLOW}Setting up $domain for GitHub Pages...${NC}"
    python3 gandi_dns.py setup-github "$domain"
}

# Function to verify domain
verify_domain() {
    local domain=$1
    python3 gandi_dns.py verify "$domain"
}

# Function to list all domains
list_domains() {
    echo -e "${YELLOW}Your Gandi domains:${NC}"
    python3 gandi_dns.py list-domains
}

# Main menu
case "$1" in
    setup)
        if [ -z "$2" ]; then
            echo "Usage: $0 setup <domain>"
            exit 1
        fi
        setup_domain "$2"
        ;;
    verify)
        if [ -z "$2" ]; then
            echo "Usage: $0 verify <domain>"
            exit 1
        fi
        verify_domain "$2"
        ;;
    list)
        list_domains
        ;;
    setup-all)
        # Setup multiple domains at once
        echo -e "${YELLOW}Setting up all domains...${NC}"
        domains=("$@")
        for domain in "${domains[@]:1}"; do
            setup_domain "$domain"
            echo ""
        done
        ;;
    *)
        echo "DNS Management Tool"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  list                  List all your domains"
        echo "  setup <domain>        Setup domain for GitHub Pages"
        echo "  verify <domain>       Check if DNS has propagated"
        echo "  setup-all <domains>   Setup multiple domains"
        echo ""
        echo "Examples:"
        echo "  $0 setup dark2048.com"
        echo "  $0 verify dark2048.com"
        echo "  $0 setup-all dark2048.com another-domain.com"
        ;;
esac