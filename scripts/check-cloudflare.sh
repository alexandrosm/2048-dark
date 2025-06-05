#!/bin/bash

# Check if domain has moved to Cloudflare nameservers

echo "Checking Cloudflare setup for dark2048.com..."
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check nameservers
echo "Current nameservers:"
NS_RECORDS=$(nslookup -type=NS dark2048.com 8.8.8.8 2>/dev/null | grep "nameserver" | awk '{print $3}')
echo "$NS_RECORDS"
echo ""

# Check if on Cloudflare
if echo "$NS_RECORDS" | grep -q "cloudflare.com"; then
    echo -e "${GREEN}✓ Domain is using Cloudflare nameservers!${NC}"
    echo ""
    
    # Check A records
    echo "Checking DNS records..."
    A_RECORDS=$(nslookup dark2048.com 8.8.8.8 2>/dev/null | grep "Address" | grep -v "#" | awk '{print $2}')
    echo "A records: $A_RECORDS"
    
    # Try HTTPS
    echo ""
    echo "Testing HTTPS..."
    if curl -Is https://dark2048.com | head -n 1 | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ HTTPS is working!${NC}"
        echo ""
        echo -e "${GREEN}Success! Your site is available at https://dark2048.com${NC}"
    else
        echo -e "${YELLOW}⚠ HTTPS not ready yet. This is normal.${NC}"
        echo ""
        echo "Make sure in Cloudflare:"
        echo "1. All DNS records have orange cloud (proxy) enabled"
        echo "2. SSL/TLS mode is set to 'Full'"
        echo "3. Wait 5-10 minutes for SSL certificate"
    fi
else
    echo -e "${YELLOW}Still using Gandi nameservers.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add dark2048.com to your Cloudflare account"
    echo "2. Update nameservers at Gandi to Cloudflare's"
    echo "3. Run this script again to check progress"
    echo ""
    echo "DNS propagation usually takes 5 minutes to 2 hours."
fi