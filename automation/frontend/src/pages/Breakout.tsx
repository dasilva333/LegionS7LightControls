import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonButtons,
    useIonViewWillLeave
} from '@ionic/react';
import { play, refresh, cloudUploadOutline } from 'ionicons/icons';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import KEY_GROUPS from '../fixtures/keyGroups.json';
import './GameStyles.css';

// Game Constants
const ROWS = 6;
const COLS = 18;
const LOOP_RATE = 16; // ~60 FPS
const BALL_MOVE_INTERVAL = 300; // Game Speed (Difficulty)

type Coordinate = [number, number];
type Brick = { r: number, c: number, active: boolean };

// --- 1. Pre-Calculate Mappings (Reused from Snake logic) ---
const VALID_GRID_CELLS: Coordinate[] = [];
const VIRTUAL_TO_ANCHOR = new Map<string, Coordinate>();

KEY_GROUPS.forEach(group => {
    group.keys.forEach((k: any) => {
        const width = k.width || 1;
        const height = k.height || 1;
        for (let r = k.row; r < k.row + height; r++) {
            for (let c = k.col; c < k.col + width; c++) {
                VALID_GRID_CELLS.push([r, c]);
                VIRTUAL_TO_ANCHOR.set(`${r}-${c}`, [k.row, k.col]);
            }
        }
    });
});

const getAnchor = (c: Coordinate): Coordinate => {
    return VIRTUAL_TO_ANCHOR.get(`${c[0]}-${c[1]}`) || c;
};

// --- Game State Initializers ---
const INITIAL_PADDLE_WIDTH = 4;
const INITIAL_PADDLE_ROW = 0; // Top Row (Inverted)
const INITIAL_PADDLE_COL = Math.floor(COLS / 2) - 1;

const INITIAL_BALL_POS: Coordinate = [1, Math.floor(COLS / 2)]; // Just below paddle
const INITIAL_BALL_VEL: Coordinate = [1, 1]; // Down-Right

// Bricks on bottom 2 rows (Rows 4 and 5)
const INITIAL_BRICKS: Brick[] = [];
for (let r = 4; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        // Only place bricks on valid keys
        if (VALID_GRID_CELLS.some(cell => cell[0] === r && cell[1] === c)) {
            INITIAL_BRICKS.push({ r, c, active: true });
        }
    }
}

