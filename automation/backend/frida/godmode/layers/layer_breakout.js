// layer_breakout.js
// Renders the Breakout game state on the keyboard

const PADDLE_COLOR = { r: 0, g: 255, b: 0 }; // Green
const BALL_COLOR = { r: 255, g: 0, b: 0 };   // Red
const BRICK_COLOR = { r: 0, g: 0, b: 255 };  // Blue

function layerBreakoutGame(state, pos, tick, color, color_math) {
    if (!state.breakout || !state.breakout.isPlaying) return null;

    const { paddleCol, ballPos, bricks } = state.breakout;
    const PADDLE_WIDTH = 4; // Must match frontend
    const PADDLE_ROW = 0;   // Must match frontend

    // Helper to check if current key matches a coordinate
    const isAt = (r, c) => r === pos.row && c === pos.col;

    // 1. Check Paddle
    if (pos.row === PADDLE_ROW) {
        if (pos.col >= paddleCol && pos.col < paddleCol + PADDLE_WIDTH) {
            return PADDLE_COLOR;
        }
    }

    // 2. Check Ball
    if (ballPos && isAt(ballPos[0], ballPos[1])) {
        return BALL_COLOR;
    }

    // 3. Check Bricks
    if (bricks && bricks.length > 0) {
        // Bricks is an array of {r, c, active}
        // We iterate to find if any active brick is at this position
        // Optimization: Bricks are usually on rows 4,5. We could check row first.
        const brick = bricks.find(b => b.active && b.r === pos.row && b.c === pos.col);
        if (brick) {
            return BRICK_COLOR;
        }
    }

    return null;
}

return layerBreakoutGame;
