import { useRef, useEffect } from 'react';
import { useDashGame } from '../../hooks/useDashGame';
import {
  drawGlitchBackground,
  drawScrollingGround,
  drawPlayer,
  drawObstacle,
  drawRunnerTalisman,
  drawScoreHUD,
  drawGlitchOverlay,
  drawCountdown,
} from '../../utils/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../constants/dashGame';

interface DashGameCanvasProps {
  isActive: boolean;
  onScoreUpdate?: (distance: number, talismans: number) => void;
  onGameOver?: (distance: number, talismans: number) => void;
  triggerRestart?: boolean;
  onRestartComplete?: () => void;
}

export function DashGameCanvas({
  isActive,
  onScoreUpdate,
  onGameOver,
  triggerRestart,
  onRestartComplete,
}: DashGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  const { gameState, restartGame } = useDashGame(isActive);

  // Notify parent of score updates when game over
  useEffect(() => {
    if (gameState.isGameOver) {
      onScoreUpdate?.(gameState.distance, gameState.talismansCollected);
      onGameOver?.(gameState.distance, gameState.talismansCollected);
    }
  }, [gameState.isGameOver, gameState.distance, gameState.talismansCollected, onScoreUpdate, onGameOver]);

  // Handle external restart trigger
  useEffect(() => {
    if (triggerRestart) {
      restartGame();
      onRestartComplete?.();
    }
  }, [triggerRestart, restartGame, onRestartComplete]);

  // Handle canvas scaling to fill screen while maintaining aspect ratio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      const windowRatio = window.innerWidth / window.innerHeight;

      if (windowRatio > aspectRatio) {
        // Window is wider - fit to height
        canvas.style.height = '100vh';
        canvas.style.width = 'auto';
      } else {
        // Window is taller - fit to width
        canvas.style.width = '100vw';
        canvas.style.height = 'auto';
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render loop (separate from game logic)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw glitch background
      drawGlitchBackground(ctx, canvas, time);

      // Draw scrolling ground
      drawScrollingGround(ctx, canvas, gameState.groundOffset, time);

      // Draw obstacles
      gameState.obstacles.forEach((obstacle) => {
        drawObstacle(ctx, obstacle, time);
      });

      // Draw talismans
      gameState.talismans.forEach((talisman) => {
        if (!talisman.collected) {
          drawRunnerTalisman(ctx, talisman, time);
        }
      });

      // Draw player
      drawPlayer(ctx, gameState.player, time);

      // Draw HUD
      if (gameState.isRunning || gameState.isGameOver) {
        drawScoreHUD(ctx, gameState.distance, gameState.talismansCollected, gameState.speed);
      }

      // Draw countdown overlay
      if (gameState.isCountingDown && gameState.countdown > 0) {
        drawCountdown(ctx, canvas, gameState.countdown);
      }

      // Occasional glitch effect
      if (Math.random() > 0.97) {
        drawGlitchOverlay(ctx, canvas);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState]);

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-gray-950">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full"
      />

      {/* Jump instruction overlay - shows briefly when game starts */}
      {isActive && gameState.isRunning && gameState.distance < 50 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900/70 backdrop-blur-sm rounded-lg animate-pulse z-20">
          <p className="text-sm text-purple-300">Press SPACE or TAP to jump</p>
        </div>
      )}
    </div>
  );
}
