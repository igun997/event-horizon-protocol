import { useState, useEffect, useCallback } from 'react';

export function useDashInput(isActive: boolean) {
  const [isJumpPressed, setIsJumpPressed] = useState(false);

  const handleJumpStart = useCallback(() => {
    setIsJumpPressed(true);
  }, []);

  const handleJumpEnd = useCallback(() => {
    setIsJumpPressed(false);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setIsJumpPressed(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleJumpStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        handleJumpEnd();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleJumpStart();
    };

    const handleTouchEnd = () => {
      handleJumpEnd();
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Only for canvas clicks
      if ((e.target as HTMLElement).tagName === 'CANVAS') {
        handleJumpStart();
      }
    };

    const handleMouseUp = () => {
      handleJumpEnd();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, handleJumpStart, handleJumpEnd]);

  return { isJumpPressed };
}
