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
import KEY_GROUPS from '../fixtures/keyGroups.json'; // Import Fixture
import './Snake.css';

// Game Constants
const ROWS = 6;
const COLS = 22;
const SPEED = 200;

type Coordinate = [number, number];
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// --- 1. Pre-Calculate Valid Spawn Points ---
// We flatten the key groups into a list of [row, col] pairs that actually have keys.
const VALID_COORDS: Coordinate[] = [];
KEY_GROUPS.forEach(group => {
    group.keys.forEach(k => {
        VALID_COORDS.push([k.row, k.col]);
    });
});

// Helper to check if a coordinate is in the valid list (for movement validation if we wanted strict mode)
// For now, we only strictly enforce FOOD spawning. Snake can move through empty space (void).

const INITIAL_SNAKE: Coordinate[] = [
    [3, 5],
    [3, 4],
    [3, 3]
];
// Ensure initial food is valid
const INITIAL_FOOD: Coordinate = VALID_COORDS.find(c => c[0] === 3 && c[1] === 15) || VALID_COORDS[Math.floor(Math.random() * VALID_COORDS.length)];

const INITIAL_DIRECTION: Direction = 'RIGHT';

const Snake: React.FC = () => {
    const [snake, setSnake] = useState<Coordinate[]>(INITIAL_SNAKE);
    const [food, setFood] = useState<Coordinate>(INITIAL_FOOD);
    const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);

    const socketRef = useRef<Socket | null>(null);
    const directionRef = useRef<Direction>(INITIAL_DIRECTION);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Socket
    useEffect(() => {
        const socket = io(API_BASE_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Snake] Connected to backend socket');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying && !gameOver) {
                const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                if (validKeys.includes(e.key)) {
                    setIsPlaying(true);
                } else {
                    return;
                }
            }

            if (!isPlaying) return;

            switch (e.key) {
                case 'ArrowUp':
                    if (directionRef.current !== 'DOWN') directionRef.current = 'UP';
                    break;
                case 'ArrowDown':
                    if (directionRef.current !== 'UP') directionRef.current = 'DOWN';
                    break;
                case 'ArrowLeft':
                    if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
                    break;
                case 'ArrowRight':
                    if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver]);

    // Game Loop
    const moveSnake = useCallback(() => {
        if (gameOver) return;

        setSnake(prevSnake => {
            const head = prevSnake[0];
            const newHead: Coordinate = [...head];
            const currentDir = directionRef.current;
            setDirection(currentDir); 

            switch (currentDir) {
                case 'UP': newHead[0] -= 1; break;
                case 'DOWN': newHead[0] += 1; break;
                case 'LEFT': newHead[1] -= 1; break;
                case 'RIGHT': newHead[1] += 1; break;
            }

            // Check Wall Collision (Grid Boundaries)
            if (
                newHead[0] < 0 || newHead[0] >= ROWS ||
                newHead[1] < 0 || newHead[1] >= COLS
            ) {
                setGameOver(true);
                setIsPlaying(false);
                if (isSyncing && socketRef.current) {
                    socketRef.current.emit('snake:frame', {
                        snake: prevSnake,
                        food: food,
                        isPlaying: false,
                        gameOver: true
                    });
                }
                return prevSnake;
            }

            // Check Self Collision
            if (prevSnake.some(segment => segment[0] === newHead[0] && segment[1] === newHead[1])) {
                setGameOver(true);
                setIsPlaying(false);
                if (isSyncing && socketRef.current) {
                    socketRef.current.emit('snake:frame', {
                        snake: prevSnake,
                        food: food,
                        isPlaying: false,
                        gameOver: true
                    });
                }
                return prevSnake;
            }

            const newSnake = [newHead, ...prevSnake];

            // Check Food Collision
            if (newHead[0] === food[0] && newHead[1] === food[1]) {
                // Generate new food ONLY on Valid Keys
                let newFood: Coordinate;
                let attempts = 0;
                do {
                    // Pick random index from valid list
                    const idx = Math.floor(Math.random() * VALID_COORDS.length);
                    newFood = VALID_COORDS[idx];
                    attempts++;
                } while (
                    newSnake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1]) && 
                    attempts < 100
                );
                setFood(newFood);
            } else {
                newSnake.pop(); 
            }

            if (isSyncing && socketRef.current) {
                socketRef.current.emit('snake:frame', {
                    snake: newSnake,
                    food: food,
                    isPlaying: true,
                    gameOver: false
                });
            }

            return newSnake;
        });
    }, [food, gameOver, isSyncing]);

    useEffect(() => {
        if (isPlaying && !gameOver) {
            gameLoopRef.current = setInterval(moveSnake, SPEED);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [isPlaying, gameOver, moveSnake]);

    useIonViewWillLeave(() => {
        setIsPlaying(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    });

    const startGame = () => {
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD); // Will be valid
        setDirection(INITIAL_DIRECTION);
        directionRef.current = INITIAL_DIRECTION;
        setGameOver(false);
        setIsPlaying(true);
    };

    const toggleSync = () => {
        setIsSyncing(!isSyncing);
    };

    const getCellClass = (r: number, c: number) => {
        const isHead = snake[0][0] === r && snake[0][1] === c;
        const isBody = snake.some((s, i) => i !== 0 && s[0] === r && s[1] === c);
        const isFood = food[0] === r && food[1] === c;

        // Optional: Add visual indicator for "Void" cells in UI?
        // For now, keep grid simple.

        if (isHead) return 'snake-cell snake-head';
        if (isBody) return 'snake-cell snake-body';
        if (isFood) return 'snake-cell snake-food';
        return 'snake-cell';
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Snake</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={toggleSync} color={isSyncing ? 'success' : 'medium'}>
                            <IonIcon slot="icon-only" icon={cloudUploadOutline} />
                        </IonButton>
                        <IonButton onClick={startGame}>
                            <IonIcon slot="icon-only" icon={gameOver ? refresh : play} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding snake-content">
                <div className="game-container">
                    <div className="game-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        gap: '2px'
                    }}>
                        {Array.from({ length: ROWS }).map((_, r) => (
                            Array.from({ length: COLS }).map((_, c) => (
                                <div key={`${r}-${c}`} className={getCellClass(r, c)} />
                            ))
                        ))}
                    </div>

                    {!isPlaying && !gameOver && (
                        <div className="game-over-overlay" onClick={() => setIsPlaying(true)} style={{ cursor: 'pointer' }}>
                            <h2>Click or Press Arrow Key to Start</h2>
                            <IonButton onClick={() => setIsPlaying(true)}>Start Game</IonButton>
                        </div>
                    )}

                    {gameOver && (
                        <div className="game-over-overlay">
                            <h2>Game Over</h2>
                            <IonButton onClick={startGame}>Try Again</IonButton>
                        </div>
                    )}

                    <div className="controls-hint">
                        <p>Use Arrow Keys to Move</p>
                        <p>Sync Status: {isSyncing ? 'ON' : 'OFF'}</p>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Snake;