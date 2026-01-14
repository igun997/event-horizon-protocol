export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
  isGrounded: boolean;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block';
  passed: boolean;
}

export interface DashTalisman {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  hue: number;
}

export interface DashGameState {
  isRunning: boolean;
  isGameOver: boolean;
  isCountingDown: boolean;
  countdown: number;
  player: Player;
  obstacles: Obstacle[];
  talismans: DashTalisman[];
  distance: number;
  talismansCollected: number;
  speed: number;
  groundOffset: number;
}