const Breakout: React.FC = () => {
    // State
    const [paddleCol, setPaddleCol] = useState(INITIAL_PADDLE_COL);
    const [ballPos, setBallPos] = useState<Coordinate>(INITIAL_BALL_POS);
    const [bricks, setBricks] = useState<Brick[]>(INITIAL_BRICKS);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true); // Default ON, but no backend logic yet
    const [fps, setFps] = useState(0);

    // Refs for Game Loop
    const ballPosRef = useRef<Coordinate>(INITIAL_BALL_POS);
    const ballVelRef = useRef<Coordinate>(INITIAL_BALL_VEL);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const frameCountRef = useRef(0);
    const lastFpsUpdateRef = useRef(Date.now());
    const lastBallMoveRef = useRef(Date.now());

    // Initialize Socket
    useEffect(() => {
        const socket = io(API_BASE_URL, {
            transports: ['websocket'], // Force WebSocket
            upgrade: false
        });
        socketRef.current = socket;
        return () => { socket.disconnect(); };
    }, []);

    // FPS Counter
    useEffect(() => {
        const fpsInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastFpsUpdateRef.current;
            if (elapsed >= 1000) {
                setFps(Math.round((frameCountRef.current * 1000) / elapsed));
                frameCountRef.current = 0;
                lastFpsUpdateRef.current = now;
            }
        }, 1000);
        return () => clearInterval(fpsInterval);
    }, []);

    // Helper to emit state
    const emitState = (pCol: number, bPos: Coordinate, activeBricks: Brick[], playing: boolean, over: boolean) => {
        frameCountRef.current++; // Count frames sent
        if (isSyncing && socketRef.current) {
            const translatedBricks = activeBricks.map(b => ({ ...b, ...getAnchor([b.r, b.c]) }));
            socketRef.current.emit('breakout:frame', {
                paddleCol: pCol,
                ballPos: getAnchor(bPos),
                bricks: translatedBricks,
                isPlaying: playing,
                gameOver: over
            });
        }
    };

    // Handle Input (Paddle Movement)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying && !gameOver && !gameWon) {
                if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    setIsPlaying(true);
                }
            }

            if (!isPlaying) return;

            let newCol = paddleCol;
            if (e.key === 'ArrowLeft') {
                newCol = Math.max(0, paddleCol - 1);
            } else if (e.key === 'ArrowRight') {
                newCol = Math.min(COLS - INITIAL_PADDLE_WIDTH, paddleCol + 1);
            }

            if (newCol !== paddleCol) {
                setPaddleCol(newCol);
                // Emit IMMEDIATELY for responsiveness
                emitState(newCol, ballPos, bricks.filter(b => b.active), true, false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver, gameWon, paddleCol, ballPos, bricks, isSyncing]);

    // Game Loop
    const tick = useCallback(() => {
        if (gameOver || gameWon) return;

        const now = Date.now();

        // --- BALL LOGIC (Gated by Time) ---
        if (now - lastBallMoveRef.current >= BALL_MOVE_INTERVAL) {
            lastBallMoveRef.current = now;

            // 1. Calculate New Ball Position
            const [br, bc] = ballPosRef.current;
            const [vr, vc] = ballVelRef.current;
            let nextR = br + vr;
            let nextC = bc + vc;

            // 2. Wall Collisions (Left/Right)
            if (nextC < 0 || nextC >= COLS) {
                ballVelRef.current[1] *= -1; // Bounce Horizontal
                nextC = bc + ballVelRef.current[1];
            }

            // 3. Ceiling Collision (Bottom of screen in this inverted mode)
            if (nextR >= ROWS) {
                ballVelRef.current[0] *= -1; // Bounce Vertical
                nextR = br + ballVelRef.current[0];
            }

            // 4. Paddle Collision (Row 0)
            if (nextR <= 0) {
                // Check if within paddle range
                const hitPaddle =
                    (nextC >= paddleCol && nextC < paddleCol + INITIAL_PADDLE_WIDTH) ||
                    (bc >= paddleCol && bc < paddleCol + INITIAL_PADDLE_WIDTH);

                if (hitPaddle) {
                    ballVelRef.current[0] *= -1; // Bounce Vertical
                    nextR = br + ballVelRef.current[0]; // Push back down
                } else {
                    // Missed Paddle!
                    setGameOver(true);
                    setIsPlaying(false);
                    // EMIT GAME OVER STATE
                    emitState(paddleCol, [nextR, nextC], bricks.filter(b => b.active), false, true);
                    return;
                }
            }

            // 5. Brick Collision
            const hitBrickIndex = bricks.findIndex(b => b.active && b.r === nextR && b.c === nextC);
            if (hitBrickIndex !== -1) {
                const newBricks = [...bricks];
                newBricks[hitBrickIndex].active = false;
                setBricks(newBricks);
                ballVelRef.current[0] *= -1;
                nextR = br + ballVelRef.current[0];
                if (newBricks.filter(b => b.active).length === 0) {
                    setGameWon(true);
                    setIsPlaying(false);
                    // EMIT WIN STATE
                    emitState(paddleCol, [nextR, nextC], [], false, false); // Won is not GameOver in this struct, but isPlaying is false
                }
            }

            // Update Refs and State
            ballPosRef.current = [nextR, nextC];
            setBallPos([nextR, nextC]);
        }

        // Always emit on loop to maintain high FPS stream
        // Only emit if still playing (Game Over/Win handled above)
        if (isPlaying && !gameOver && !gameWon) {
            emitState(paddleCol, ballPosRef.current, bricks.filter(b => b.active), true, false);
        }

    }, [bricks, gameOver, gameWon, paddleCol, isSyncing, isPlaying]);

    useEffect(() => {
        if (isPlaying && !gameOver && !gameWon) {
            gameLoopRef.current = setInterval(tick, LOOP_RATE);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
        return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
    }, [isPlaying, gameOver, gameWon, tick]);

    useIonViewWillLeave(() => {
        setIsPlaying(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);

        // Send cleanup frame
        emitState(paddleCol, ballPosRef.current, [], false, false);
    });

    const startGame = () => {
        setPaddleCol(INITIAL_PADDLE_COL);
        setBallPos(INITIAL_BALL_POS);
        ballPosRef.current = INITIAL_BALL_POS;
        ballVelRef.current = INITIAL_BALL_VEL;

        // Reset Bricks
        const resetBricks = INITIAL_BRICKS.map(b => ({ ...b, active: true }));
        setBricks(resetBricks);

        setGameOver(false);
        setGameWon(false);
        setIsPlaying(true);
    };

    const toggleSync = () => {
        const newSync = !isSyncing;
        setIsSyncing(newSync);

        // If turning OFF, send one last frame to clear backend state
        if (!newSync && socketRef.current) {
            socketRef.current.emit('breakout:frame', {
                paddleCol: paddleCol,
                ballPos: getAnchor(ballPosRef.current),
                bricks: [],
                isPlaying: false,
                gameOver: false
            });
        }
    };

    const getCellClass = (r: number, c: number) => {
        // Paddle
        if (r === INITIAL_PADDLE_ROW && c >= paddleCol && c < paddleCol + INITIAL_PADDLE_WIDTH) {
            return 'game-cell cell-green'; // Reusing Green color
        }
        // Ball
        if (r === ballPos[0] && c === ballPos[1]) {
            return 'game-cell cell-red'; // Reusing Red color
        }
        // Bricks
        const brick = bricks.find(b => b.r === r && b.c === c);
        if (brick && brick.active) {
            return 'game-cell cell-blue'; // Reusing Blue color
        }
        return 'game-cell';
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Breakout (Inverted)</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={toggleSync} color={isSyncing ? 'success' : 'medium'}>
                            <IonIcon slot="icon-only" icon={cloudUploadOutline} />
                        </IonButton>
                        <IonButton onClick={startGame}>
                            <IonIcon slot="icon-only" icon={gameOver || gameWon ? refresh : play} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding game-page-content">
                <div className="game-container">
                    <div className="game-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`
                    }}>
                        {Array.from({ length: ROWS }).map((_, r) => (
                            Array.from({ length: COLS }).map((_, c) => (
                                <div key={`${r}-${c}`} className={getCellClass(r, c)} />
                            ))
                        ))}
                    </div>

                    {!isPlaying && !gameOver && !gameWon && (
                        <div className="game-overlay" onClick={() => setIsPlaying(true)} style={{ cursor: 'pointer' }}>
                            <h2>Click or Press Arrow Key to Start</h2>
                            <IonButton onClick={() => setIsPlaying(true)}>Start Game</IonButton>
                        </div>
                    )}

                    {gameOver && (
                        <div className="game-overlay">
                            <h2>Game Over</h2>
                            <IonButton onClick={startGame}>Try Again</IonButton>
                        </div>
                    )}

                    {gameWon && (
                        <div className="game-overlay">
                            <h2>You Win!</h2>
                            <IonButton onClick={startGame}>Play Again</IonButton>
                        </div>
                    )}

                    <div className="controls-hint">
                        <p>Use Left/Right Arrows to Move Paddle</p>
                        <p>Sync Status: {isSyncing ? 'ON' : 'OFF'} | FPS: {fps}</p>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Breakout;
