# Scripts

This directory contains utility scripts for the 2048 Dark project.

## Version Management Scripts

### `check-version.sh`
Comprehensive version checker that shows:
- Current deployed version on dark2048.com
- Local repository status
- GitHub deployment status
- Pending changes

Usage:
```bash
./scripts/check-version.sh
```

### `get-version.sh`
Simple script that returns just the version number.

Usage:
```bash
VERSION=$(./scripts/get-version.sh)
echo "Current version: v$VERSION"
```

## Testing Scripts

### `test.sh`
Runs basic tests before pushing code:
- Checks JavaScript syntax in all .js files
- Verifies HTML files reference existing scripts
- Checks for debugger statements
- Warns about console.log statements
- Verifies required files exist

Run manually: 
```bash
./scripts/test.sh
# or
npm test
```

The test script is automatically run before each git push via a pre-push hook.

## DNS Management Scripts

### `dns-setup.sh`
Sets up DNS records for custom domain hosting on GitHub Pages.

### `gandi_dns.py`
Python script for managing Gandi DNS records programmatically.

### DNS Setup Instructions

#### 1. Get your Gandi Personal Access Token (PAT)

1. Log in to https://admin.gandi.net
2. Go to User Settings → Security → Personal Access Tokens
3. Create a new token with permissions:
   - "See and renew domain names"
   - "Manage domain name technical configurations"
4. Copy the token (shown only once!)

#### 2. Set environment variable

```bash
export GANDI_PAT='your-token-here'

# Or add to your .bashrc/.zshrc for persistence
echo "export GANDI_PAT='your-token-here'" >> ~/.bashrc
```

#### 3. Install dependencies

```bash
pip install requests
```

#### Quick setup for single domain

```bash
cd scripts
chmod +x dns-setup.sh

# Setup dark2048.com for GitHub Pages
./dns-setup.sh setup dark2048.com

# Verify DNS propagation
./dns-setup.sh verify dark2048.com
```

## HTTPS/SSL Scripts

### `check-cloudflare.sh`
Checks if the domain has moved to Cloudflare nameservers and if HTTPS is working.

### `cloudflare-setup.py`
Interactive Python script that helps with Cloudflare setup and checks DNS status.

### `monitor-dns.sh`
Monitors DNS propagation in real-time, checking every 30 seconds until Cloudflare is active.

### `setup-cloudflare.sh`
Step-by-step guide for setting up Cloudflare as an HTTPS proxy.

## Git Hooks

The project includes a pre-push hook that automatically runs tests before pushing to prevent syntax errors from being deployed. The hook is installed at `.git/hooks/pre-push`.

## Continuous Integration

GitHub Actions also runs these tests on every push to ensure code quality before deployment.