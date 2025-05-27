class Game2048 {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.size = 4;
        this.darkMode = parseInt(localStorage.getItem('2048-darkmode') || '0');
        this.tiles = new Map();
        this.tileId = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragThreshold = 50;
        this.dragMultiplier = parseFloat(localStorage.getItem('2048-multiplier') || '3.5');
        this.previewPositions = new Map();
        this.history = [];
        this.lastExecutedDirection = null;
        this.moveInProgress = false;
        this.continuousDrag = false;
        this.waitingForNewDirection = false;
        this.highScore = this.loadHighScore();
        this.undoCount = 0;
        this.lastMoveTime = 0;
        this.cellSize = 70; // Default value
        this.gapSize = 12; // Default value
        this.init();
    }

    init() {
        // Apply saved dark mode
        document.body.className = this.darkMode === 3 ? 'bright-mode' : `dark-level-${this.darkMode}`;
        
        this.setupResponsiveSizing();
        this.setupGrid();
        this.setupEventListeners();
        this.setupBatteryMonitoring();
        
        // Check if launched from shortcut to start new game
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('new') === 'true') {
            this.startNewGame();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Try to load saved game state, otherwise start new game
            if (!this.loadGameState()) {
                this.startNewGame();
            }
        }
    }
    
    setupResponsiveSizing() {
        const updateSizes = () => {
            const vw = Math.min(window.innerWidth, window.innerHeight);
            const maxBoardSize = Math.min(vw * 0.9, 500); // 90% of viewport, max 500px
            const cellCount = 4;
            const gapRatio = 0.15; // gap is 15% of cell size
            
            // Calculate cell size accounting for gaps
            const totalGapRatio = gapRatio * (cellCount - 1);
            const cellSize = Math.floor(maxBoardSize / (cellCount + totalGapRatio));
            const gapSize = Math.floor(cellSize * gapRatio);
            
            // Calculate font sizes
            const fontSize = Math.floor(cellSize * 0.45);
            const fontSizeSmall = Math.floor(cellSize * 0.4);
            const fontSizeTiny = Math.floor(cellSize * 0.35);
            
            // Set CSS variables
            document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
            document.documentElement.style.setProperty('--gap-size', `${gapSize}px`);
            document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
            document.documentElement.style.setProperty('--font-size-small', `${fontSizeSmall}px`);
            document.documentElement.style.setProperty('--font-size-tiny', `${fontSizeTiny}px`);
            
            // Store for easy access
            this.cellSize = cellSize;
            this.gapSize = gapSize;
            
            // Update tile positions if game is already running
            if (this.tiles.size > 0) {
                this.updateAllTilePositions();
            }
        };
        
        updateSizes();
        window.addEventListener('resize', updateSizes);
        
        // Also update on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(updateSizes, 100);
        });
    }
    
    getTileOffset(position) {
        return position * (this.cellSize + this.gapSize);
    }
    
    updateAllTilePositions() {
        this.tiles.forEach(tile => {
            tile.element.style.transition = 'none';
            tile.element.style.left = `${this.getTileOffset(tile.col)}px`;
            tile.element.style.top = `${this.getTileOffset(tile.row)}px`;
        });
    }

    setupGrid() {
        const gameGrid = document.querySelector('.game-grid');
        gameGrid.innerHTML = '';
        
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            gameGrid.appendChild(cell);
        }
    }
    
    setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                // Initial battery check
                this.updateBatteryBackground(battery.level);
                
                // Monitor battery level changes
                battery.addEventListener('levelchange', () => {
                    this.updateBatteryBackground(battery.level);
                });
                
                // Also update when charging status changes
                battery.addEventListener('chargingchange', () => {
                    this.updateBatteryBackground(battery.level);
                });
            }).catch(err => {
                // Battery API not available
            });
        }
    }
    
    updateBatteryBackground(level) {
        // Only apply red background if battery is below 10% (0.1)
        if (level <= 0.1) {
            // Calculate red intensity: 0% at 10% battery, 100% at 1% battery
            const redIntensity = 1 - (level / 0.1);
            
            // Create a red overlay div if it doesn't exist
            let batteryOverlay = document.getElementById('battery-warning-overlay');
            if (!batteryOverlay) {
                batteryOverlay = document.createElement('div');
                batteryOverlay.id = 'battery-warning-overlay';
                batteryOverlay.style.position = 'fixed';
                batteryOverlay.style.top = '0';
                batteryOverlay.style.left = '0';
                batteryOverlay.style.width = '100%';
                batteryOverlay.style.height = '100%';
                batteryOverlay.style.pointerEvents = 'none';
                batteryOverlay.style.zIndex = '9999';
                batteryOverlay.style.transition = 'background-color 0.5s ease';
                document.body.appendChild(batteryOverlay);
            }
            
            // Set the red background with appropriate opacity
            const opacity = redIntensity * 0.5; // Max 50% opacity to keep game visible
            batteryOverlay.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
        } else {
            // Remove the overlay if battery is above 10%
            const batteryOverlay = document.getElementById('battery-warning-overlay');
            if (batteryOverlay) {
                batteryOverlay.remove();
            }
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.querySelector('.new-game').addEventListener('click', () => {
            this.startNewGame();
        });

        document.querySelector('.dark-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        document.querySelector('.undo').addEventListener('click', () => {
            this.undo();
        });
        
        document.querySelector('.settings').addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
        
        document.querySelector('.fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        document.querySelector('.new-game-overlay').addEventListener('click', () => {
            this.hideGameOver();
            this.startNewGame();
        });

        // Touch event handling with real-time preview on whole screen
        
        // Double tap detection
        let lastTapTime = 0;
        const doubleTapThreshold = 300; // milliseconds
        
        // Two-finger swipe detection for menu toggle
        let twoFingerStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            // Check for two-finger touch
            if (e.touches.length === 2) {
                this.isDragging = false; // Disable tile dragging
                twoFingerStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                return;
            }
            
            // Only allow single finger drag
            if (e.touches.length !== 1) {
                this.isDragging = false;
                return;
            }
            
            // Don't prevent default if touching a button
            const target = e.target;
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                return;
            }
            
            e.preventDefault();
            
            // Check for double tap
            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - lastTapTime;
            
            if (timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 50) {
                // Double tap detected
                this.undo();
                lastTapTime = 0; // Reset to prevent triple tap
                return;
            }
            
            lastTapTime = currentTime;
            
            this.isDragging = true;
            this.dragStartX = e.touches[0].clientX;
            this.dragStartY = e.touches[0].clientY;
            this.saveInitialPositions();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            // Handle two-finger swipe
            if (e.touches.length === 2) {
                // If we were dragging, reset tile positions
                if (this.isDragging) {
                    this.isDragging = false;
                    this.resetToInitialPositions();
                }
                
                const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const deltaY = currentY - twoFingerStartY;
                
                if (Math.abs(deltaY) > 50) { // Threshold for swipe
                    if (deltaY > 0) {
                        // Swipe down - hide menu
                        this.toggleMenu(false);
                    } else {
                        // Swipe up - show menu
                        this.toggleMenu(true);
                    }
                    twoFingerStartY = currentY; // Reset for continuous swipes
                }
                return;
            }
            
            // Stop dragging if more than one finger
            if (e.touches.length !== 1) {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.resetToInitialPositions();
                }
                return;
            }
            
            // Only prevent default if we're actively dragging the game
            if (this.isDragging) {
                e.preventDefault();
            }
            if (!this.isDragging || this.moveInProgress) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const dx = (currentX - this.dragStartX) * this.dragMultiplier;
            const dy = (currentY - this.dragStartY) * this.dragMultiplier;
            
            // Check if we're waiting for direction change
            if (this.waitingForNewDirection) {
                // Calculate movement from last executed position
                const moveThreshold = 30; // Pixels needed to register as new direction
                const actualMovement = Math.sqrt(
                    Math.pow(currentX - this.dragStartX, 2) + 
                    Math.pow(currentY - this.dragStartY, 2)
                );
                
                if (actualMovement < moveThreshold) {
                    return; // Not enough movement to start a new gesture
                }
                
                // Determine if direction has changed significantly
                let newDirection = null;
                if (Math.abs(dx) > Math.abs(dy)) {
                    newDirection = dx > 0 ? 'right' : 'left';
                } else {
                    newDirection = dy > 0 ? 'down' : 'up';
                }
                
                if (newDirection !== this.lastExecutedDirection) {
                    this.waitingForNewDirection = false;
                    this.lastExecutedDirection = null;
                }
            }
            
            // Determine dominant direction
            let direction = null;
            let distance = 0;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 10) {
                    direction = dx > 0 ? 'right' : 'left';
                    distance = Math.abs(dx);
                }
            } else {
                if (Math.abs(dy) > 10) {
                    direction = dy > 0 ? 'down' : 'up';
                    distance = Math.abs(dy);
                }
            }
            
            if (direction && !this.waitingForNewDirection) {
                const moveRatio = this.previewMove(direction, distance);
                
                // If tiles have moved 90% of the way (moveRatio >= 0.9), execute the move
                if (moveRatio >= 0.9 && direction !== this.lastExecutedDirection) {
                    this.executeMove(direction, currentX, currentY);
                    this.continuousDrag = true;
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            this.lastExecutedDirection = null;
            this.waitingForNewDirection = false;
            
            // Always reset tiles if we have preview positions and no move is in progress
            if (this.previewPositions.size > 0 && !this.moveInProgress) {
                this.resetToInitialPositions();
            }
            
            // If we haven't executed any moves during continuous drag
            if (!this.continuousDrag && !this.moveInProgress) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const dx = endX - this.dragStartX;
                const dy = endY - this.dragStartY;
                
                // Check if drag exceeded threshold
                if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
                    let direction;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        direction = dx > 0 ? 'right' : 'left';
                    } else {
                        direction = dy > 0 ? 'down' : 'up';
                    }
                    
                    // Reset to initial positions first
                    this.resetToInitialPositions();
                    
                    // Then perform the actual move
                    this.move(direction);
                } else {
                    // Reset to initial positions if threshold not met
                    this.resetToInitialPositions();
                }
            }
            
            this.continuousDrag = false;
        }, { passive: false });

        // Mouse events for testing on desktop
        let mouseDown = false;
        document.addEventListener('mousedown', (e) => {
            mouseDown = true;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.saveInitialPositions();
        });

        document.addEventListener('mousemove', (e) => {
            if (!mouseDown || !this.isDragging || this.moveInProgress) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            const dx = (currentX - this.dragStartX) * this.dragMultiplier;
            const dy = (currentY - this.dragStartY) * this.dragMultiplier;
            
            // Check if we're waiting for direction change
            if (this.waitingForNewDirection) {
                // Calculate movement from last executed position
                const moveThreshold = 30; // Pixels needed to register as new direction
                const actualMovement = Math.sqrt(
                    Math.pow(currentX - this.dragStartX, 2) + 
                    Math.pow(currentY - this.dragStartY, 2)
                );
                
                if (actualMovement < moveThreshold) {
                    return; // Not enough movement to start a new gesture
                }
                
                // Determine if direction has changed significantly
                let newDirection = null;
                if (Math.abs(dx) > Math.abs(dy)) {
                    newDirection = dx > 0 ? 'right' : 'left';
                } else {
                    newDirection = dy > 0 ? 'down' : 'up';
                }
                
                if (newDirection !== this.lastExecutedDirection) {
                    this.waitingForNewDirection = false;
                    this.lastExecutedDirection = null;
                }
            }
            
            let direction = null;
            let distance = 0;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > 10) {
                    direction = dx > 0 ? 'right' : 'left';
                    distance = Math.abs(dx);
                }
            } else {
                if (Math.abs(dy) > 10) {
                    direction = dy > 0 ? 'down' : 'up';
                    distance = Math.abs(dy);
                }
            }
            
            if (direction && !this.waitingForNewDirection) {
                const moveRatio = this.previewMove(direction, distance);
                
                // If tiles have moved 90% of the way (moveRatio >= 0.9), execute the move
                if (moveRatio >= 0.9 && direction !== this.lastExecutedDirection) {
                    this.executeMove(direction, currentX, currentY);
                    this.continuousDrag = true;
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!mouseDown) return;
            mouseDown = false;
            this.isDragging = false;
            this.lastExecutedDirection = null;
            this.waitingForNewDirection = false;
            
            // If we haven't executed any moves during continuous drag
            if (!this.continuousDrag) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;
                
                if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
                    let direction;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        direction = dx > 0 ? 'right' : 'left';
                    } else {
                        direction = dy > 0 ? 'down' : 'up';
                    }
                    
                    this.resetToInitialPositions();
                    this.move(direction);
                } else {
                    this.resetToInitialPositions();
                }
            }
            
            this.continuousDrag = false;
        });
    }

    saveInitialPositions() {
        this.previewPositions.clear();
        this.tiles.forEach((tile, id) => {
            this.previewPositions.set(id, {
                row: tile.row,
                col: tile.col,
                left: parseFloat(tile.element.style.left),
                top: parseFloat(tile.element.style.top)
            });
        });
    }

    resetToInitialPositions() {
        this.tiles.forEach((tile, id) => {
            const initial = this.previewPositions.get(id);
            if (initial) {
                tile.element.style.transition = 'left 0.1s ease, top 0.1s ease';
                tile.element.style.left = `${initial.left}px`;
                tile.element.style.top = `${initial.top}px`;
            }
        });
    }
    
    executeMove(direction, currentX, currentY) {
        this.lastExecutedDirection = direction;
        this.waitingForNewDirection = true;
        
        // Don't reset positions - move directly from current preview position
        this.move(direction);
        
        // After move completes, reset for next potential move
        if (this.isDragging && currentX !== undefined && currentY !== undefined) {
            const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '150');
            setTimeout(() => {
                // Update drag start position for continuous dragging
                this.dragStartX = currentX;
                this.dragStartY = currentY;
                this.saveInitialPositions();
            }, animationSpeed); // Wait for move animation to complete
        }
    }

    previewMove(direction, distance) {
        const maxDistance = this.getTileOffset(3); // Maximum movement is 3 tiles
        const moveRatio = Math.min(distance / maxDistance, 1);
        
        this.tiles.forEach((tile, id) => {
            const initial = this.previewPositions.get(id);
            if (!initial) return;
            
            // Calculate where this tile would end up
            const finalPos = this.calculateFinalPosition(tile, direction);
            
            // Interpolate between initial and final position
            let newLeft = initial.left;
            let newTop = initial.top;
            
            if (direction === 'left' || direction === 'right') {
                const deltaX = this.getTileOffset(finalPos.col) - initial.left;
                newLeft = initial.left + (deltaX * moveRatio);
            } else {
                const deltaY = this.getTileOffset(finalPos.row) - initial.top;
                newTop = initial.top + (deltaY * moveRatio);
            }
            
            tile.element.style.transition = 'none';
            tile.element.style.left = `${newLeft}px`;
            tile.element.style.top = `${newTop}px`;
        });
        
        return moveRatio;
    }

    calculateFinalPosition(tile, direction) {
        // Calculate the actual final position for each tile considering merges
        const tempGrid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        const tilesToMove = [];
        
        // Populate temp grid with tile references
        this.tiles.forEach(t => {
            tempGrid[t.row][t.col] = { ...t };
            tilesToMove.push({ ...t });
        });
        
        // Simulate the move to find final positions
        switch(direction) {
            case 'left':
                for (let row = 0; row < this.size; row++) {
                    const rowTiles = tilesToMove.filter(t => t.row === row).sort((a, b) => a.col - b.col);
                    let finalCol = 0;
                    
                    for (let i = 0; i < rowTiles.length; i++) {
                        const currentTile = rowTiles[i];
                        
                        if (currentTile.id === tile.id) {
                            // Found our tile - return its final position
                            return { row: row, col: finalCol };
                        }
                        
                        // Check if this tile will merge with the next one
                        if (i < rowTiles.length - 1 && rowTiles[i].value === rowTiles[i + 1].value) {
                            // Check if the next tile is our target
                            if (rowTiles[i + 1].id === tile.id) {
                                // The next tile (our target) will merge into this position
                                return { row: row, col: finalCol };
                            }
                            // Skip the next tile since it merges with this one
                            i++;
                        }
                        
                        finalCol++;
                    }
                }
                break;
                
            case 'right':
                for (let row = 0; row < this.size; row++) {
                    const rowTiles = tilesToMove.filter(t => t.row === row).sort((a, b) => b.col - a.col);
                    let finalCol = this.size - 1;
                    
                    for (let i = 0; i < rowTiles.length; i++) {
                        const currentTile = rowTiles[i];
                        
                        if (currentTile.id === tile.id) {
                            // Found our tile - return its final position
                            return { row: row, col: finalCol };
                        }
                        
                        // Check if this tile will merge with the next one
                        if (i < rowTiles.length - 1 && rowTiles[i].value === rowTiles[i + 1].value) {
                            // Check if the next tile is our target
                            if (rowTiles[i + 1].id === tile.id) {
                                // The next tile (our target) will merge into this position
                                return { row: row, col: finalCol };
                            }
                            // Skip the next tile since it merges with this one
                            i++;
                        }
                        
                        finalCol--;
                    }
                }
                break;
                
            case 'up':
                for (let col = 0; col < this.size; col++) {
                    const colTiles = tilesToMove.filter(t => t.col === col).sort((a, b) => a.row - b.row);
                    let finalRow = 0;
                    
                    for (let i = 0; i < colTiles.length; i++) {
                        const currentTile = colTiles[i];
                        
                        if (currentTile.id === tile.id) {
                            // Found our tile - return its final position
                            return { row: finalRow, col: col };
                        }
                        
                        // Check if this tile will merge with the next one
                        if (i < colTiles.length - 1 && colTiles[i].value === colTiles[i + 1].value) {
                            // Check if the next tile is our target
                            if (colTiles[i + 1].id === tile.id) {
                                // The next tile (our target) will merge into this position
                                return { row: finalRow, col: col };
                            }
                            // Skip the next tile since it merges with this one
                            i++;
                        }
                        
                        finalRow++;
                    }
                }
                break;
                
            case 'down':
                for (let col = 0; col < this.size; col++) {
                    const colTiles = tilesToMove.filter(t => t.col === col).sort((a, b) => b.row - a.row);
                    let finalRow = this.size - 1;
                    
                    for (let i = 0; i < colTiles.length; i++) {
                        const currentTile = colTiles[i];
                        
                        if (currentTile.id === tile.id) {
                            // Found our tile - return its final position
                            return { row: finalRow, col: col };
                        }
                        
                        // Check if this tile will merge with the next one
                        if (i < colTiles.length - 1 && colTiles[i].value === colTiles[i + 1].value) {
                            // Check if the next tile is our target
                            if (colTiles[i + 1].id === tile.id) {
                                // The next tile (our target) will merge into this position
                                return { row: finalRow, col: col };
                            }
                            // Skip the next tile since it merges with this one
                            i++;
                        }
                        
                        finalRow--;
                    }
                }
                break;
        }
        
        // Fallback to current position
        return { row: tile.row, col: tile.col };
    }

    startNewGame() {
        // Save the previous game if it had a score
        if (this.score > 0) {
            this.saveCompletedGame();
        }
        
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.tiles.forEach(tile => tile.element.remove());
        this.tiles.clear();
        this.tileId = 0;
        this.history = [];
        this.undoCount = 0;
        this.updateScore();
        this.addNewTile();
        this.addNewTile();
        
        // Clear saved state
        localStorage.removeItem('2048-gamestate');
    }

    createTileElement(value, row, col) {
        const gameGrid = document.querySelector('.game-grid');
        const tile = document.createElement('div');
        tile.classList.add('tile', `tile-${value}`);
        tile.textContent = value;
        tile.style.left = `${this.getTileOffset(col)}px`;
        tile.style.top = `${this.getTileOffset(row)}px`;
        tile.dataset.row = row;
        tile.dataset.col = col;
        gameGrid.appendChild(tile);
        return tile;
    }

    addNewTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({row, col});
                }
            }
        }

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            
            // Check settings
            const startWithOnes = localStorage.getItem('2048-start-with-ones') === 'true';
            const luckyEights = localStorage.getItem('2048-lucky-eights') === 'true';
            
            let value;
            const rand = Math.random();
            
            // 1% chance for 8 if lucky eights is enabled
            if (luckyEights && rand < 0.01) {
                value = 8;
            } else if (rand < 0.9) {
                // 90% chance for base value (1 or 2)
                value = startWithOnes ? 1 : 2;
            } else {
                // 10% (or 9% with lucky eights) chance for double value
                value = startWithOnes ? 2 : 4;
            }
            
            this.grid[randomCell.row][randomCell.col] = value;
            
            const tileElement = this.createTileElement(value, randomCell.row, randomCell.col);
            const id = this.tileId++;
            this.tiles.set(id, {
                id,
                value,
                row: randomCell.row,
                col: randomCell.col,
                element: tileElement,
                merged: false
            });
        }
    }

    handleKeyPress(e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const direction = e.key.replace('Arrow', '').toLowerCase();
            this.move(direction);
        }
    }

    move(direction) {
        // Prevent multiple simultaneous moves
        if (this.moveInProgress) return;
        
        // Check move cooldown
        const cooldown = parseInt(localStorage.getItem('2048-move-cooldown') || '50');
        if (cooldown > 0) {
            const now = Date.now();
            const timeSinceLastMove = now - this.lastMoveTime;
            if (timeSinceLastMove < cooldown) {
                return; // Too soon to make another move
            }
            this.lastMoveTime = now;
        }
        
        this.moveInProgress = true;
        const previousGrid = JSON.stringify(this.grid);
        const movements = [];
        
        // Clear any preview positions since we're doing an actual move
        this.previewPositions.clear();
        
        // Save state before move
        this.saveState();
        
        // Reset merged state for all tiles
        this.tiles.forEach(tile => tile.merged = false);
        
        switch(direction) {
            case 'left':
                movements.push(...this.moveLeft());
                break;
            case 'right':
                movements.push(...this.moveRight());
                break;
            case 'up':
                movements.push(...this.moveUp());
                break;
            case 'down':
                movements.push(...this.moveDown());
                break;
        }

        if (JSON.stringify(this.grid) !== previousGrid) {
            this.animateMovements(movements);
            
            const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '150');
            setTimeout(() => {
                this.cleanupMergedTiles();
                this.addNewTile();
                this.saveGameState();
                this.moveInProgress = false;
                
                if (this.isGameOver()) {
                    setTimeout(() => {
                        this.showGameOver();
                    }, 300);
                }
            }, animationSpeed);
        } else {
            // No valid move - just remove from history
            this.history.pop();
            this.moveInProgress = false;
        }
    }

    animateMovements(movements) {
        const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '150');
        const animationSeconds = animationSpeed / 1000;
        
        movements.forEach(({tile, newRow, newCol, merged, mergedWith}) => {
            tile.row = newRow;
            tile.col = newCol;
            
            // Ensure smooth transition even if tile is already at preview position
            const currentLeft = parseFloat(tile.element.style.left);
            const currentTop = parseFloat(tile.element.style.top);
            const targetLeft = this.getTileOffset(newCol);
            const targetTop = this.getTileOffset(newRow);
            
            // Only animate if there's actual movement needed
            if (Math.abs(currentLeft - targetLeft) > 0.1 || Math.abs(currentTop - targetTop) > 0.1) {
                tile.element.style.transition = `left ${animationSeconds}s ease, top ${animationSeconds}s ease`;
            } else {
                tile.element.style.transition = 'none';
            }
            
            tile.element.style.left = `${targetLeft}px`;
            tile.element.style.top = `${targetTop}px`;
            
            if (merged && mergedWith) {
                setTimeout(() => {
                    tile.value *= 2;
                    tile.element.textContent = tile.value;
                    tile.element.className = `tile tile-${tile.value}`;
                    mergedWith.element.remove();
                    this.tiles.delete(mergedWith.id);
                }, animationSpeed);
            }
        });
    }

    cleanupMergedTiles() {
        this.tiles.forEach(tile => {
            tile.merged = false;
        });
    }

    moveLeft() {
        const movements = [];
        
        for (let row = 0; row < this.size; row++) {
            const rowTiles = [];
            this.tiles.forEach(tile => {
                if (tile.row === row) {
                    rowTiles.push(tile);
                }
            });
            rowTiles.sort((a, b) => a.col - b.col);
            
            let newCol = 0;
            for (let i = 0; i < rowTiles.length; i++) {
                const tile = rowTiles[i];
                
                if (i < rowTiles.length - 1 && 
                    rowTiles[i].value === rowTiles[i + 1].value && 
                    !rowTiles[i].merged && 
                    !rowTiles[i + 1].merged) {
                    
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: true,
                        mergedWith: rowTiles[i + 1]
                    });
                    
                    movements.push({
                        tile: rowTiles[i + 1],
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                    
                    this.score += tile.value * 2;
                    tile.merged = true;
                    rowTiles[i + 1].merged = true;
                    i++;
                } else {
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                }
                newCol++;
            }
            
            const newRowArray = Array(this.size).fill(0);
            rowTiles.forEach((tile, index) => {
                if (index < newCol) {
                    newRowArray[index] = tile.merged ? tile.value * 2 : tile.value;
                }
            });
            this.grid[row] = newRowArray;
        }
        
        this.updateScore();
        return movements;
    }

    moveRight() {
        const movements = [];
        
        for (let row = 0; row < this.size; row++) {
            const rowTiles = [];
            this.tiles.forEach(tile => {
                if (tile.row === row) {
                    rowTiles.push(tile);
                }
            });
            rowTiles.sort((a, b) => b.col - a.col);
            
            let newCol = this.size - 1;
            for (let i = 0; i < rowTiles.length; i++) {
                const tile = rowTiles[i];
                
                if (i < rowTiles.length - 1 && 
                    rowTiles[i].value === rowTiles[i + 1].value && 
                    !rowTiles[i].merged && 
                    !rowTiles[i + 1].merged) {
                    
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: true,
                        mergedWith: rowTiles[i + 1]
                    });
                    
                    movements.push({
                        tile: rowTiles[i + 1],
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                    
                    this.score += tile.value * 2;
                    tile.merged = true;
                    rowTiles[i + 1].merged = true;
                    i++;
                } else {
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                }
                newCol--;
            }
            
            const newRowArray = Array(this.size).fill(0);
            let colIndex = this.size - 1;
            rowTiles.forEach((tile, index) => {
                if (index < this.size - newCol) {
                    newRowArray[colIndex] = tile.merged ? tile.value * 2 : tile.value;
                    colIndex--;
                }
            });
            this.grid[row] = newRowArray;
        }
        
        this.updateScore();
        return movements;
    }

    moveUp() {
        const movements = [];
        
        for (let col = 0; col < this.size; col++) {
            const colTiles = [];
            this.tiles.forEach(tile => {
                if (tile.col === col) {
                    colTiles.push(tile);
                }
            });
            colTiles.sort((a, b) => a.row - b.row);
            
            let newRow = 0;
            for (let i = 0; i < colTiles.length; i++) {
                const tile = colTiles[i];
                
                if (i < colTiles.length - 1 && 
                    colTiles[i].value === colTiles[i + 1].value && 
                    !colTiles[i].merged && 
                    !colTiles[i + 1].merged) {
                    
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: true,
                        mergedWith: colTiles[i + 1]
                    });
                    
                    movements.push({
                        tile: colTiles[i + 1],
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                    
                    this.score += tile.value * 2;
                    tile.merged = true;
                    colTiles[i + 1].merged = true;
                    i++;
                } else {
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                }
                newRow++;
            }
            
            for (let row = 0; row < this.size; row++) {
                this.grid[row][col] = row < newRow ? 
                    (colTiles[row] && colTiles[row].merged ? colTiles[row].value * 2 : (colTiles[row] ? colTiles[row].value : 0)) : 
                    0;
            }
        }
        
        this.updateScore();
        return movements;
    }

    moveDown() {
        const movements = [];
        
        for (let col = 0; col < this.size; col++) {
            const colTiles = [];
            this.tiles.forEach(tile => {
                if (tile.col === col) {
                    colTiles.push(tile);
                }
            });
            colTiles.sort((a, b) => b.row - a.row);
            
            let newRow = this.size - 1;
            for (let i = 0; i < colTiles.length; i++) {
                const tile = colTiles[i];
                
                if (i < colTiles.length - 1 && 
                    colTiles[i].value === colTiles[i + 1].value && 
                    !colTiles[i].merged && 
                    !colTiles[i + 1].merged) {
                    
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: true,
                        mergedWith: colTiles[i + 1]
                    });
                    
                    movements.push({
                        tile: colTiles[i + 1],
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                    
                    this.score += tile.value * 2;
                    tile.merged = true;
                    colTiles[i + 1].merged = true;
                    i++;
                } else {
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                }
                newRow--;
            }
            
            let rowIndex = this.size - 1;
            for (let row = this.size - 1; row >= 0; row--) {
                this.grid[row][col] = rowIndex > newRow ? 
                    (colTiles[this.size - 1 - rowIndex] && colTiles[this.size - 1 - rowIndex].merged ? 
                        colTiles[this.size - 1 - rowIndex].value * 2 : 
                        (colTiles[this.size - 1 - rowIndex] ? colTiles[this.size - 1 - rowIndex].value : 0)) : 
                    0;
                rowIndex--;
            }
        }
        
        this.updateScore();
        return movements;
    }

    isGameOver() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) return false;
                
                if (col < this.size - 1 && this.grid[row][col] === this.grid[row][col + 1]) return false;
                if (row < this.size - 1 && this.grid[row][col] === this.grid[row + 1][col]) return false;
            }
        }
        return true;
    }

    updateScore() {
        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        // Calculate percentage of high score
        const percentage = this.highScore > 0 ? Math.round((this.score / this.highScore) * 100) : 0;
        
        // Display score / percentage format (omit percentage when at 100%)
        if (percentage === 100) {
            document.querySelector('.score').textContent = `${this.score}`;
        } else {
            document.querySelector('.score').textContent = `${this.score} / ${percentage}%`;
        }
    }

    toggleDarkMode() {
        this.darkMode = (this.darkMode + 1) % 4;
        document.body.className = this.darkMode === 3 ? 'bright-mode' : `dark-level-${this.darkMode}`;
        localStorage.setItem('2048-darkmode', this.darkMode.toString());
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    
    toggleMenu(show) {
        const header = document.querySelector('.header');
        const controls = document.querySelector('.controls');
        
        if (show) {
            header.classList.remove('hidden');
            controls.classList.remove('hidden');
        } else {
            header.classList.add('hidden');
            controls.classList.add('hidden');
        }
    }
    
    showGameOver() {
        const overlay = document.querySelector('.game-over-overlay');
        const finalScore = document.querySelector('.final-score');
        
        finalScore.textContent = `Final Score: ${this.score}`;
        overlay.classList.add('show');
        
        // Save the completed game
        this.saveCompletedGame();
    }
    
    hideGameOver() {
        const overlay = document.querySelector('.game-over-overlay');
        overlay.classList.remove('show');
    }
    
    loadHighScore() {
        const saved = localStorage.getItem('2048-highscore');
        return saved ? parseInt(saved) : 0;
    }
    
    saveHighScore() {
        localStorage.setItem('2048-highscore', this.highScore.toString());
    }
    
    saveGameState() {
        const gameState = {
            grid: this.grid,
            score: this.score,
            tiles: Array.from(this.tiles.values()).map(tile => ({
                id: tile.id,
                value: tile.value,
                row: tile.row,
                col: tile.col
            })),
            tileId: this.tileId,
            history: this.history,
            undoCount: this.undoCount
        };
        localStorage.setItem('2048-gamestate', JSON.stringify(gameState));
    }
    
    loadGameState() {
        const saved = localStorage.getItem('2048-gamestate');
        if (!saved) return false;
        
        try {
            const gameState = JSON.parse(saved);
            this.grid = gameState.grid;
            this.score = gameState.score;
            this.tileId = gameState.tileId;
            this.history = gameState.history || [];
            this.undoCount = gameState.undoCount || 0;
            
            // Clear existing tiles
            this.tiles.forEach(tile => tile.element.remove());
            this.tiles.clear();
            
            // Recreate tiles
            gameState.tiles.forEach(tileData => {
                const tileElement = this.createTileElement(tileData.value, tileData.row, tileData.col);
                this.tiles.set(tileData.id, {
                    id: tileData.id,
                    value: tileData.value,
                    row: tileData.row,
                    col: tileData.col,
                    element: tileElement,
                    merged: false
                });
            });
            
            this.updateScore();
            return true;
        } catch (e) {
            // Failed to load game state
            return false;
        }
    }
    
    saveCompletedGame() {
        const games = this.loadGameHistory();
        games.push({
            score: this.score,
            timestamp: new Date().toISOString(),
            moves: this.history.length,
            undos: this.undoCount
        });
        localStorage.setItem('2048-games', JSON.stringify(games));
    }
    
    loadGameHistory() {
        const saved = localStorage.getItem('2048-games');
        return saved ? JSON.parse(saved) : [];
    }


    saveState() {
        const state = {
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score,
            tiles: []
        };
        
        // Save tile positions and values
        this.tiles.forEach(tile => {
            state.tiles.push({
                id: tile.id,
                value: tile.value,
                row: tile.row,
                col: tile.col
            });
        });
        
        this.history.push(state);
    }

    undo() {
        if (this.history.length === 0) return;
        
        this.undoCount++;
        const state = this.history.pop();
        this.grid = state.grid;
        this.score = state.score;
        
        // Clear existing tiles
        this.tiles.forEach(tile => tile.element.remove());
        this.tiles.clear();
        
        // Recreate tiles from saved state
        state.tiles.forEach(tileData => {
            const tileElement = this.createTileElement(tileData.value, tileData.row, tileData.col);
            this.tiles.set(tileData.id, {
                id: tileData.id,
                value: tileData.value,
                row: tileData.row,
                col: tileData.col,
                element: tileElement,
                merged: false
            });
        });
        
        this.updateScore();
        
        // Hide game over overlay if it's showing
        this.hideGameOver();
    }
}

const game = new Game2048();

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // ServiceWorker registration successful
            })
            .catch(err => {
                // ServiceWorker registration failed
            });
    });
}

