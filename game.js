class Game2048 {
    constructor() {
        this.grid = [];
        this.score = 0;
        this.size = 4;
        this.darkMode = 0;
        this.tiles = new Map();
        this.tileId = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragThreshold = 50;
        this.dragMultiplier = 3.5;
        this.previewPositions = new Map();
        this.history = [];
        this.autoReloadInterval = null;
        this.lastExecutedDirection = null;
        this.moveInProgress = false;
        this.continuousDrag = false;
        this.waitingForNewDirection = false;
        this.highScore = this.loadHighScore();
        this.init();
    }

    init() {
        this.setupGrid();
        this.setupEventListeners();
        this.startNewGame();
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

        // Touch event handling with real-time preview on whole screen
        
        // Double tap detection
        let lastTapTime = 0;
        const doubleTapThreshold = 300; // milliseconds
        
        document.addEventListener('touchstart', (e) => {
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
                
                // If tiles have reached their destination (moveRatio >= 1), execute the move
                if (moveRatio >= 1 && direction !== this.lastExecutedDirection) {
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
            
            // If we haven't executed any moves during continuous drag
            if (!this.continuousDrag) {
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
                
                // If tiles have reached their destination (moveRatio >= 1), execute the move
                if (moveRatio >= 1 && direction !== this.lastExecutedDirection) {
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
        this.moveInProgress = true;
        this.lastExecutedDirection = direction;
        this.waitingForNewDirection = true;
        
        // Don't reset positions - move directly from current preview position
        this.move(direction);
        
        // After move completes, reset for next potential move
        setTimeout(() => {
            this.moveInProgress = false;
            
            // Update drag start position for continuous dragging
            if (this.isDragging && currentX !== undefined && currentY !== undefined) {
                // Use the position passed when the move was triggered
                this.dragStartX = currentX;
                this.dragStartY = currentY;
                this.saveInitialPositions();
            }
        }, 150); // Wait for move animation to complete
    }

    previewMove(direction, distance) {
        const maxDistance = 82 * 3; // Maximum movement is 3 tiles
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
                const deltaX = (finalPos.col * 82) - initial.left;
                newLeft = initial.left + (deltaX * moveRatio);
            } else {
                const deltaY = (finalPos.row * 82) - initial.top;
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
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.tiles.forEach(tile => tile.element.remove());
        this.tiles.clear();
        this.tileId = 0;
        this.history = [];
        this.updateScore();
        this.addNewTile();
        this.addNewTile();
    }

    createTileElement(value, row, col) {
        const gameGrid = document.querySelector('.game-grid');
        const tile = document.createElement('div');
        tile.classList.add('tile', `tile-${value}`);
        tile.textContent = value;
        tile.style.left = `${col * 82}px`;
        tile.style.top = `${row * 82}px`;
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
            const value = Math.random() < 0.9 ? 2 : 4;
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
        const previousGrid = JSON.stringify(this.grid);
        const movements = [];
        
        // Save state before move
        this.saveState();
        
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
            
            setTimeout(() => {
                this.cleanupMergedTiles();
                this.addNewTile();
                
                if (this.isGameOver()) {
                    setTimeout(() => {
                        alert(`Game Over! Score: ${this.score}`);
                    }, 300);
                }
            }, 150);
        } else {
            // Remove the saved state if no move was made
            this.history.pop();
        }
    }

    animateMovements(movements) {
        movements.forEach(({tile, newRow, newCol, merged, mergedWith}) => {
            tile.row = newRow;
            tile.col = newCol;
            
            // Ensure smooth transition even if tile is already at preview position
            const currentLeft = parseFloat(tile.element.style.left);
            const currentTop = parseFloat(tile.element.style.top);
            const targetLeft = newCol * 82;
            const targetTop = newRow * 82;
            
            // Only animate if there's actual movement needed
            if (Math.abs(currentLeft - targetLeft) > 0.1 || Math.abs(currentTop - targetTop) > 0.1) {
                tile.element.style.transition = 'left 0.15s ease, top 0.15s ease';
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
                }, 150);
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
        
        // Display score / percentage format
        document.querySelector('.score').textContent = `${this.score} / ${percentage}%`;
    }

    toggleDarkMode() {
        this.darkMode = (this.darkMode + 1) % 3;
        document.body.className = `dark-level-${this.darkMode}`;
    }
    
    loadHighScore() {
        const saved = localStorage.getItem('2048-highscore');
        return saved ? parseInt(saved) : 0;
    }
    
    saveHighScore() {
        localStorage.setItem('2048-highscore', this.highScore.toString());
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
    }
}

const game = new Game2048();

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

