import { useCallback } from 'react';
import type { Player, Obstacle, DashTalisman } from '../types/dashGame';

export function useDashCollision() {
  // AABB collision for obstacles
  const checkObstacleCollision = useCallback(
    (player: Player, obstacles: Obstacle[]): boolean => {
      // Smaller hitbox for more forgiving collision
      const hitboxPadding = 5;
      const px = player.x + hitboxPadding;
      const py = player.y + hitboxPadding;
      const pw = player.width - hitboxPadding * 2;
      const ph = player.height - hitboxPadding * 2;

      for (const obstacle of obstacles) {
        if (
          px < obstacle.x + obstacle.width &&
          px + pw > obstacle.x &&
          py < obstacle.y + obstacle.height &&
          py + ph > obstacle.y
        ) {
          return true; // Collision detected
        }
      }
      return false;
    },
    []
  );

  // Circle collision for talismans
  const checkTalismanCollision = useCallback(
    (player: Player, talismans: DashTalisman[]): number[] => {
      const collectedIds: number[] = [];
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      for (const talisman of talismans) {
        if (talisman.collected) continue;

        const dx = playerCenterX - talisman.x;
        const dy = playerCenterY - talisman.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Generous pickup radius
        if (distance < talisman.radius + player.width / 2 + 10) {
          collectedIds.push(talisman.id);
        }
      }
      return collectedIds;
    },
    []
  );

  return { checkObstacleCollision, checkTalismanCollision };
}
