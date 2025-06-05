# Cloudflare Setup for dark2048.com

## Step 1: Create Cloudflare Account
1. Go to https://cloudflare.com
2. Click "Sign Up" (free plan is perfect)
3. Add your site: `dark2048.com`
4. Cloudflare will scan your existing DNS records

## Step 2: Update Nameservers at Gandi
Cloudflare will show you 2 nameservers like:
- `xxx.ns.cloudflare.com`
- `yyy.ns.cloudflare.com`

At Gandi (https://admin.gandi.net):
1. Go to Domain > dark2048.com
2. Click "Nameservers"
3. Change to "External nameservers"
4. Replace with Cloudflare's nameservers
5. Save changes

## Step 3: Configure DNS in Cloudflare
Once nameservers are active, in Cloudflare DNS:

### Required DNS Records:
```
Type  Name  Content                   Proxy Status
A     @     185.199.108.153          Proxied (orange cloud)
A     @     185.199.109.153          Proxied (orange cloud)
A     @     185.199.110.153          Proxied (orange cloud)
A     @     185.199.111.153          Proxied (orange cloud)
CNAME www   alexandrosm.github.io    Proxied (orange cloud)
```

**IMPORTANT**: All records must have the orange cloud (Proxied) enabled!

## Step 4: Configure SSL/TLS Settings
In Cloudflare dashboard:
1. Go to SSL/TLS > Overview
2. Set encryption mode to: **Full** (not Flexible, not Full strict)
3. Go to SSL/TLS > Edge Certificates
4. Enable "Always Use HTTPS" 
5. Enable "Automatic HTTPS Rewrites"

## Step 5: Verify Setup
- DNS propagation: 5 minutes to 48 hours (usually < 1 hour)
- Check status: https://www.whatsmydns.net/#NS/dark2048.com
- Once propagated, https://dark2048.com will work!

## Troubleshooting
- "Too many redirects": Make sure SSL mode is "Full" not "Flexible"
- Site not loading: Ensure orange cloud is ON for all records
- Certificate error: Wait a few minutes for Cloudflare to provision

## Benefits You Get:
✓ Instant HTTPS (no more waiting for GitHub)
✓ Free SSL certificate (auto-renewed)
✓ Global CDN (faster loading worldwide)
✓ DDoS protection
✓ Web analytics
✓ Page rules for caching