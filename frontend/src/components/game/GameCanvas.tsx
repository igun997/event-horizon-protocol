import { useRef, useEffect, useState, useCallback } from 'react';
import {
  type TalismanPosition,
  generateTalismanPositions,
  isNearTalisman,
  drawGlitchBackground,
  drawHiddenTalisman,
  drawRevealedTalisman,
  drawGlitchOverlay,
} from '../../utils/canvas';

interface GameCanvasProps {
  isActive: boolean;
  onTalismanFound: (count: number) => void;
}

export function GameCanvas({ isActive, onTalismanFound }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [talismans, setTalismans] = useState<TalismanPosition[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize talismans when game starts
  useEffect(() => {
    if (isActive && talismans.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const newTalismans = generateTalismanPositions(5, canvas.width, canvas.height);
        setTalismans(newTalismans);
        setFoundCount(0);
      }
    } else if (!isActive) {
      setTalismans([]);
      setFoundCount(0);
    }
  }, [isActive, talismans.length]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 0.016; // ~60fps

      // Draw background
      drawGlitchBackground(ctx, canvas, time);

      // Draw talismans
      talismans.forEach((talisman) => {
        if (talisman.found) {
          drawRevealedTalisman(ctx, talisman, time);
        } else {
          drawHiddenTalisman(ctx, talisman, time);
        }
      });

      // Add glitch overlay occasionally
      if (Math.random() > 0.95) {
        drawGlitchOverlay(ctx, canvas);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [talismans]);

  // Handle click/touch
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;

      if ('touches' in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // Check if clicked near any unfound talisman
      setTalismans((prev) => {
        let newFoundCount = foundCount;
        const updated = prev.map((talisman) => {
          if (!talisman.found && isNearTalisman(x, y, talisman)) {
            newFoundCount++;
            return { ...talisman, found: true };
          }
          return talisman;
        });

        if (newFoundCount !== foundCount) {
          setFoundCount(newFoundCount);
          onTalismanFound(newFoundCount);
        }

        return updated;
      });
    },
    [isActive, foundCount, onTalismanFound]
  );

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-xl shadow-purple-500/10">
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
      />

      {/* Overlay when not active */}
      {!isActive && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="text-lg text-purple-300 font-medium">Start a session to play</p>
            <p className="text-sm text-gray-500 mt-2">Find the hidden talismans in the glitch</p>
          </div>
        </div>
      )}

      {/* Found counter */}
      {isActive && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-purple-500/30">
          <span className="text-sm font-medium text-purple-300">
            Found: {foundCount} / {talismans.length}
          </span>
        </div>
      )}
    </div>
  );
}
