# Analytics and Error Tracking Setup

This game includes optional Google Analytics and Sentry error tracking. Both are privacy-friendly and respect user preferences.

## Google Analytics Setup

1. Create a Google Analytics 4 property at https://analytics.google.com
2. Get your Measurement ID (looks like `G-XXXXXXXXXX`)
3. Replace `G-PLACEHOLDER_ID` in `index.html` with your Measurement ID

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
3. Replace `https://YOUR_SENTRY_DSN@sentry.io/YOUR_PROJECT_ID` in `index.html`

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