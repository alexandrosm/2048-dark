# Analytics and Error Tracking Setup

This game includes optional Google Analytics and Sentry error tracking. Both are privacy-friendly and respect user preferences.

## Quick Setup

1. Copy `config.js.template` to `config.js`:
   ```bash
   cp config.js.template config.js
   ```

2. Edit `config.js` and replace the placeholder values with your actual IDs

3. The `config.js` file is automatically ignored by git to keep your keys private

**Note:** If you're deploying to GitHub Pages, you'll need to add `config.js` to your deployment manually, or use GitHub Secrets with a build process.

## Google Analytics Setup

1. Create a Google Analytics 4 property at https://analytics.google.com
2. Get your Measurement ID (looks like `G-XXXXXXXXXX`)
3. Add your Measurement ID to `config.js`

### What's tracked:
- Game starts
- Game completions with scores
- Game overs with scores
- Basic usage statistics

### Privacy features:
- Respects Do Not Track headers
- IP anonymization enabled
- No personal data collected
- Users can opt-out in settings

## Sentry Error Tracking Setup

1. Create a Sentry project at https://sentry.io
2. Get your DSN from Project Settings → Client Keys
3. Add your DSN to `config.js`

### What's tracked:
- JavaScript errors in game code
- Error context for debugging
- No personal information

### Privacy features:
- Users can opt-out in settings
- Only tracks errors from game files
- Doesn't run in development by default

## Testing

### Google Analytics
- Check the Realtime reports in GA4
- Use the DebugView for detailed testing

### Sentry
- Trigger a test error in console: `Sentry.captureException(new Error("Test error"))`
- Check your Sentry dashboard for the error

## Privacy Settings

Users can control both analytics and error tracking in the Settings page under "Privacy Settings".

## Development

To enable Sentry in development:
```javascript
localStorage.setItem('2048-sentry-dev', 'true');
```

Both services are automatically disabled if their IDs are not configured.

## Deployment Options

### Option 1: Manual Configuration (Simple)
1. Create `config.js` locally with your actual values
2. Deploy all files including `config.js` to your hosting service
3. Make sure not to commit `config.js` to your repository

### Option 2: GitHub Actions (Recommended for GitHub Pages)
1. Add your IDs as GitHub Secrets (Settings → Secrets → Actions):
   - `GA4_ID`: Your Google Analytics ID
   - `SENTRY_DSN`: Your Sentry DSN
2. Use a GitHub Action to create `config.js` during deployment:

```yaml
- name: Create config.js
  run: |
    cat > config.js << EOF
    window.ANALYTICS_CONFIG = {
        GA4_ID: '${{ secrets.GA4_ID }}',
        SENTRY_DSN: '${{ secrets.SENTRY_DSN }}'
    };
    EOF
```

### Option 3: Environment-based Configuration
For other hosting services (Netlify, Vercel, etc.), you can:
1. Set environment variables in your hosting dashboard
2. Use a build script to generate `config.js` from environment variables
3. Or use their respective secrets management features