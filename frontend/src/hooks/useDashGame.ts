import { useState, useEffect, useRef, useCallback } from 'react';
import type { DashGameState, Player, Obstacle, DashTalisman } from '../types/dashGame';
import {
  CANVAS_WIDTH,
  PLAYER_START_X,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  GROUND_Y,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  MIN_OBSTACLE_GAP,
  MAX_OBSTACLE_GAP,
  TALISMAN_SPAWN_CHANCE,
  SPIKE_WIDTH,
  SPIKE_HEIGHT,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  TALISMAN_RADIUS,
  TALISMAN_FLOAT_HEIGHT,
} from '../constants/dashGame';
import { useDashInput } from './useDashInput';
import { useDashPhysics } from './useDashPhysics';
import { useDashCollision } from './useDashCollision';

function createInitialPlayer(): Player {
  return {
    x: PLAYER_START_X,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
    isGrounded: true,
  };
}

function createInitialState(): DashGameState {
  return {
    isRunning: false,
    isGameOver: false,
    isCountingDown: false,
    countdown: 0,
    player: createInitialPlayer(),
    obstacles: [],
    talismans: [],
    distance: 0,
    talismansCollected: 0,
    speed: BASE_SPEED,
    groundOffset: 0,
  };
}

let obstacleId = 0;
let talismanId = 0;

function createObstacle(lastObstacleX: number): Obstacle {
  const type = Math.random() > 0.5 ? 'spike' : 'block';
  const width = type === 'spike' ? SPIKE_WIDTH : BLOCK_WIDTH;
  const height = type === 'spike' ? SPIKE_HEIGHT : BLOCK_HEIGHT;

  return {
    id: obstacleId++,
    x: lastObstacleX + MIN_OBSTACLE_GAP + Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP),
    y: GROUND_Y - height,
    width,
    height,
    type,
    passed: false,
  };
}

function createTalisman(): DashTalisman {
  return {
    id: talismanId++,
    x: CANVAS_WIDTH + 50,
    y: GROUND_Y - TALISMAN_FLOAT_HEIGHT - Math.random() * 80,
    radius: TALISMAN_RADIUS,
    collected: false,
    hue: 260 + Math.random() * 40 - 20, // Purple range
  };
}

export function useDashGame(isSessionActive: boolean) {
  const [gameState, setGameState] = useState<DashGameState>(createInitialState());
  const { isJumpPressed } = useDashInput(gameState.isRunning || gameState.isGameOver);
  const { updatePlayer } = useDashPhysics();
  const { checkObstacleCollision, checkTalismanCollision } = useDashCollision();

  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastJumpPressedRef = useRef(false);

  // Start game when session becomes active
  useEffect(() => {
    if (isSessionActive && !gameState.isRunning && !gameState.isGameOver) {
      startGame();
    }
  }, [isSessionActive]);

  // Reset when session ends
  useEffect(() => {
    if (!isSessionActive) {
      resetGame();
    }
  }, [isSessionActive]);

  const startGame = useCallback(() => {
    obstacleId = 0;
    talismanId = 0;
    setGameState({
      ...createInitialState(),
      isCountingDown: true,
      countdown: 3,
      obstacles: [createObstacle(CANVAS_WIDTH)],
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  const restartGame = useCallback(() => {
    if (gameState.isGameOver && isSessionActive) {
      startGame();
    }
  }, [gameState.isGameOver, isSessionActive, startGame]);

  // Track jump press for edge detection (but don't auto-restart)
  useEffect(() => {
    lastJumpPressedRef.current = isJumpPressed;
  }, [isJumpPressed]);

  // Countdown timer effect
  useEffect(() => {
    if (!gameState.isCountingDown || gameState.countdown <= 0) return;

    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (prev.countdown <= 1) {
          // Countdown finished, start the game
          return { ...prev, isCountingDown: false, countdown: 0, isRunning: true };
        }
        // Decrement countdown
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState.isCountingDown, gameState.countdown]);

  // Main game loop
  useEffect(() => {
    if (!gameState.isRunning) return;

    const gameLoop = () => {
      setGameState((state) => {
        if (!state.isRunning) return state;

        // Update player physics
        const newPlayer = updatePlayer(state.player, isJumpPressed);

        // Move obstacles and remove off-screen ones
        let newObstacles = state.obstacles
          .map((obs) => ({ ...obs, x: obs.x - state.speed }))
          .filter((obs) => obs.x > -100);

        // Spawn new obstacles
        const lastObstacle = newObstacles[newObstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - 100) {
          const spawnX = lastObstacle ? lastObstacle.x + lastObstacle.width : CANVAS_WIDTH;
          newObstacles.push(createObstacle(spawnX));
        }

        // Move talismans and remove off-screen/collected ones
        let newTalismans = state.talismans
          .map((t) => ({ ...t, x: t.x - state.speed }))
          .filter((t) => t.x > -50 && !t.collected);

        // Spawn new talismans randomly
        if (Math.random() < TALISMAN_SPAWN_CHANCE && newTalismans.length < 3) {
          newTalismans.push(createTalisman());
        }

        // Check obstacle collision (game over)
        if (checkObstacleCollision(newPlayer, newObstacles)) {
          return {
            ...state,
            player: newPlayer,
            isRunning: false,
            isGameOver: true,
          };
        }

        // Check talisman collection
        const collectedIds = checkTalismanCollision(newPlayer, newTalismans);
        if (collectedIds.length > 0) {
          newTalismans = newTalismans.map((t) =>
            collectedIds.includes(t.id) ? { ...t, collected: true } : t
          );
        }

        // Update speed and distance
        const newSpeed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED);
        const newDistance = state.distance + state.speed / 10;
        const newGroundOffset = (state.groundOffset + state.speed) % 100;

        return {
          ...state,
          player: newPlayer,
          obstacles: newObstacles,
          talismans: newTalismans,
          speed: newSpeed,
          distance: newDistance,
          groundOffset: newGroundOffset,
          talismansCollected: state.talismansCollected + collectedIds.length,
        };
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isRunning, isJumpPressed, updatePlayer, checkObstacleCollision, checkTalismanCollision]);

  return {
    gameState,
    startGame,
    resetGame,
    restartGame,
  };
}
