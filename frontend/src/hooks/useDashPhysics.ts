import { useCallback } from 'react';
import type { Player } from '../types/dashGame';
import {
  GRAVITY,
  MAX_FALL_SPEED,
  JUMP_FORCE,
  GROUND_Y,
  PLAYER_HEIGHT,
} from '../constants/dashGame';

export function useDashPhysics() {
  const updatePlayer = useCallback(
    (player: Player, isJumpPressed: boolean): Player => {
      const newPlayer = { ...player };

      // Apply gravity
      newPlayer.velocityY = Math.min(newPlayer.velocityY + GRAVITY, MAX_FALL_SPEED);

      // Apply velocity
      newPlayer.y += newPlayer.velocityY;

      // Ground collision
      const groundLevel = GROUND_Y - PLAYER_HEIGHT;
      if (newPlayer.y >= groundLevel) {
        newPlayer.y = groundLevel;
        newPlayer.velocityY = 0;
        newPlayer.isGrounded = true;
        newPlayer.isJumping = false;
      } else {
        newPlayer.isGrounded = false;
      }

      // Jump input - only jump if grounded and not already jumping
      if (isJumpPressed && newPlayer.isGrounded && !newPlayer.isJumping) {
        newPlayer.velocityY = JUMP_FORCE;
        newPlayer.isJumping = true;
        newPlayer.isGrounded = false;
      }

      return newPlayer;
    },
    []
  );

  return { updatePlayer };
}
