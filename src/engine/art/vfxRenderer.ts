// ============================================================================
// BRUTE LEGENDS — Cel-Shaded Anime VFX Particle Texture Generator for Phaser 3
// ============================================================================

import type Phaser from 'phaser';

const INK = '#231917';

function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  if (scene.textures.exists(key)) return;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawFn(ctx, width, height);

  scene.textures.addCanvas(key, canvas);
}

/**
 * Registers all cel-shaded anime VFX particle textures inside a Phaser scene.
 * Safe to call repeatedly — skips textures that already exist.
 */
export function registerVfxTexturesInPhaser(scene: Phaser.Scene): void {
  // 1. vfx_spark — fiery 4-point anime impact spark
  createCanvasTexture(scene, 'vfx_spark', 48, 48, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const drawFourPoint = (r: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
      ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
      ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
      ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
      ctx.closePath();
    };

    drawFourPoint(21);
    ctx.fillStyle = '#fb923c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    drawFourPoint(14);
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    drawFourPoint(7.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  // 2. vfx_star — chunky cel-shaded 5-point comic crit/victory star
  createCanvasTexture(scene, 'vfx_star', 48, 48, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 20 : 9.5;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Inner bright highlight star
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 5, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.stroke();
  });

  // 3. vfx_slash — dramatic curved anime crescent slash
  createCanvasTexture(scene, 'vfx_slash', 96, 96, (ctx, w, h) => {
    const cx = w * 0.36;
    const cy = h * 0.5;

    ctx.beginPath();
    ctx.arc(cx, cy, 42, -1.35, 1.35, false);
    ctx.arc(cx - 10, cy, 29, 1.22, -1.22, true);
    ctx.closePath();
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pure white speed core
    ctx.beginPath();
    ctx.arc(cx + 2, cy, 38, -1.12, 1.12, false);
    ctx.arc(cx - 5, cy, 31, 1.0, -1.0, true);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  // 4. vfx_ring — bold cel-shaded impact shockwave ring
  createCanvasTexture(scene, 'vfx_ring', 96, 96, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(35, 25, 23, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 41, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 5. vfx_coin — glossy cel-shaded gold coin for clicker & rewards
  createCanvasTexture(scene, 'vfx_coin', 40, 40, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Outer gold disc
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Inner bright face
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Embossed diamond emblem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6.5);
    ctx.lineTo(cx + 4.5, cy);
    ctx.lineTo(cx, cy + 6.5);
    ctx.lineTo(cx - 4.5, cy);
    ctx.closePath();
    ctx.fill();

    // Specular shine dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 6. vfx_heart — vibrant anime healing heart
  createCanvasTexture(scene, 'vfx_heart', 44, 44, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2 + 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy + 14);
    ctx.bezierCurveTo(cx - 18, cy + 2, cx - 18, cy - 14, cx - 7, cy - 14);
    ctx.bezierCurveTo(cx - 2, cy - 14, cx, cy - 9, cx, cy - 7);
    ctx.bezierCurveTo(cx, cy - 9, cx + 2, cy - 14, cx + 7, cy - 14);
    ctx.bezierCurveTo(cx + 18, cy - 14, cx + 18, cy + 2, cx, cy + 14);
    ctx.closePath();

    ctx.fillStyle = '#22c55e';
    ctx.fill();

    // Cel highlight
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 7, 4.5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.stroke();
  });

  // 7. vfx_dust — fluffy cel-shaded comic smoke puff
  createCanvasTexture(scene, 'vfx_dust', 48, 48, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2 + 2;

    ctx.fillStyle = '#f5f0e6';
    ctx.strokeStyle = 'rgba(35, 25, 23, 0.55)';
    ctx.lineWidth = 2.4;

    ctx.beginPath();
    ctx.arc(cx - 8, cy + 2, 9, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy + 2, 8.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Clean interior cover so overlapping circles read as one crisp cloud
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.arc(cx - 7, cy + 1, 7.2, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy + 1, 6.8, 0, Math.PI * 2);
    ctx.arc(cx, cy - 3.5, 9.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 8. vfx_shield — radiant cel-shaded defensive block emblem
  createCanvasTexture(scene, 'vfx_shield', 56, 56, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx + 18, cy - 14);
    ctx.quadraticCurveTo(cx + 18, cy + 8, cx, cy + 22);
    ctx.quadraticCurveTo(cx - 18, cy + 8, cx - 18, cy - 14);
    ctx.closePath();

    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Right-half cel highlight
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(cx, cy - 24, 22, 48);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 12);
    ctx.lineTo(cx + 14, cy - 22);
    ctx.lineTo(cx + 14, cy - 14);
    ctx.lineTo(cx - 14, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}
