# Handling Secrets in GitHub Pages

This guide explains how to handle analytics credentials securely in this GitHub Pages project.

## The Challenge

GitHub Pages serves static files directly from your repository, making everything public. However, analytics IDs (GA4 and Sentry) are designed to be used client-side and have built-in protections.

## Our Approach: Gitignored Configuration

We use a `config.js` file that is:
1. **Not committed** to the repository (gitignored)
2. **Loaded optionally** by the site
3. **Falls back gracefully** if missing

## Setup Instructions

### 1. Create Your Configuration File

```bash
# Copy the template
cp config.js.template config.js

# Edit with your actual IDs
# config.js is already in .gitignore
```

### 2. Add Your Analytics IDs

Edit `config.js`:
```javascript
window.ANALYTICS_CONFIG = {
    GA4_ID: 'G-YOUR_ACTUAL_ID',      // Your GA4 Measurement ID
    SENTRY_DSN: 'https://...@sentry.io/...',  // Your Sentry DSN
    GA4_DEBUG_MODE: false,
    SENTRY_TRACE_RATE: 0.1
};
```

### 3. Deploy to GitHub Pages

When you push to GitHub:
- ✅ Your code is pushed
- ❌ `config.js` is NOT pushed (gitignored)
- ✅ The site works without analytics

### 4. For Production Analytics

Since GitHub Pages doesn't support server-side secrets, you have several options:

#### Option A: Use GitHub Actions (Recommended)
Create a GitHub Action that builds and deploys with secrets:

1. Add secrets to your repository:
   - Go to Settings → Secrets → Actions
   - Add `GA4_ID` and `SENTRY_DSN`

2. Use the provided `.github/workflows/deploy.yml` to inject secrets during build

#### Option B: Fork for Production
1. Fork the repository privately
2. Add `config.js` to the private fork
3. Deploy from the private fork

#### Option C: Client-Side Only (Current)
1. The site works without config.js
2. Users can add their own config.js locally
3. No analytics on the public site

## Security Considerations

### What's Safe to Expose

**Google Analytics GA4 ID:**
- ✅ Designed to be public
- ✅ Restricted by domain
- ✅ Can't access your GA data
- ⚠️ Can send fake data (but GA has bot filtering)

**Sentry DSN:**
- ✅ Designed to be public
- ✅ Only allows error submission
- ✅ Can't access your Sentry data
- ⚠️ Can send fake errors (but you can filter by domain)

### Best Practices

1. **Domain Restrictions**: Configure allowed domains in both GA4 and Sentry
2. **Rate Limiting**: Both services have built-in rate limits
3. **Filtering**: Set up filters to ignore spam/test data
4. **Monitoring**: Regularly check for unusual activity

## Alternative Approaches

### 1. Environment Variables (Not for GitHub Pages)
GitHub Pages doesn't support environment variables, but other hosts do:
- Netlify: Environment variables in dashboard
- Vercel: Environment variables in settings
- CloudFlare Pages: Environment variables support

### 2. Proxy Server
Run a simple proxy that adds the IDs server-side:
- Keeps IDs completely hidden
- Requires a backend service
- More complex setup

### 3. Build-Time Injection
Use a CI/CD pipeline to inject secrets during build:
- See `.github/workflows/deploy.yml` for an example
- Secrets never touch the repository

## For Contributors

When contributing:
1. Never commit `config.js`
2. Use `config.js.template` for examples
3. Test without analytics locally
4. The public demo won't have analytics

## Local Development

To test with analytics locally:
1. Create your own GA4 property and Sentry project
2. Copy `config.js.template` to `config.js`
3. Add your test IDs
4. Analytics will work in your local environment only