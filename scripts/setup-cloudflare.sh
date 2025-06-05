#!/bin/bash

# Script to set up Cloudflare for HTTPS with GitHub Pages

echo "Setting up Cloudflare for HTTPS with GitHub Pages"
echo "=================================================="
echo ""
echo "This will guide you through setting up Cloudflare to provide HTTPS for your GitHub Pages site."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Create a Cloudflare account${NC}"
echo "1. Go to https://cloudflare.com and sign up (free)"
echo "2. Add your domain (dark2048.com)"
echo ""
read -p "Press Enter when you've added your domain to Cloudflare..."

echo -e "\n${BLUE}Step 2: Update your nameservers${NC}"
echo "Cloudflare will show you 2 nameservers like:"
echo "  - xxxx.ns.cloudflare.com"
echo "  - yyyy.ns.cloudflare.com"
echo ""
echo "Update these at your domain registrar (Gandi):"
echo "1. Log into Gandi"
echo "2. Go to your domain settings"
echo "3. Change nameservers to Cloudflare's"
echo ""
read -p "Press Enter when you've updated nameservers..."

echo -e "\n${BLUE}Step 3: Configure DNS in Cloudflare${NC}"
echo "In Cloudflare's DNS settings, add these records:"
echo ""
echo -e "${GREEN}A Records (all proxied - orange cloud ON):${NC}"
echo "  Type: A    Name: @    Content: 185.199.108.153    Proxy: ON"
echo "  Type: A    Name: @    Content: 185.199.109.153    Proxy: ON"
echo "  Type: A    Name: @    Content: 185.199.110.153    Proxy: ON"
echo "  Type: A    Name: @    Content: 185.199.111.153    Proxy: ON"
echo ""
echo -e "${GREEN}CNAME Record (proxied - orange cloud ON):${NC}"
echo "  Type: CNAME    Name: www    Content: alexandrosm.github.io    Proxy: ON"
echo ""
read -p "Press Enter when you've added all DNS records..."

echo -e "\n${BLUE}Step 4: Configure SSL/TLS settings${NC}"
echo "In Cloudflare, go to SSL/TLS settings:"
echo "1. Set SSL/TLS encryption mode to: ${GREEN}Full${NC}"
echo "2. Enable 'Always Use HTTPS'"
echo "3. Enable 'Automatic HTTPS Rewrites'"
echo ""
read -p "Press Enter when you've configured SSL settings..."

echo -e "\n${BLUE}Step 5: Page Rules (Optional but recommended)${NC}"
echo "Add a page rule for better caching:"
echo "1. Go to Rules > Page Rules"
echo "2. Create rule for: ${GREEN}dark2048.com/*${NC}"
echo "3. Settings:"
echo "   - Cache Level: Cache Everything"
echo "   - Edge Cache TTL: 1 month"
echo "   - Browser Cache TTL: 1 month"
echo ""
read -p "Press Enter when done (or skip)..."

echo -e "\n${BLUE}Step 6: Wait for propagation${NC}"
echo "DNS changes can take 1-48 hours to propagate."
echo "You can check status at: https://www.whatsmydns.net/#A/dark2048.com"
echo ""
echo -e "${GREEN}Once propagated, your site will be available at:${NC}"
echo "  https://dark2048.com (with Cloudflare SSL)"
echo ""
echo -e "${YELLOW}Benefits of this setup:${NC}"
echo "  ✓ Instant HTTPS"
echo "  ✓ Free SSL certificate"
echo "  ✓ CDN caching"
echo "  ✓ DDoS protection"
echo "  ✓ Analytics"
echo ""
echo "Done! Your site should have HTTPS once DNS propagates."