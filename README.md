# 2048 Dark

A minimalist 2048 game with dark theme and PWA support.

## Development

### Quick Start (with Vite - Recommended)
```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev
```

The game will be available at http://localhost:5173 with hot module reload enabled.

**Note for WSL users**: The Vite config includes special settings for WSL2 compatibility (polling-based file watching).

### Alternative Options

#### Simple HTTP Server (no hot reload)
```bash
npm run serve
```

#### Using Python
```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### VS Code Live Server
Install the "Live Server" extension and right-click on `index.html`

## Features

- Dark theme with multiple levels
- Touch/swipe controls
- PWA support for offline play
- Game state persistence
- Analytics tracking
- Customizable settings
- Battery level warning

## Deployment

The game is deployed at: https://dark2048.com

Also available at: https://alexandrosm.github.io/2048-dark/