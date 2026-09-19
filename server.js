const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express and the HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Route 1: Serve the Player UI at the root domain (e.g., localhost:3000)
app.use('/', express.static(path.join(__dirname, 'public/player')));

// Route 2: Serve the Host UI at /host (e.g., localhost:3000/host)
app.use('/host', express.static(path.join(__dirname, 'public/host')));

const gameManager = require('./gameManager');

// Replace the old io.on('connection') block with this single line:
gameManager(io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`BrainBurst server running!`);
    console.log(`Players join at: http://localhost:${PORT}`);
    console.log(`Host screen at:  http://localhost:${PORT}/host`);
});