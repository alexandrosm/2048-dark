class Analytics {
    constructor() {
        this.games = this.loadGames();
        this.canvas = document.getElementById('chart');
        this.ctx = this.canvas.getContext('2d');
        this.init();
    }
    
    loadGames() {
        const saved = localStorage.getItem('2048-games');
        return saved ? JSON.parse(saved) : [];
    }
    
    init() {
        if (this.games.length === 0) {
            document.getElementById('no-data').style.display = 'block';
            document.querySelector('.chart-container').style.display = 'none';
            return;
        }
        
        this.updateStats();
        this.drawChart();
        
        // Handle resize
        window.addEventListener('resize', () => this.drawChart());
    }
    
    updateStats() {
        // Total games
        document.getElementById('total-games').textContent = this.games.length;
        
        // Average score
        const avgScore = Math.round(
            this.games.reduce((sum, game) => sum + game.score, 0) / this.games.length
        );
        document.getElementById('avg-score').textContent = avgScore;
        
        // Best score
        const bestScore = Math.max(...this.games.map(g => g.score));
        document.getElementById('best-score').textContent = bestScore;
        
        // Average undos (handle games that might not have undo data)
        const gamesWithUndos = this.games.filter(g => g.undos !== undefined);
        const avgUndos = gamesWithUndos.length > 0 
            ? (gamesWithUndos.reduce((sum, game) => sum + (game.undos || 0), 0) / gamesWithUndos.length).toFixed(1)
            : '0';
        document.getElementById('avg-undos').textContent = avgUndos;
        
        // 7-day trend
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentGames = this.games.filter(g => new Date(g.timestamp) > sevenDaysAgo);
        const olderGames = this.games.filter(g => new Date(g.timestamp) <= sevenDaysAgo && new Date(g.timestamp) > new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000));
        
        if (recentGames.length > 2 && olderGames.length > 2) {
            const recentAvg = recentGames.reduce((sum, g) => sum + g.score, 0) / recentGames.length;
            const olderAvg = olderGames.reduce((sum, g) => sum + g.score, 0) / olderGames.length;
            const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
            document.getElementById('trend').textContent = trend > 0 ? `+${trend.toFixed(0)}%` : `${trend.toFixed(0)}%`;
            document.getElementById('trend').style.color = trend > 0 ? '#4ade80' : '#ef4444';
        } else {
            document.getElementById('trend').textContent = '-';
        }
    }
    
    drawChart() {
        // Set canvas size
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        const padding = 40;
        const paddingRight = 60; // Extra padding for right axis
        const chartWidth = this.canvas.width - padding - paddingRight;
        const chartHeight = this.canvas.height - padding * 2;
        
        // Get dark mode level for opacity adjustments
        const darkMode = 0; // Always dark mode level 0
        const opacityMultiplier = 1;
        const isBrightMode = false;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get data range
        const scores = this.games.map(g => g.score);
        const minScore = 0;
        const maxScore = Math.max(...scores) * 1.1;
        
        const undos = this.games.map(g => g.undos || 0);
        const maxUndos = Math.max(...undos, 5) * 1.1; // Minimum of 5 for scale
        
        const timestamps = this.games.map(g => new Date(g.timestamp).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeRange = maxTime - minTime || 1;
        
        // Draw axes
        const axisColor = isBrightMode ? '119, 110, 101' : '255, 255, 255';
        this.ctx.strokeStyle = `rgba(${axisColor}, ${0.1 * opacityMultiplier})`;
        this.ctx.lineWidth = 1;
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.canvas.height - padding);
        this.ctx.stroke();
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(padding, this.canvas.height - padding);
        this.ctx.lineTo(this.canvas.width - paddingRight, this.canvas.height - padding);
        this.ctx.stroke();
        
        // Right Y-axis for undos
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - paddingRight, padding);
        this.ctx.lineTo(this.canvas.width - paddingRight, this.canvas.height - padding);
        this.ctx.stroke();
        
        // Draw grid lines and labels
        this.ctx.fillStyle = `rgba(${axisColor}, ${0.2 * opacityMultiplier})`;
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        
        // Y-axis labels
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i / 5);
            const score = Math.round(maxScore * (1 - i / 5));
            
            // Grid line
            this.ctx.strokeStyle = `rgba(${axisColor}, ${0.05 * opacityMultiplier})`;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(this.canvas.width - paddingRight, y);
            this.ctx.stroke();
            
            // Left axis label (score)
            this.ctx.fillStyle = `rgba(${axisColor}, ${0.2 * opacityMultiplier})`;
            this.ctx.fillText(score, padding - 35, y + 4);
            
            // Right axis label (undos)
            const undoValue = Math.round(maxUndos * (1 - i / 5));
            const undoColor = isBrightMode ? '143, 122, 102' : '255, 107, 0';
            this.ctx.fillStyle = `rgba(${undoColor}, ${0.2 * opacityMultiplier})`;
            this.ctx.fillText(undoValue, this.canvas.width - paddingRight + 5, y + 4);
        }
        
        // Calculate moving average
        const movingAverage = this.calculateMovingAverage(7);
        
        // Draw moving average line
        if (movingAverage.length > 1) {
            const lineColor = isBrightMode ? '143, 122, 102' : '255, 107, 0';
            this.ctx.strokeStyle = `rgba(${lineColor}, ${0.3 * opacityMultiplier})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            movingAverage.forEach((point, i) => {
                const x = padding + (point.time - minTime) / timeRange * chartWidth;
                const y = padding + (1 - point.avg / maxScore) * chartHeight;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
        }
        
        // Draw undo line
        if (this.games.length > 1) {
            this.ctx.strokeStyle = `rgba(${undoColor}, ${0.2 * opacityMultiplier})`;
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            
            this.games.forEach((game, i) => {
                const x = padding + (new Date(game.timestamp).getTime() - minTime) / timeRange * chartWidth;
                const undos = game.undos || 0;
                const y = padding + (1 - undos / maxUndos) * chartHeight;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw scatter points for scores
        this.games.forEach((game, index) => {
            const x = padding + (new Date(game.timestamp).getTime() - minTime) / timeRange * chartWidth;
            const y = padding + (1 - game.score / maxScore) * chartHeight;
            
            // Draw score point
            const pointColor = isBrightMode ? '143, 122, 102' : '255, 107, 0';
            this.ctx.fillStyle = `rgba(${pointColor}, ${(0.3 + 0.7 * (index / this.games.length)) * opacityMultiplier})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw legend
        this.ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        this.ctx.fillStyle = `rgba(${axisColor}, ${0.2 * opacityMultiplier})`;
        this.ctx.fillText('● Individual games', this.canvas.width - 130, 20);
        this.ctx.fillText('(size = undos)', this.canvas.width - 130, 32);
        const avgColor = isBrightMode ? '143, 122, 102' : '255, 107, 0';
        this.ctx.fillStyle = `rgba(${avgColor}, ${0.3 * opacityMultiplier})`;
        this.ctx.fillText('— 7-day average', this.canvas.width - 130, 47);
    }
    
    calculateMovingAverage(days) {
        if (this.games.length < 2) return [];
        
        const sorted = [...this.games].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        const movingAvg = [];
        const windowMs = days * 24 * 60 * 60 * 1000;
        
        sorted.forEach((game, index) => {
            const currentTime = new Date(game.timestamp).getTime();
            const windowStart = currentTime - windowMs / 2;
            const windowEnd = currentTime + windowMs / 2;
            
            const gamesInWindow = sorted.filter(g => {
                const time = new Date(g.timestamp).getTime();
                return time >= windowStart && time <= windowEnd;
            });
            
            if (gamesInWindow.length > 0) {
                const avg = gamesInWindow.reduce((sum, g) => sum + g.score, 0) / gamesInWindow.length;
                movingAvg.push({
                    time: currentTime,
                    avg: avg
                });
            }
        });
        
        return movingAvg;
    }
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Analytics();
});