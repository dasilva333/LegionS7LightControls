// layer_snake.js
// Renders the Snake game state on the keyboard

const SNAKE_HEAD_COLOR = { r: 0, g: 255, b: 0 }; // Bright Green
const SNAKE_BODY_COLOR = { r: 0, g: 100, b: 0 }; // Dim Green
const FOOD_COLOR = { r: 255, g: 0, b: 0 };       // Red

function layerSnakeGame(state, pos, tick, color, color_math) {
    if (!state.snake || !state.snake.isPlaying) return null;

    const { snake, food } = state.snake;

    // Helper to check if current key matches a coordinate
    // Note: pos.row and pos.col are 0-indexed, matching our game grid
    const isAt = (coord) => coord[0] === pos.row && coord[1] === pos.col;

    // Check Head
    if (snake.length > 0 && isAt(snake[0])) {
        return SNAKE_HEAD_COLOR;
    }

    // Check Body
    for (let i = 1; i < snake.length; i++) {
        if (isAt(snake[i])) {
            return SNAKE_BODY_COLOR;
        }
    }

    // Check Food (with pulse effect)
    if (isAt(food)) {
        // Pulse logic: sin wave based on tick
        // tick is roughly ms or frame count? Assuming frame count or time.
        // Let's assume tick is incrementing.
        const pulse = (Math.sin(tick / 10) + 1) / 2; // 0 to 1
        const r = Math.floor(150 + (105 * pulse)); // Pulse between 150 and 255
        return { r: r, g: 0, b: 0 };
    }

    // Background for game area (optional, maybe dim the rest?)
    // For now, return null to let lower layers (like background) show through 
    // OR return black to clear the board?
    // The spec says "If a key is not part of the game, it returns the currentColor from the layers below it."
    // BUT, if we want the game to be clear, we might want to black out the game grid area if it's not a snake/food.
    // However, the user said "If a key is *not* part of the game, it returns the currentColor from the layers below it."
    // Wait, the user said: "If active, it **overrides** the `currentColor`... If a key is *not* part of the game, it returns the `currentColor` from the layers below it."
    // This implies transparency for non-game keys.

    return null;
}

return layerSnakeGame;