#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create self-signed certificate if it doesn't exist
const certPath = path.join(__dirname, 'localhost.pem');
const keyPath = path.join(__dirname, 'localhost-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('Creating self-signed certificate...');
    try {
        // Check if mkcert is installed
        execSync('which mkcert', { stdio: 'ignore' });
        // Use mkcert for trusted local certificates
        execSync('mkcert -install', { stdio: 'inherit' });
        execSync('mkcert localhost 127.0.0.1 ::1', { stdio: 'inherit' });
        fs.renameSync('localhost+2.pem', certPath);
        fs.renameSync('localhost+2-key.pem', keyPath);
    } catch (e) {
        // Fallback to openssl
        console.log('mkcert not found, using openssl...');
        execSync(`openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -days 365 -keyout ${keyPath} -out ${certPath}`, { stdio: 'inherit' });
    }
}

// Create HTTPS server
const server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
}, (req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        
        // Set appropriate content type
        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
});

const PORT = process.env.PORT || 8443;
server.listen(PORT, () => {
    console.log(`HTTPS Server running at https://localhost:${PORT}`);
    console.log('Note: You may need to accept the self-signed certificate in your browser.');
});