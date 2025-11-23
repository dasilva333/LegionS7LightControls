const { sendCommand } = require('../frida/proxy');

let snakeGameState = {
    snake: [],
    food: [],
    gameOver: false,
    isPlaying: false,
    lastUpdated: Date.now()
};

let breakoutGameState = {
    paddleCol: 0,
    ballPos: [0, 0],
    bricks: [],
    gameOver: false,
    isPlaying: false,
    lastUpdated: Date.now()
};

let pongGameState = {
    ball: { x: 0, y: 0 },
    paddleTop: 0,
    paddleBottom: 0,
    score: { user: 0, cpu: 0 },
    gameOver: false,
    isPlaying: false,
    lastUpdated: Date.now()
};

function initGameSocket(io) {
    console.log('[GameHandler] Initializing Socket.io handler for Arcade Games...');

    let messageCount = 0;

    // Log message rate every second
    setInterval(() => {
        if (messageCount > 0) {
            process.stdout.write(`\r[GameHandler] Input Rate: ${messageCount} msgs/sec   `);
            messageCount = 0;
        }
    }, 1000);

    io.on('connection', (socket) => {
        console.log('\n[GameHandler] Frontend connected:', socket.id);

        // --- SNAKE EVENTS ---
        socket.on('snake:frame', (data) => {
            messageCount++;
            // DEBUG LOG: Only log state changes or every 60th frame to avoid spam
            if (data.isPlaying !== snakeGameState.isPlaying || messageCount % 60 === 0) {
                console.log(`[GameHandler] Snake Frame: Playing=${data.isPlaying}, GameOver=${data.gameOver}`);
            }

            snakeGameState = {
                ...snakeGameState,
                ...data,
                lastUpdated: Date.now()
            };
            // Push to Frida
            sendCommand('updateState', { snake: snakeGameState });
        });

        // --- BREAKOUT EVENTS ---
        socket.on('breakout:frame', (data) => {
            messageCount++;
            breakoutGameState = {
                ...breakoutGameState,
                ...data,
                lastUpdated: Date.now()
            };
            // Push to Frida
            sendCommand('updateState', { breakout: breakoutGameState });
        });

        // --- PONG EVENTS ---
        socket.on('pong:frame', (data) => {
            messageCount++;
            pongGameState = {
                ...pongGameState,
                ...data,
                lastUpdated: Date.now()
            };
            // Push to Frida
            sendCommand('updateState', { pong: pongGameState });
        });

        socket.on('disconnect', () => {
            console.log('\n[GameHandler] Frontend disconnected:', socket.id);
        });
    });
}

module.exports = { initGameSocket };
