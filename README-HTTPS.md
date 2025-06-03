# HTTPS Setup for 2048 Dark

## Your site is already HTTPS-ready! 

All resources use relative URLs, so the game works with both HTTP and HTTPS.

## For Production (dark2048.com on GitHub Pages)

1. Go to your repository settings: https://github.com/alexandrosm/2048-dark/settings/pages
2. Under "Custom domain", ensure `dark2048.com` is set
3. Check the box for **"Enforce HTTPS"**
4. GitHub will automatically provision an SSL certificate (can take up to 24 hours)

## For Local Development with HTTPS

### Option 1: Use Vite (Recommended)
```bash
npm run dev -- --https
```

### Option 2: Use the provided HTTPS server
```bash
node serve-https.js
```
Then visit https://localhost:8443

### Option 3: Use mkcert for trusted local certificates
```bash
# Install mkcert (macOS/Linux)
brew install mkcert  # or your package manager

# Install mkcert (Windows)
choco install mkcert

# Create and install local CA
mkcert -install

# Create certificate for localhost
mkcert localhost 127.0.0.1 ::1

# Use with any local server
```

## Verify HTTPS is Working

Once enabled, your site will be accessible at:
- https://dark2048.com

You can verify HTTPS is working by:
1. Looking for the padlock icon in your browser
2. Checking that the URL starts with `https://`
3. Running: `curl -I https://dark2048.com`

## Common Issues

- **Certificate not yet issued**: GitHub can take up to 24 hours to provision the certificate
- **DNS not propagated**: Make sure your DNS records are correct and have propagated
- **Mixed content**: The game doesn't load any external resources, so this shouldn't be an issue