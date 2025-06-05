#!/usr/bin/env python3
"""
Cloudflare setup helper for dark2048.com
Guides through setting up Cloudflare as HTTPS proxy for GitHub Pages
"""

import subprocess
import sys
import time
import socket

# Colors
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'

# GitHub Pages IPs
GITHUB_IPS = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']

def check_dns(domain, record_type='A'):
    """Check DNS records for a domain"""
    try:
        if record_type == 'A':
            ips = socket.gethostbyname_ex(domain)[2]
            return ips
        elif record_type == 'NS':
            cmd = f"nslookup -type=NS {domain} 8.8.8.8"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                ns_servers = [line.strip().split()[-1].rstrip('.') for line in lines 
                             if 'nameserver' in line.lower()]
                return ns_servers
    except Exception as e:
        return []
    return []

def check_https(domain):
    """Check if HTTPS is working"""
    try:
        import ssl
        import urllib.request
        
        context = ssl.create_default_context()
        response = urllib.request.urlopen(f'https://{domain}', context=context, timeout=5)
        return response.getcode() == 200
    except:
        return False

def main():
    domain = 'dark2048.com'
    
    print(f"{BLUE}Cloudflare HTTPS Setup for {domain}{NC}")
    print("=" * 50)
    print()
    
    # Check current DNS
    print(f"{BLUE}Checking current DNS status...{NC}")
    current_ips = check_dns(domain)
    current_ns = check_dns(domain, 'NS')
    
    print(f"\nCurrent A records: {current_ips}")
    print(f"Current nameservers: {current_ns}")
    
    # Check if already on Cloudflare
    on_cloudflare = any('cloudflare.com' in ns for ns in current_ns)
    
    if on_cloudflare:
        print(f"\n{GREEN}✓ Domain is already using Cloudflare nameservers!{NC}")
        
        # Check if HTTPS works
        if check_https(domain):
            print(f"{GREEN}✓ HTTPS is working!{NC}")
            print(f"\nYour site is available at: https://{domain}")
            return
        else:
            print(f"{YELLOW}⚠ HTTPS not working yet. Check Cloudflare SSL settings.{NC}")
            print("\nMake sure in Cloudflare:")
            print("1. SSL/TLS encryption mode is set to 'Full'")
            print("2. DNS records have orange cloud (proxy) enabled")
            print("3. Wait a few minutes for SSL certificate provisioning")
    else:
        print(f"\n{YELLOW}Domain is not on Cloudflare yet.{NC}")
        print("\nTo set up Cloudflare:")
        
        print(f"\n{BLUE}Step 1: Create Cloudflare account{NC}")
        print("1. Go to https://cloudflare.com")
        print("2. Sign up for free account")
        print("3. Add your domain (dark2048.com)")
        
        print(f"\n{BLUE}Step 2: Update nameservers at Gandi{NC}")
        print("Cloudflare will show you 2 nameservers to use.")
        print("Update these at https://admin.gandi.net")
        
        print(f"\n{BLUE}Step 3: Configure DNS in Cloudflare{NC}")
        print("Add these records (all with proxy ON - orange cloud):")
        print()
        print("A Records:")
        for ip in GITHUB_IPS:
            print(f"  Type: A    Name: @    Content: {ip}    Proxy: ON")
        print("\nCNAME Record:")
        print("  Type: CNAME    Name: www    Content: alexandrosm.github.io    Proxy: ON")
        
        print(f"\n{BLUE}Step 4: Configure SSL settings{NC}")
        print("In Cloudflare SSL/TLS settings:")
        print("  - SSL/TLS encryption: Full")
        print("  - Always Use HTTPS: ON")
        print("  - Automatic HTTPS Rewrites: ON")
        
        print(f"\n{BLUE}Step 5: Wait for DNS propagation{NC}")
        print("This usually takes 1-24 hours")
        
        # Offer to check again
        print(f"\n{YELLOW}Run this script again to check status.{NC}")
        
        # Save quick reference
        with open('CLOUDFLARE-DNS.txt', 'w') as f:
            f.write("Cloudflare DNS Configuration for dark2048.com\n")
            f.write("=" * 45 + "\n\n")
            f.write("A Records (all proxied):\n")
            for ip in GITHUB_IPS:
                f.write(f"  @ -> {ip}\n")
            f.write("\nCNAME Record (proxied):\n")
            f.write("  www -> alexandrosm.github.io\n")
            f.write("\nSSL/TLS Settings:\n")
            f.write("  - Encryption mode: Full\n")
            f.write("  - Always Use HTTPS: ON\n")
            f.write("  - Automatic HTTPS Rewrites: ON\n")
        
        print(f"\n{GREEN}✓ Created CLOUDFLARE-DNS.txt for reference{NC}")

if __name__ == '__main__':
    main()