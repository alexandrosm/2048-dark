#!/bin/bash

echo "🔍 Checking dark2048.com status..."
echo ""

# Check DNS
echo "📡 DNS Status:"
nslookup dark2048.com 8.8.8.8 | grep -A 3 "Address: 185" || echo "⏳ DNS not fully propagated yet"
echo ""

# Check HTTP
echo "🌐 HTTP Status:"
http_status=$(curl -s -o /dev/null -w "%{http_code}" http://dark2048.com)
if [ "$http_status" = "200" ]; then
    echo "✅ HTTP is working (http://dark2048.com)"
else
    echo "❌ HTTP not responding yet"
fi
echo ""

# Check HTTPS
echo "🔒 HTTPS Status:"
https_status=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" https://dark2048.com 2>/dev/null)
if [ "$https_status" = "200" ]; then
    echo "✅ HTTPS is working (https://dark2048.com)"
    echo "🎉 Your site is fully operational!"
else
    echo "⏳ HTTPS certificate still provisioning (this can take up to 24 hours)"
    echo "   GitHub Pages will automatically provision the SSL certificate"
fi
echo ""

# Check GitHub Pages status
echo "📊 GitHub Pages Response Headers:"
curl -sI http://dark2048.com | grep -E "Server:|X-GitHub-Request-Id:" | head -2