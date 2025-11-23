// layer_pong.js
// Renders the Pong game state on the keyboard

const BALL_COLOR = { r: 255, g: 0, b: 0 };       // Red
const PADDLE_USER_COLOR = { r: 0, g: 255, b: 0 }; // Bright Green
const PADDLE_CPU_COLOR = { r: 0, g: 255, b: 0 };  // Bright Green (Same as user for now)

function layerPongGame(state, pos, tick, color, color_math) {
    if (!state.pong || !state.pong.isPlaying) return null;

    const { ball, paddleTop, paddleBottom } = state.pong;
    const ROWS = 6; // Hardcoded for now, should match frontend

    // Helper to check if current key matches a coordinate
    const isAt = (r, c) => r === pos.row && c === pos.col;

    // Check Ball
    if (ball && isAt(ball.y, ball.x)) {
        return BALL_COLOR;
    }

    // Check Top Paddle (User) - Row 0
    // Paddle width is 3 (center +/- 1)
    if (pos.row === 0) {
        if (pos.col >= paddleTop - 1 && pos.col <= paddleTop + 1) {
            return PADDLE_USER_COLOR;
        }
    }

    // Check Bottom Paddle (CPU) - Row 5 (ROWS - 1)
    if (pos.row === ROWS - 1) {
        if (pos.col >= paddleBottom - 1 && pos.col <= paddleBottom + 1) {
            return PADDLE_CPU_COLOR;
        }
    }

    return null;
}

return layerPongGame;
