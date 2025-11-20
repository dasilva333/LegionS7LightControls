# Feature Specification: Snake Game (Interactive Mode)

**Version:** 1.0
**Date:** November 20, 2025
**Goal:** Create a fully interactive Snake game that renders to both the web UI and the physical keyboard.

## 1. Architectural Overview

The "Snake" feature is a self-contained module with three components: a **Frontend Game Engine**, a **Backend State Mirror**, and a **Keyboard Renderer**.

1.  **Game Engine (Frontend - React/Canvas):** This is the "Source of Truth". It runs the game loop, handles user input (arrow keys), and manages all game logic (collision, food placement, scoring).
2.  **State Mirror (Backend - Node.js):** The backend receives state updates from the frontend via Socket.io. It does **not** run game logic; it is a "dumb" server that holds the latest frame and pushes it to Frida.
3.  **Renderer (Frida - God Mode):** A new **`layer_snake.js`** module will read the game state and paint the corresponding pixels on the keyboard.

## 2. Frontend Implementation (`src/pages/Snake.tsx`)

A new tab/page will be created to host the game.

### **Phase 1: The Game Logic**

*   **Game Grid:** A 2D array representing the keyboard's approximate 6x22 layout.
*   **Game State:** A React state object (`useState`) containing:
    *   `snake`: An array of `[row, col]` coordinates.
    *   `food`: A single `[row, col]` coordinate.
    *   `direction`: 'UP', 'DOWN', 'LEFT', 'RIGHT'.
    *   `gameOver`: boolean.
*   **Input Handling:** A `useEffect` hook to listen for `keydown` events (Arrow Keys) to update the `direction`.
*   **Game Loop:** A `setInterval` (or `requestAnimationFrame`) loop that runs every ~200ms (to control game speed). On each tick, it:
    1.  Calculates the new snake head position.
    2.  Checks for collisions (wall or self).
    3.  Checks for food consumption.
    4.  Updates the `snake` and `food` state.

### **Phase 2: The Visualizer**

*   **Technology:** HTML5 Canvas or a simple grid of `<div>` elements.
*   **Rendering:** The component re-renders whenever the game state changes. It iterates the grid and colors the `div`s based on whether they contain the snake head, snake body, or food.

### **Phase 3: The Sync Button**

*   A button labeled **[ Sync to Keyboard ]**.
*   **Action:**
    1.  Connects to the backend via Socket.io.
    2.  Inside the game loop, after updating state, it emits a `snake:frame` event with the latest `snake` and `food` coordinates.

## 3. Backend Implementation

*   **Socket.io Server:**
    *   Listens for `snake:frame` events.
    *   On receive, it updates a global `snakeGameState` variable.
    *   It then calls `sendCommand('updateState', { snake: snakeGameState })` to push the new frame to Frida.

## 4. Frida Implementation (`frida/godmode/layers/`)

*   **Create `layer_snake.js`**.
*   **Logic:**
    *   This layer will have a **high priority** (rendered near the top, after FX but before Interrupts, or as an Interrupt).
    *   It checks `if (state.snake && state.snake.active)`.
    *   If active, it **overrides** the `currentColor` for any `keyId` whose `pos` matches the coordinates in the `state.snake` object.
        *   Snake Head: Bright Green.
        *   Snake Body: Dimmer Green.
        *   Food: Red.
    *   If a key is *not* part of the game, it returns the `currentColor` from the layers below it.

This architecture ensures the game is playable and debuggable entirely in the browser, with the keyboard acting as a simple, optional "second screen."