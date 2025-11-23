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
import './Pong.css';

// Game Constants
const ROWS = 6;
const COLS = 17; // Requested 17 columns
const GAME_SPEED = 400; // ms per frame

const Pong: React.FC = () => {
    // State
    const [ball, setBall] = useState<{ x: number, y: number, dx: number, dy: number }>({ x: 8, y: 3, dx: 1, dy: 1 });
    const [paddleTop, setPaddleTop] = useState<number>(7); // Center of top paddle (User)
    const [paddleBottom, setPaddleBottom] = useState<number>(7); // Center of bottom paddle (CPU)
    const [score, setScore] = useState<{ user: number, cpu: number }>({ user: 0, cpu: 0 });
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false); // Default off for now as requested

    const socketRef = useRef<Socket | null>(null);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Socket (Placeholder)
    // Initialize Socket
    useEffect(() => {
        const socket = io(API_BASE_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        socketRef.current = socket;
        return () => {
            socket.disconnect();
        };
    }, []);

    // Handle Input (User controls Top Paddle)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying && !gameOver) {
                if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    setIsPlaying(true);
                }
            }

            if (!isPlaying) return;

            if (e.key === 'ArrowLeft') {
                setPaddleTop(prev => Math.max(1, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setPaddleTop(prev => Math.min(COLS - 2, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, gameOver]);

    // Game Loop
    const updateGame = useCallback(() => {
        if (gameOver) return;

        // 1. Move Ball
        let newX = ball.x + ball.dx;
        let newY = ball.y + ball.dy;
        let newDx = ball.dx;
        let newDy = ball.dy;

        // Wall Collisions (Left/Right)
        if (newX <= 0 || newX >= COLS - 1) {
            newDx = -newDx;
            newX = ball.x + newDx; // Correct position immediately
        }

        // Paddle Collisions
        // Top Paddle (User) at Row 0
        if (newY === 0) {
            if (newX >= paddleTop - 1 && newX <= paddleTop + 1) {
                newDy = 1; // Bounce down
                newY = 1;
            } else {
                // Missed Top Paddle -> CPU Score
                setScore(prev => ({ ...prev, cpu: prev.cpu + 1 }));
                resetBall();
                return;
            }
        }

        // Bottom Paddle (CPU) at Row 5
        if (newY === ROWS - 1) {
            if (newX >= paddleBottom - 1 && newX <= paddleBottom + 1) {
                newDy = -1; // Bounce up
                newY = ROWS - 2;
            } else {
                // Missed Bottom Paddle -> User Score
                setScore(prev => ({ ...prev, user: prev.user + 1 }));
                resetBall();
                return;
            }
        }

        setBall({ x: newX, y: newY, dx: newDx, dy: newDy });

        // 2. CPU AI (Simple tracking)
        // Move towards ball x, but with some delay/error could be added later.
        // For now, perfect tracking with speed limit.
        setPaddleBottom(prev => {
            if (newX > prev) return Math.min(COLS - 2, prev + 1);
            if (newX < prev) return Math.max(1, prev - 1);
            return prev;
        });

        // 3. Check Game Over (First to 10)
        if (score.user >= 10 || score.cpu >= 10) {
            setGameOver(true);
            setIsPlaying(false);
            if (isSyncing && socketRef.current) {
                socketRef.current.emit('pong:frame', {
                    ball: { x: newX, y: newY },
                    paddleTop,
                    paddleBottom,
                    score,
                    isPlaying: false,
                    gameOver: true
                });
            }
            return;
        }

        // 4. Sync State
        if (isSyncing && socketRef.current) {
            socketRef.current.emit('pong:frame', {
                ball: { x: newX, y: newY },
                paddleTop,
                paddleBottom,
                score,
                isPlaying: true,
                gameOver: false
            });
        }

    }, [ball, gameOver, paddleTop, paddleBottom, score, isSyncing]);

    const resetBall = () => {
        setBall({ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), dx: Math.random() > 0.5 ? 1 : -1, dy: Math.random() > 0.5 ? 1 : -1 });
        // Optional: Pause briefly?
    };

    useEffect(() => {
        if (isPlaying && !gameOver) {
            gameLoopRef.current = setInterval(updateGame, GAME_SPEED);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [isPlaying, gameOver, updateGame]);

    useIonViewWillLeave(() => {
        setIsPlaying(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (socketRef.current) {
            socketRef.current.emit('pong:frame', {
                ball,
                paddleTop,
                paddleBottom,
                score,
                isPlaying: false,
                gameOver: false
            });
        }
    });

    const startGame = () => {
        setScore({ user: 0, cpu: 0 });
        setGameOver(false);
        setIsPlaying(true);
        resetBall();
    };

    const getCellClass = (r: number, c: number) => {
        // Ball
        if (r === ball.y && c === ball.x) return 'game-cell cell-red pulse-animation';

        // Top Paddle (User) - Row 0
        if (r === 0 && c >= paddleTop - 1 && c <= paddleTop + 1) return 'game-cell cell-green';

        // Bottom Paddle (CPU) - Row 5
        if (r === ROWS - 1 && c >= paddleBottom - 1 && c <= paddleBottom + 1) return 'game-cell cell-red';

        return 'game-cell';
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Pong</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={() => {
                            const newSync = !isSyncing;
                            setIsSyncing(newSync);
                            if (!newSync && socketRef.current) {
                                socketRef.current.emit('pong:frame', {
                                    ball,
                                    paddleTop,
                                    paddleBottom,
                                    score,
                                    isPlaying: false,
                                    gameOver: false
                                });
                            }
                        }} color={isSyncing ? 'success' : 'medium'}>
                            <IonIcon slot="icon-only" icon={cloudUploadOutline} />
                        </IonButton>
                        <IonButton onClick={startGame}>
                            <IonIcon slot="icon-only" icon={gameOver ? refresh : play} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding game-page-content">
                <div className="game-container">
                    <div className="score-board">
                        <span>User: {score.user}</span>
                        <span>CPU: {score.cpu}</span>
                    </div>

                    <div className="game-grid pong-grid">
                        {Array.from({ length: ROWS }).map((_, r) => (
                            Array.from({ length: COLS }).map((_, c) => (
                                <div key={`${r}-${c}`} className={getCellClass(r, c)} />
                            ))
                        ))}
                    </div>

                    {!isPlaying && !gameOver && (
                        <div className="game-overlay" onClick={() => setIsPlaying(true)}>
                            <h2>Press Arrow Keys to Start</h2>
                            <IonButton onClick={() => setIsPlaying(true)}>Start Game</IonButton>
                        </div>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Pong;
