class Game2048 {
    constructor() {
        // Track analytics event helper
        this.trackEvent = (action, category = 'game', label = null, value = null) => {
            if (typeof gtag !== 'undefined' && localStorage.getItem('2048-analytics-enabled') !== 'false') {
                console.log('GA4 Event:', action, category, label, value);
                gtag('event', action, {
                    event_category: category,
                    event_label: label,
                    value: value
                });
            } else {
                console.log('GA4 not available or disabled');
            }
        };
        
        // Track errors with Sentry
        this.trackError = (error, context = {}) => {
            console.error(error);
            if (typeof Sentry !== 'undefined' && localStorage.getItem('2048-error-tracking-enabled') !== 'false') {
                Sentry.captureException(error, {
                    extra: context
                });
            }
        };
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
        this.dragMultiplier = parseFloat(localStorage.getItem('2048-multiplier') || '6');
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
        this.undosUsedThisGame = 0; // Track undos used in current game
        this.lastUndoneDirection = null; // Track the direction of the last undone move
        this.zoomLevel = parseFloat(localStorage.getItem('2048-zoom') || '1'); // Zoom level
        this.pinchStartDistance = 0; // For pinch gesture tracking
        this.isPinching = false; // Track if we're in a pinch gesture
        this.isTwoFingerSwiping = false; // Track if we're in a two-finger swipe
        
        // Game history for debugging
        this.gameHistory = {
            gameId: this.generateGameId(),
            startTime: new Date().toISOString(),
            moves: [],
            tileSpawns: [],
            scoreChanges: [],
            stateSnapshots: [],
            events: [],
            errors: [],
            settings: this.captureCurrentSettings()
        };
        
        this.init();
    }

