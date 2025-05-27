# 2048 Dark

A minimalist 2048 game with dark theme and PWA support.

## Development

To run a local development server, you have several options:

### Option 1: Using npm (no install needed)
```bash
npm run dev
```
This uses npx to run http-server without installing dependencies.

### Option 2: Using Python (if you have Python 3)
```bash
npm run serve
# or directly:
python3 -m http.server 8080
```

### Option 3: Using Python 2
```bash
python -m SimpleHTTPServer 8080
```

### Option 4: Using VS Code Live Server
If you're using VS Code, install the "Live Server" extension and right-click on `index.html` to select "Open with Live Server".

The game will be available at http://localhost:8080

## Features

- Dark theme with multiple levels
- Touch/swipe controls
- PWA support for offline play
- Game state persistence
- Analytics tracking
- Customizable settings
- Battery level warning

## Deployment

The game is deployed to GitHub Pages at: https://alexandrosm.github.io/2048-dark/