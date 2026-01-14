export interface TalismanPosition {
  x: number;
  y: number;
  radius: number;
  found: boolean;
  hue: number;
  id: number;
}

export function generateTalismanPositions(
  count: number,
  canvasWidth: number,
  canvasHeight: number
): TalismanPosition[] {
  const positions: TalismanPosition[] = [];
  const baseHue = 260; // Purple theme
  const padding = 60;

  for (let i = 0; i < count; i++) {
    positions.push({
      id: i,
      x: padding + Math.random() * (canvasWidth - padding * 2),
      y: padding + Math.random() * (canvasHeight - padding * 2),
      radius: 25 + Math.random() * 15,
      found: false,
      hue: baseHue + Math.random() * 30 - 15,
    });
  }

  return positions;
}

export function isNearTalisman(
  clickX: number,
  clickY: number,
  talisman: TalismanPosition,
  tolerance = 1.5
): boolean {
  const dx = clickX - talisman.x;
  const dy = clickY - talisman.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= talisman.radius * tolerance;
}

export function drawGlitchBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  time: number
) {
  const baseHue = 260;

  // Create gradient noise pattern
  for (let y = 0; y < canvas.height; y += 20) {
    const offset = Math.sin(time * 2 + y * 0.01) * 3;
    const hue = baseHue + Math.sin(y * 0.02 + time) * 20;
    const lightness = 12 + Math.random() * 5;

    ctx.fillStyle = `hsl(${hue}, 30%, ${lightness}%)`;
    ctx.fillRect(offset, y, canvas.width + 10, 20);
  }

  // Scanline effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  // Occasional color bands
  if (Math.sin(time * 5) > 0.9) {
    const bandY = (Math.sin(time * 3) * 0.5 + 0.5) * canvas.height;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fillRect(0, bandY, canvas.width, 30);
  }
}

