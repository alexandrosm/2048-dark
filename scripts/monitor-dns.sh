#!/bin/bash

# Monitor DNS propagation to Cloudflare

echo "Monitoring DNS propagation for dark2048.com"
echo "==========================================="
echo "Target nameservers:"
echo "  - lee.ns.cloudflare.com"
echo "  - raphaela.ns.cloudflare.com"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_dns() {
    echo -n "Checking nameservers... "
    NS=$(nslookup -type=NS dark2048.com 8.8.8.8 2>/dev/null | grep "nameserver" | awk '{print $3}')
    
    if echo "$NS" | grep -q "lee.ns.cloudflare.com"; then
        echo -e "${GREEN}✓ Cloudflare active!${NC}"
        return 0
    else
        echo -e "${YELLOW}Still on Gandi${NC}"
        return 1
    fi
}

# Check every 30 seconds
while true; do
    if check_dns; then
        echo ""
        echo -e "${GREEN}DNS has propagated! Checking HTTPS...${NC}"
        
        # Give it a moment for SSL to provision
        sleep 10
        
        if curl -Is https://dark2048.com 2>/dev/null | head -n 1 | grep -q "200\|301\|302"; then
            echo -e "${GREEN}✓ HTTPS is working!${NC}"
            echo ""
            echo "Your site is now available at: https://dark2048.com"
            exit 0
        else
            echo "HTTPS provisioning... (this may take a few minutes)"
            echo "Make sure SSL/TLS mode is set to 'Full' in Cloudflare"
        fi
    fi
    
    echo "Checking again in 30 seconds... (Ctrl+C to stop)"
    sleep 30
done