    init() {
        // Apply saved dark mode (only levels 0 and 1)
        document.body.className = `dark-level-${this.darkMode}`;
        
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
            } else {
                // Update undo button for loaded game
                this.updateUndoButton();
            }
        }
    }
    
    // Analytics helper methods
    sendAnalytics(eventName, parameters = {}) {
        // Check if analytics are enabled and gtag is available
        if (localStorage.getItem('2048-analytics-enabled') !== 'false' && 
            typeof gtag !== 'undefined' &&
            navigator.doNotTrack !== '1' && 
            window.doNotTrack !== '1' && 
            navigator.msDoNotTrack !== '1') {
            try {
                console.log('GA4 Event:', eventName, {
                    game_score: this.score,
                    high_score: this.highScore,
                    dark_mode: this.darkMode,
                    ...parameters
                });
                gtag('event', eventName, {
                    game_score: this.score,
                    high_score: this.highScore,
                    dark_mode: this.darkMode,
                    ...parameters
                });
            } catch (e) {
                console.error('Analytics error:', e);
            }
        }
    }
    
    trackError(error, context = {}) {
        // Check if error tracking is enabled and Sentry is available
        if (localStorage.getItem('2048-error-tracking-enabled') !== 'false' && 
            typeof Sentry !== 'undefined') {
            try {
                Sentry.captureException(error, {
                    tags: {
                        game_score: this.score,
                        dark_mode: this.darkMode
                    },
                    extra: {
                        ...context,
                        game_state: {
                            grid: this.grid,
                            tiles: this.tiles.size,
                            moves: this.history.length
                        }
                    }
                });
            } catch (e) {
                console.error('Error tracking failed:', e);
            }
        }
        
        // Also log to game history for debugging
        if (this.gameHistory) {
            this.gameHistory.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message || error.toString(),
                stack: error.stack,
                context
            });
        }
    }
    
    logEvent(eventType, data = {}) {
        // Add to game history for debugging
        if (this.gameHistory) {
            this.gameHistory.events.push({
                timestamp: new Date().toISOString(),
                type: eventType,
                data
            });
        }
        
        // Send analytics event
        this.sendAnalytics(eventType, data);
    }
    
    logMove(direction, previousScore, newScore, movements, duration) {
        const moveData = {
            direction,
            previousScore,
            newScore,
            scoreGained: newScore - previousScore,
            tilesMovedCount: movements.length,
            mergeCount: movements.filter(m => m.merged).length,
            duration,
            undosUsed: this.undosUsedThisGame
        };
        
        // Add to game history
        if (this.gameHistory) {
            this.gameHistory.moves.push({
                timestamp: new Date().toISOString(),
                ...moveData
            });
        }
        
        // Send analytics
        this.sendAnalytics('game_move', moveData);
    }
    
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    captureCurrentSettings() {
        return {
            darkMode: this.darkMode,
            dragMultiplier: this.dragMultiplier,
            animationSpeed: localStorage.getItem('2048-animation-speed') || '50',
            moveCooldown: localStorage.getItem('2048-move-cooldown') || '0',
            startWithOnes: localStorage.getItem('2048-start-with-ones') === 'true',
            luckyEights: localStorage.getItem('2048-lucky-eights') === 'true',
            undoLevels: localStorage.getItem('2048-undo-levels') || '1',
            zoomLevel: this.zoomLevel
        };
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
            
            // Calculate font sizes with zoom level applied
            const fontSize = Math.floor(cellSize * 0.45 * this.zoomLevel);
            const fontSizeSmall = Math.floor(cellSize * 0.4 * this.zoomLevel);
            const fontSizeTiny = Math.floor(cellSize * 0.35 * this.zoomLevel);
            
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
    
    setZoomLevel(zoom) {
        // Clamp zoom between 0.5 and 2.0
        this.zoomLevel = Math.max(0.5, Math.min(2.0, zoom));
        
        // Save to localStorage
        localStorage.setItem('2048-zoom', this.zoomLevel.toString());
        
        // Reapply sizing with new zoom level
        this.setupResponsiveSizing();
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
        // Check if battery warning is enabled
        const batteryWarningEnabled = localStorage.getItem('2048-battery-warning') !== 'false';
        
        // Only apply red background if battery is below 10% (0.1) and warning is enabled
        if (batteryWarningEnabled && level <= 0.1) {
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


        document.querySelector('.undo').addEventListener('click', () => {
            this.undo();
        });
        
        document.querySelector('.dark-mode').addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        document.querySelector('.settings').addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
        
        document.querySelector('.fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        document.querySelector('.github').addEventListener('click', () => {
            window.open('https://github.com/alexandrosm/2048-dark', '_blank');
        });
        
        document.querySelector('.new-game-overlay').addEventListener('click', () => {
            this.hideGameOver();
            this.startNewGame();
        });
        
        // Add wheel event listener for touchpad pinch (ctrl+wheel)
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                
                // Calculate zoom change based on wheel delta
                const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
                const newZoom = this.zoomLevel * zoomDelta;
                this.setZoomLevel(newZoom);
            }
        }, { passive: false });

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
                // Don't set isPinching yet - we'll determine gesture type on move
                
                // Calculate initial distance between touches for pinch
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
                
                // Also track for two-finger swipe
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
            const doubleTapUndoEnabled = localStorage.getItem('2048-double-tap-undo') !== 'false';
            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - lastTapTime;
            
            if (doubleTapUndoEnabled && timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 50) {
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
            // Handle two-finger gestures
            if (e.touches.length === 2) {
                // If we were dragging, reset tile positions
                if (this.isDragging) {
                    this.isDragging = false;
                    this.resetToInitialPositions();
                }
                
                // Calculate current distance and position
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                // Determine gesture type if not yet determined
                if (!this.isPinching && !this.isTwoFingerSwiping) {
                    const distanceChange = Math.abs(currentDistance - this.pinchStartDistance);
                    const verticalChange = Math.abs(currentY - twoFingerStartY);
                    
                    // If distance change is significant, it's a pinch
                    if (distanceChange > 10) {
                        this.isPinching = true;
                    }
                    // If vertical movement is significant, it's a swipe
                    else if (verticalChange > 10) {
                        this.isTwoFingerSwiping = true;
                    }
                }
                
                if (this.isPinching) {
                    // Handle pinch zoom
                    const scale = currentDistance / this.pinchStartDistance;
                    const newZoom = this.zoomLevel * scale;
                    this.setZoomLevel(newZoom);
                    this.pinchStartDistance = currentDistance;
                } else if (this.isTwoFingerSwiping) {
                    // Handle two-finger swipe for menu
                    const twoFingerMenuEnabled = localStorage.getItem('2048-two-finger-menu') !== 'false';
                    if (twoFingerMenuEnabled) {
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
                    }
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
            // Reset two-finger gesture states
            if (this.isPinching || this.isTwoFingerSwiping) {
                this.isPinching = false;
                this.isTwoFingerSwiping = false;
                this.pinchStartDistance = 0;
            }
            
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
            const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '50');
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
            this.saveGameHistory(); // Save debug history
            
            // Track game completion
            this.trackEvent('game_complete', 'game', null, this.score);
        }
        
        // Reset game history for new game
        this.gameHistory = {
            gameId: this.generateGameId(),
            startTime: new Date().toISOString(),
            moves: [],
            tileSpawns: [],
            scoreChanges: [],
            stateSnapshots: [],
            events: [],
            errors: [],
            settings: this.captureCurrentSettings()
        };
        
        this.logEvent('game_started', { 
            reason: 'new_game_button',
            previous_score: this.score,
            undos_used: this.undosUsedThisGame
        });
        
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.tiles.forEach(tile => tile.element.remove());
        this.tiles.clear();
        this.tileId = 0;
        this.history = [];
        this.undoCount = 0;
        this.undosUsedThisGame = 0; // Reset undo usage for new game
        this.updateScore();
        this.addNewTile();
        this.addNewTile();
        
        // Clear saved state
        localStorage.removeItem('2048-gamestate');
        
        // Update undo button state
        this.updateUndoButton();
        
        // Track new game start
        this.trackEvent('game_start', 'game');
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

    getEmptyCells() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({row, col});
                }
            }
        }
        return emptyCells;
    }

    addNewTile() {
        const emptyCells = this.getEmptyCells();

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
            
            // Log tile spawn for history
            this.logTileSpawn(randomCell.row, randomCell.col, value, rand);
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
        const cooldown = parseInt(localStorage.getItem('2048-move-cooldown') || '0');
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
        const previousScore = this.score;
        const movements = [];
        
        // Clear any preview positions since we're doing an actual move
        this.previewPositions.clear();
        
        // Save state before move
        this.lastExecutedDirection = direction; // Set the direction before saving state
        this.saveState();
        
        // Reset merged state for all tiles
        this.tiles.forEach(tile => tile.merged = false);
        
        // Log move attempt
        const moveStartTime = Date.now();
        
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
            // Log successful move
            this.logMove(direction, previousScore, this.score, movements, Date.now() - moveStartTime);
            // Check if this move is the same as the last undone move
            if (this.lastUndoneDirection === direction && this.undosUsedThisGame > 0) {
                // User is redoing the same move they just undid, restore their undo
                this.undosUsedThisGame--;
                this.updateUndoButton();
            }
            this.lastUndoneDirection = null; // Clear the last undone direction
            
            this.animateMovements(movements);
            
            const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '50');
            setTimeout(() => {
                this.cleanupMergedTiles();
                
                // Add a small delay to ensure all tiles have settled
                setTimeout(() => {
                    this.addNewTile();
                    this.saveGameState();
                    
                    // Check for game over AFTER adding new tile
                    if (this.checkGameOver()) {
                        // Reset undo usage when game ends to allow undo on game over screen
                        this.undosUsedThisGame = 0;
                        this.logEvent('game_over', { finalScore: this.score, moves: this.gameHistory.moves.length });
                        setTimeout(() => {
                            this.showGameOver();
                        }, 300);
                    }
                    
                    this.moveInProgress = false;
                }, 50);
            }, animationSpeed);
        } else {
            // No valid move - just remove from history
            this.history.pop();
            this.logEvent('invalid_move', { direction, reason: 'no_tiles_moved' });
            this.moveInProgress = false;
        }
    }

    animateMovements(movements) {
        const animationSpeed = parseInt(localStorage.getItem('2048-animation-speed') || '50');
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
                // Mark the merged tile for removal immediately
                mergedWith.toBeRemoved = true;
                
                setTimeout(() => {
                    tile.value *= 2;
                    tile.element.textContent = tile.value;
                    tile.element.className = `tile tile-${tile.value}`;
                    
                    // Remove the merged tile and update grid
                    if (mergedWith.element) {
                        mergedWith.element.remove();
                    }
                    this.tiles.delete(mergedWith.id);
                    
                    // Update grid to reflect the new tile value
                    this.grid[tile.row][tile.col] = tile.value;
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
            
            const newRowArray = Array(this.size).fill(0);
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
                    
                    // Update grid with merged value
                    newRowArray[newCol] = tile.value * 2;
                    
                    i++; // Skip the next tile
                } else {
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                    
                    // Update grid with tile value
                    newRowArray[newCol] = tile.value;
                }
                newCol++;
            }
            
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
            
            const newRowArray = Array(this.size).fill(0);
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
                    
                    // Update grid with merged value
                    newRowArray[newCol] = tile.value * 2;
                    
                    i++; // Skip the next tile
                } else {
                    movements.push({
                        tile: tile,
                        newRow: row,
                        newCol: newCol,
                        merged: false
                    });
                    
                    // Update grid with tile value
                    newRowArray[newCol] = tile.value;
                }
                newCol--;
            }
            
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
                    
                    // Update grid with merged value
                    this.grid[newRow][col] = tile.value * 2;
                    
                    i++; // Skip the next tile
                } else {
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                    
                    // Update grid with tile value
                    this.grid[newRow][col] = tile.value;
                }
                newRow++;
            }
            
            // Fill remaining cells with 0
            for (let row = newRow; row < this.size; row++) {
                this.grid[row][col] = 0;
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
                    
                    // Update grid with merged value
                    this.grid[newRow][col] = tile.value * 2;
                    
                    i++; // Skip the next tile
                } else {
                    movements.push({
                        tile: tile,
                        newRow: newRow,
                        newCol: col,
                        merged: false
                    });
                    
                    // Update grid with tile value
                    this.grid[newRow][col] = tile.value;
                }
                newRow--;
            }
            
            // Fill remaining cells with 0
            for (let row = newRow; row >= 0; row--) {
                this.grid[row][col] = 0;
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
    
    checkGameOver() {
        // First check if we can spawn a new tile
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({row, col});
                }
            }
        }
        
        // If there are empty cells, game is not over
        if (emptyCells.length > 0) return false;
        
        // No empty cells - check if any moves are possible
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col];
                
                // Check right
                if (col < this.size - 1 && value === this.grid[row][col + 1]) return false;
                
                // Check down
                if (row < this.size - 1 && value === this.grid[row + 1][col]) return false;
            }
        }
        
        return true;
    }

    updateScore() {
        const previousScore = parseInt(document.querySelector('.score').textContent.split(' ')[0]) || 0;
        
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
        
        // Log score change if different
        if (previousScore !== this.score && this.gameHistory) {
            this.logScoreChange(previousScore, this.score);
        }
    }

    toggleDarkMode() {
        // Toggle between dark levels 0 and 1 only
        this.darkMode = (this.darkMode + 1) % 2;
        document.body.className = `dark-level-${this.darkMode}`;
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
        
        // Track game over
        this.trackEvent('game_over', 'game', null, this.score);
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
        const gameData = {
            score: this.score,
            timestamp: new Date().toISOString(),
            moves: this.history.length,
            undos: this.undoCount,
            duration: this.gameHistory ? 
                (new Date() - new Date(this.gameHistory.startTime)) / 1000 : 0
        };
        
        // Send analytics for completed game
        this.sendAnalytics('game_completed', {
            final_score: gameData.score,
            total_moves: gameData.moves,
            total_undos: gameData.undos,
            game_duration_seconds: gameData.duration,
            highest_tile: Math.max(...Array.from(this.tiles.values()).map(t => t.value))
        });
        
        const games = this.loadGameHistory();
        games.push(gameData);
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
            tiles: [],
            lastDirection: this.lastExecutedDirection // Save the direction of this move
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
        
        // Update undo button when history changes
        this.updateUndoButton();
    }

    undo() {
        if (this.history.length === 0) return;
        
        // Check undo level setting
        const undoLevel = parseInt(localStorage.getItem('2048-undo-levels') || '1');
        
        // If no undos allowed
        if (undoLevel === 0) return;
        
        // If single undo only and already used (unless game is over)
        if (undoLevel === 1 && this.undosUsedThisGame >= 1 && !this.checkGameOver()) return;
        
        this.undoCount++;
        this.undosUsedThisGame++;
        const state = this.history.pop();
        
        // Log undo action
        this.logEvent('undo', { 
            undoneDirection: state.lastDirection,
            undoCount: this.undoCount,
            scoreBeforeUndo: this.score,
            scoreAfterUndo: state.score
        });
        
        // Store the direction of the move we're undoing
        this.lastUndoneDirection = state.lastDirection;
        
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
        
        // Update undo button state
        this.updateUndoButton();
    }
    
    updateUndoButton() {
        const undoButton = document.querySelector('.undo');
        if (!undoButton) return;
        
        const undoLevel = parseInt(localStorage.getItem('2048-undo-levels') || '1');
        let isDisabled = false;
        
        // Check if undo should be disabled
        if (this.history.length === 0) {
            isDisabled = true;
        } else if (undoLevel === 0) {
            isDisabled = true;
        } else if (undoLevel === 1 && this.undosUsedThisGame >= 1 && !this.checkGameOver()) {
            isDisabled = true;
        }
        
        // Update button appearance
        if (isDisabled) {
            undoButton.style.opacity = '0.3';
            undoButton.style.cursor = 'not-allowed';
        } else {
            undoButton.style.opacity = '1';
            undoButton.style.cursor = 'pointer';
        }
    }

    // Game history tracking methods
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    captureCurrentSettings() {
        return {
            darkMode: this.darkMode,
            dragMultiplier: this.dragMultiplier,
            zoomLevel: this.zoomLevel,
            startWithOnes: localStorage.getItem('2048-start-with-ones') === 'true',
            luckyEights: localStorage.getItem('2048-lucky-eights') === 'true',
            undoLevels: localStorage.getItem('2048-undo-levels') || '1',
            moveCooldown: localStorage.getItem('2048-move-cooldown') || '0',
            animationSpeed: localStorage.getItem('2048-animation-speed') || '50',
            batteryWarning: localStorage.getItem('2048-battery-warning') !== 'false',
            doubleTapUndo: localStorage.getItem('2048-double-tap-undo') !== 'false',
            twoFingerMenu: localStorage.getItem('2048-two-finger-menu') !== 'false'
        };
    }
    
    logMove(direction, previousScore, newScore, movements, duration) {
        const moveData = {
            timestamp: new Date().toISOString(),
            direction,
            previousScore,
            newScore,
            scoreGained: newScore - previousScore,
            duration,
            tilesMovedCount: movements.length,
            mergedTiles: movements.filter(m => m.merged).length,
            gridSnapshot: this.captureGridSnapshot()
        };
        
        this.gameHistory.moves.push(moveData);
        
        // Take periodic state snapshots (every 10 moves)
        if (this.gameHistory.moves.length % 10 === 0) {
            this.captureStateSnapshot();
        }
    }
    
    logTileSpawn(row, col, value, randomValue) {
        this.gameHistory.tileSpawns.push({
            timestamp: new Date().toISOString(),
            row,
            col,
            value,
            randomValue,
            emptyCellsCount: this.getEmptyCells().length + 1 // +1 because we just filled one
        });
    }
    
    logScoreChange(previousScore, newScore) {
        this.gameHistory.scoreChanges.push({
            timestamp: new Date().toISOString(),
            previousScore,
            newScore,
            change: newScore - previousScore
        });
    }
    
    logEvent(eventType, data) {
        this.gameHistory.events.push({
            timestamp: new Date().toISOString(),
            type: eventType,
            data
        });
    }
    
    logError(error, context) {
        this.gameHistory.errors.push({
            timestamp: new Date().toISOString(),
            error: error.toString(),
            stack: error.stack,
            context
        });
    }
    
    captureGridSnapshot() {
        const snapshot = [];
        for (let row = 0; row < this.size; row++) {
            snapshot.push([...this.grid[row]]);
        }
        return snapshot;
    }
    
    captureStateSnapshot() {
        this.gameHistory.stateSnapshots.push({
            timestamp: new Date().toISOString(),
            moveNumber: this.gameHistory.moves.length,
            score: this.score,
            grid: this.captureGridSnapshot(),
            tileCount: this.tiles.size,
            highestTile: Math.max(...Array.from(this.tiles.values()).map(t => t.value)),
            undosUsed: this.undoCount
        });
    }
    
    saveGameHistory() {
        try {
            // Add final state
            this.gameHistory.endTime = new Date().toISOString();
            this.gameHistory.finalScore = this.score;
            this.gameHistory.totalMoves = this.gameHistory.moves.length;
            this.gameHistory.totalUndos = this.undoCount;
            
            // Store in localStorage (keep last 10 games)
            const historyKey = '2048-game-histories';
            const histories = JSON.parse(localStorage.getItem(historyKey) || '[]');
            histories.push(this.gameHistory);
            
            // Keep only last 10 games
            if (histories.length > 10) {
                histories.shift();
            }
            
            localStorage.setItem(historyKey, JSON.stringify(histories));
        } catch (error) {
            console.error('Failed to save game history:', error);
        }
    }
    
    exportGameHistory() {
        const history = {
            ...this.gameHistory,
            exportTime: new Date().toISOString(),
            currentState: {
                score: this.score,
                grid: this.captureGridSnapshot(),
                tiles: Array.from(this.tiles.values()).map(t => ({
                    id: t.id,
                    value: t.value,
                    row: t.row,
                    col: t.col
                })),
                moveCount: this.gameHistory.moves.length
            }
        };
        
        return history;
    }
}

// Wait for DOM to be ready before initializing the game
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new Game2048();
    });
} else {
    // DOM is already ready
    window.game = new Game2048();
}

// Global error handlers
window.addEventListener('error', (event) => {
    if (window.game && typeof window.game.trackError === 'function') {
        window.game.trackError(event.error || new Error(event.message), {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (window.game && typeof window.game.trackError === 'function') {
        window.game.trackError(new Error(`Unhandled promise rejection: ${event.reason}`), {
            promise: event.promise
        });
    }
});

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // ServiceWorker registration successful
                if (window.game && typeof window.game.logEvent === 'function') {
                    window.game.logEvent('service_worker_registered');
                }
            })
            .catch(err => {
                // ServiceWorker registration failed
                if (window.game && typeof window.game.trackError === 'function') {
                    window.game.trackError(err, { context: 'service_worker_registration' });
                }
            });
    });
}

