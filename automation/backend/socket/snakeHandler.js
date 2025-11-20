const { sendCommand } = require('../frida/proxy');

let snakeGameState = {
    snake: [],
    food: [],
    gameOver: false,
    isPlaying: false,
    lastUpdated: Date.now()
};

function initSnakeSocket(io) {
    console.log('[SnakeHandler] Initializing Socket.io handler for Snake...');

    io.on('connection', (socket) => {
        console.log('[SnakeHandler] Frontend connected:', socket.id);

        socket.on('snake:frame', (data) => {
            // Update local state
            snakeGameState = {
                ...snakeGameState,
                ...data,
                lastUpdated: Date.now()
            };

            // Push to Frida
            sendCommand('updateState', { snake: snakeGameState });
        });

        socket.on('disconnect', () => {
            console.log('[SnakeHandler] Frontend disconnected:', socket.id);
        });
    });

    // Log state every 5 seconds
    // setInterval(() => {
    //     if (snakeGameState.isPlaying || (Date.now() - snakeGameState.lastUpdated < 10000)) {
    //     console.log('\n--- [Snake Game State Log] ---');
    //     console.log(`Playing: ${snakeGameState.isPlaying}`);
    //     console.log(`Game Over: ${snakeGameState.gameOver}`);
    //     console.log(`Snake Length: ${snakeGameState.snake ? snakeGameState.snake.length : 0}`);
    //     console.log(`Head Pos: ${snakeGameState.snake && snakeGameState.snake.length > 0 ? JSON.stringify(snakeGameState.snake[0]) : 'N/A'}`);
    //     console.log(`Food Pos: ${JSON.stringify(snakeGameState.food)}`);
    //     console.log('------------------------------\n');
    //     }
    // }, 5000);
}

module.exports = { initSnakeSocket };