export function drawHiddenTalisman(
  ctx: CanvasRenderingContext2D,
  talisman: TalismanPosition,
  time: number
) {
  const pulse = Math.sin(time * 3 + talisman.x * 0.01) * 0.5 + 0.5;

  ctx.save();
  ctx.globalAlpha = 0.12 + pulse * 0.08;

  // Outer glow
  const gradient = ctx.createRadialGradient(
    talisman.x,
    talisman.y,
    0,
    talisman.x,
    talisman.y,
    talisman.radius * 1.5
  );
  gradient.addColorStop(0, `hsla(${talisman.hue}, 50%, 50%, 0.3)`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(
    talisman.x - talisman.radius * 2,
    talisman.y - talisman.radius * 2,
    talisman.radius * 4,
    talisman.radius * 4
  );

  // Main circle
  ctx.beginPath();
  ctx.arc(talisman.x, talisman.y, talisman.radius, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${talisman.hue}, 40%, 45%)`;
  ctx.fill();

  // Inner symbol
  ctx.strokeStyle = `hsl(${talisman.hue + 20}, 50%, 55%)`;
  ctx.lineWidth = 2;
  drawTalismanSymbol(ctx, talisman.x, talisman.y, talisman.radius * 0.5);

  ctx.restore();
}

export function drawRevealedTalisman(
  ctx: CanvasRenderingContext2D,
  talisman: TalismanPosition,
  time: number
) {
  const pulse = Math.sin(time * 4) * 0.2 + 1;

  ctx.save();

  // Bright glow
  const gradient = ctx.createRadialGradient(
    talisman.x,
    talisman.y,
    0,
    talisman.x,
    talisman.y,
    talisman.radius * 2 * pulse
  );
  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
  gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(
    talisman.x - talisman.radius * 3,
    talisman.y - talisman.radius * 3,
    talisman.radius * 6,
    talisman.radius * 6
  );

  // Main circle
  ctx.beginPath();
  ctx.arc(talisman.x, talisman.y, talisman.radius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${talisman.hue}, 70%, 60%)`;
  ctx.fill();

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner symbol
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  drawTalismanSymbol(ctx, talisman.x, talisman.y, talisman.radius * 0.6 * pulse);

  ctx.restore();
}

function drawTalismanSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.beginPath();

  // Draw a mystical star pattern
  const points = 6;
  for (let i = 0; i < points; i++) {
    const angle = (i * Math.PI * 2) / points - Math.PI / 2;
    const innerAngle = angle + Math.PI / points;

    const outerX = x + Math.cos(angle) * size;
    const outerY = y + Math.sin(angle) * size;
    const innerX = x + Math.cos(innerAngle) * (size * 0.4);
    const innerY = y + Math.sin(innerAngle) * (size * 0.4);

    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }

  ctx.closePath();
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGlitchOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  // Random RGB shift blocks
  const sliceHeight = Math.random() * 40 + 10;
  const sliceY = Math.random() * canvas.height;
  const offset = (Math.random() - 0.5) * 15;

  try {
    const imageData = ctx.getImageData(0, sliceY, canvas.width, sliceHeight);
    ctx.putImageData(imageData, offset, sliceY);
  } catch {
    // Ignore if getImageData fails
  }

  // Chromatic aberration effect
  if (Math.random() > 0.7) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 0, 100, 0.03)';
    ctx.fillRect(2, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 255, 200, 0.03)';
    ctx.fillRect(-2, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ============================================
// DASH GAME - Endless Runner Drawing Functions
// ============================================

import type { Player, Obstacle, DashTalisman } from '../types/dashGame';
import { GROUND_Y, GROUND_HEIGHT } from '../constants/dashGame';

export function drawScrollingGround(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  offset: number,
  _time: number
) {
  const baseHue = 260;

  // Ground base
  ctx.fillStyle = `hsl(${baseHue}, 40%, 15%)`;
  ctx.fillRect(0, GROUND_Y, canvas.width, GROUND_HEIGHT);

  // Ground top edge with glow
  const gradient = ctx.createLinearGradient(0, GROUND_Y - 5, 0, GROUND_Y + 10);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.5, `hsla(${baseHue}, 70%, 50%, 0.5)`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, GROUND_Y - 5, canvas.width, 15);

  // Scrolling grid lines
  ctx.strokeStyle = `hsla(${baseHue}, 50%, 30%, 0.5)`;
  ctx.lineWidth = 1;
  const gridSpacing = 50;

  for (let x = -offset % gridSpacing; x < canvas.width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = GROUND_Y + 20; y < canvas.height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number
) {
  ctx.save();

  const pulse = Math.sin(time * 8) * 0.1 + 1;
  const baseHue = 280;

  // Trail effect
  ctx.globalAlpha = 0.3;
  for (let i = 3; i > 0; i--) {
    const trailX = player.x - i * 8;
    const trailAlpha = 0.1 * (4 - i);
    ctx.fillStyle = `hsla(${baseHue}, 70%, 60%, ${trailAlpha})`;
    ctx.fillRect(trailX, player.y + 5, player.width - 5, player.height - 10);
  }
  ctx.globalAlpha = 1;

  // Glow effect
  const glowGradient = ctx.createRadialGradient(
    player.x + player.width / 2,
    player.y + player.height / 2,
    0,
    player.x + player.width / 2,
    player.y + player.height / 2,
    player.width * pulse
  );
  glowGradient.addColorStop(0, `hsla(${baseHue}, 80%, 60%, 0.4)`);
  glowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(
    player.x - player.width / 2,
    player.y - player.height / 2,
    player.width * 2,
    player.height * 2
  );

  // Main body
  ctx.fillStyle = `hsl(${baseHue}, 70%, 55%)`;

  // Body shape - rounded rectangle
  const radius = 8;
  ctx.beginPath();
  ctx.roundRect(player.x, player.y, player.width, player.height, radius);
  ctx.fill();

  // Border
  ctx.strokeStyle = `hsl(${baseHue}, 80%, 70%)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner details - eyes
  ctx.fillStyle = '#fff';
  const eyeY = player.y + 15;
  const eyeSize = 6;
  ctx.beginPath();
  ctx.arc(player.x + 12, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.arc(player.x + 28, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(player.x + 14, eyeY, 3, 0, Math.PI * 2);
  ctx.arc(player.x + 30, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Legs animation (when grounded and running)
  if (player.isGrounded) {
    const legOffset = Math.sin(time * 15) * 4;
    ctx.fillStyle = `hsl(${baseHue}, 60%, 45%)`;
    ctx.fillRect(player.x + 8, player.y + player.height - 2, 8, 6 + legOffset);
    ctx.fillRect(player.x + player.width - 16, player.y + player.height - 2, 8, 6 - legOffset);
  }

  ctx.restore();
}

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obstacle: Obstacle,
  time: number
) {
  ctx.save();

  const pulse = Math.sin(time * 6 + obstacle.x * 0.05) * 0.1 + 1;

  if (obstacle.type === 'spike') {
    // Spike obstacle - triangle
    const hue = 0; // Red

    // Glow with pulse
    ctx.shadowColor = `hsl(${hue}, 80%, 50%)`;
    ctx.shadowBlur = 15 * pulse;

    ctx.fillStyle = `hsl(${hue}, 70%, ${45 + pulse * 5}%)`;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
  } else {
    // Block obstacle
    const hue = 200; // Blue

    // Glow
    ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
    ctx.shadowBlur = 10;

    ctx.fillStyle = `hsl(${hue}, 50%, 30%)`;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    // Border
    ctx.strokeStyle = `hsl(${hue}, 60%, 50%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    // Inner pattern
    ctx.strokeStyle = `hsla(${hue}, 50%, 40%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.moveTo(obstacle.x + obstacle.width, obstacle.y);
    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function drawRunnerTalisman(
  ctx: CanvasRenderingContext2D,
  talisman: DashTalisman,
  time: number
) {
  ctx.save();

  // Floating animation
  const floatY = talisman.y + Math.sin(time * 4 + talisman.x * 0.02) * 8;
  const pulse = Math.sin(time * 5) * 0.15 + 1;
  const rotation = time * 2;

  // Glow
  const gradient = ctx.createRadialGradient(
    talisman.x,
    floatY,
    0,
    talisman.x,
    floatY,
    talisman.radius * 2.5 * pulse
  );
  gradient.addColorStop(0, `hsla(${talisman.hue}, 80%, 60%, 0.6)`);
  gradient.addColorStop(0.5, `hsla(${talisman.hue}, 70%, 50%, 0.2)`);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(
    talisman.x - talisman.radius * 3,
    floatY - talisman.radius * 3,
    talisman.radius * 6,
    talisman.radius * 6
  );

  // Main circle
  ctx.beginPath();
  ctx.arc(talisman.x, floatY, talisman.radius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${talisman.hue}, 70%, 55%)`;
  ctx.fill();

  // Border
  ctx.strokeStyle = `hsl(${talisman.hue}, 80%, 70%)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rotating star inside
  ctx.translate(talisman.x, floatY);
  ctx.rotate(rotation);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;

  const starSize = talisman.radius * 0.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * starSize, Math.sin(angle) * starSize);
  }
  ctx.stroke();

  ctx.restore();
}

export function drawGameOverScreen(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  distance: number,
  talismansCollected: number
) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Game over text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);

  // Stats
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText(`Distance: ${Math.floor(distance)}m`, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`Talismans: ${talismansCollected}`, canvas.width / 2, canvas.height / 2 + 35);

  // Restart hint
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Press SPACE or TAP to restart', canvas.width / 2, canvas.height / 2 + 90);
}

export function drawScoreHUD(
  ctx: CanvasRenderingContext2D,
  distance: number,
  talismans: number,
  speed: number
) {
  ctx.save();

  // Background for HUD
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 150, 70);

  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';

  // Distance
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.floor(distance)}m`, 20, 35);

  // Talismans
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`★ ${talismans}`, 20, 58);

  // Speed indicator
  ctx.fillStyle = '#a78bfa';
  const speedPercent = Math.floor((speed / 14) * 100);
  ctx.fillText(`${speedPercent}%`, 100, 35);

  ctx.restore();
}

export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  count: number
) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Countdown number
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(count.toString(), canvas.width / 2, canvas.height / 2);

  // "Get Ready!" text
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 80);
}
