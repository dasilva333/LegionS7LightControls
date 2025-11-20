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
    // Check Food
    if (isAt(food)) {
        // Force solid red to verify mapping first
        return { r: 255, g: 0, b: 0 };
    }

    return null;
}

return layerSnakeGame;