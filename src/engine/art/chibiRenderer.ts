// ============================================================================
// BRUTE LEGENDS — Cel-Shaded Chibi Anime Multi-Layer Character & Dummy Renderer
// ============================================================================

import type {
  AccessoryVisualType,
  AnimationName,
  ArmorVisualType,
  BootsVisualType,
  EquippedGear,
  EyeStyle,
  FighterAppearance,
  GlovesVisualType,
  HairStyle,
  HelmetVisualType,
  WeaponVisualType,
} from '@shared/types';
import { SPRITE_FRAME_SIZE } from '@shared/constants';
import { sampleChibiPose, type ChibiPose } from './chibiRig';

const INK = '#231917';
const BASE_LINE_W = 3.2;

// ----------------------------------------------------------------------------
// Color Helpers for 2-Tone Cel Shading
// ----------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r || 0, g || 0, b || 0];
  }
  const n = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(n)) return [180, 180, 180];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    ((1 << 24) + (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b))
      .toString(16)
      .slice(1)
  );
}

/** Shifts a hex color darker (negative percent) or lighter (positive percent). */
function shadeColor(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  if (amount < 0) {
    const f = 1 + amount;
    // Slight warm-violet shift in shadow for lively anime cel shading
    return rgbToHex(r * f * 0.96, g * f * 0.92, b * f * 1.03);
  }
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// ----------------------------------------------------------------------------
// Resolved Equipment Visual Descriptor
// ----------------------------------------------------------------------------

interface ResolvedVisuals {
  weaponType: WeaponVisualType;
  weaponPrimary: string;
  weaponAccent: string;
  helmetType: HelmetVisualType;
  helmetPrimary: string;
  helmetAccent: string;
  armorType: ArmorVisualType;
  armorPrimary: string;
  armorAccent: string;
  glovesType: GlovesVisualType;
  glovesPrimary: string;
  glovesAccent: string;
  bootsType: BootsVisualType;
  bootsPrimary: string;
  bootsAccent: string;
  accessoryType: AccessoryVisualType;
  accessoryPrimary: string;
  accessoryAccent: string;
}

function resolveVisuals(
  appearance: FighterAppearance,
  equipped: EquippedGear
): ResolvedVisuals {
  const w = equipped.weapon;
  const h = equipped.helmet;
  const a = equipped.armor;
  const g = equipped.gloves;
  const b = equipped.boots;
  const acc = equipped.accessory;

  return {
    weaponType: (w?.visualType as WeaponVisualType) ?? 'fists',
    weaponPrimary: w?.primaryColor ?? '#cbd5e1',
    weaponAccent: w?.accentColor ?? '#f59e0b',

    helmetType: (h?.visualType as HelmetVisualType) ?? 'none',
    helmetPrimary: h?.primaryColor ?? appearance.outfitPrimary,
    helmetAccent: h?.accentColor ?? appearance.outfitSecondary,

    armorType: (a?.visualType as ArmorVisualType) ?? 'tunic',
    armorPrimary: a?.primaryColor ?? appearance.outfitPrimary,
    armorAccent: a?.accentColor ?? appearance.outfitSecondary,

    glovesType: (g?.visualType as GlovesVisualType) ?? 'none',
    glovesPrimary: g?.primaryColor ?? appearance.outfitSecondary,
    glovesAccent: g?.accentColor ?? '#f8fafc',

    bootsType: (b?.visualType as BootsVisualType) ?? 'sandals',
    bootsPrimary: b?.primaryColor ?? '#7c4a28',
    bootsAccent: b?.accentColor ?? appearance.outfitSecondary,

    accessoryType: (acc?.visualType as AccessoryVisualType) ?? 'none',
    accessoryPrimary: acc?.primaryColor ?? '#ef4444',
    accessoryAccent: acc?.accentColor ?? '#fbbf24',
  };
}

// ----------------------------------------------------------------------------
// Primitive Cel-Shading Helpers
// ----------------------------------------------------------------------------

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawFourPointSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outline = true
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.16, -size * 0.16, size, 0);
  ctx.quadraticCurveTo(size * 0.16, size * 0.16, 0, size);
  ctx.quadraticCurveTo(-size * 0.16, size * 0.16, -size, 0);
  ctx.quadraticCurveTo(-size * 0.16, -size * 0.16, 0, -size);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFivePointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 1: Ground Shadow, Energy Aura & Dodge Afterimage
// ----------------------------------------------------------------------------

function drawGroundShadow(ctx: CanvasRenderingContext2D, pose: ChibiPose): void {
  const heightLift = Math.max(0, -pose.offsetY);
  const scale = Math.max(0.48, 1 - heightLift / 70);
  const isDefeat = pose.expression === 'dizzy' && pose.bodyTilt < -1.0;
  const rx = (isDefeat ? 38 : 27) * scale;
  const ry = (isDefeat ? 8.5 : 7.2) * scale;
  const cx = 74 + pose.offsetX * 0.72 + (isDefeat ? -10 : 0);

  ctx.save();
  ctx.fillStyle = `rgba(35, 25, 23, ${0.26 * scale})`;
  ctx.beginPath();
  ctx.ellipse(cx, 138, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnergyAura(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  vis: ResolvedVisuals
): void {
  const hasSpirit = vis.accessoryType === 'spirit_aura';
  const alpha = Math.max(pose.auraAlpha, hasSpirit ? 0.45 : 0);
  if (alpha <= 0.02) return;

  const auraColor = pose.auraAlpha > 0.05 ? pose.auraColor : vis.accessoryPrimary;
  const auraCore = pose.auraAlpha > 0.05 ? '#fef9c3' : vis.accessoryAccent;
  const cx = 74 + pose.offsetX;
  const cy = 94 + pose.offsetY * 0.65;
  const phase = pose.framePhase * Math.PI * 2;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 0.85);

  // Outer radial glow
  const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 56);
  grad.addColorStop(0, rgba(auraCore, 0.75));
  grad.addColorStop(0.55, rgba(auraColor, 0.42));
  grad.addColorStop(1, rgba(auraColor, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 50, 58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cel-shaded spiky shonen ki flames rising upward
  ctx.beginPath();
  const spikes = 9;
  for (let i = 0; i <= spikes; i++) {
    const t = i / spikes;
    const angle = Math.PI + t * Math.PI; // bottom-left over top to bottom-right
    const wave = Math.sin(phase + i * 1.7) * 6;
    const outerR = (i % 2 === 1 ? 52 : 34) + wave;
    const px = cx + Math.cos(angle) * outerR * 0.84;
    const py = cy + 32 + Math.sin(angle) * outerR * 1.32;
    if (i === 0) ctx.moveTo(cx - 28, 136);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(cx + 28, 136);
  ctx.closePath();
  ctx.fillStyle = rgba(auraColor, 0.48);
  ctx.fill();
  ctx.strokeStyle = rgba(auraCore, 0.8);
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Rising energy orbs
  for (let i = 0; i < 5; i++) {
    const ox = cx + Math.sin(i * 2.1 + phase) * 32;
    const oy = 128 - ((i * 21 + pose.framePhase * 70) % 85);
    const or = 2.5 + (i % 3) * 1.3;
    ctx.fillStyle = auraCore;
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAfterimageGhosts(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  appearance: FighterAppearance
): void {
  if (pose.afterimageAlpha <= 0.02) return;
  const trailColor = pose.auraAlpha > 0.3 ? '#fbbf24' : '#38bdf8';

  for (let i = 2; i >= 1; i--) {
    const ghostAlpha = pose.afterimageAlpha * (i === 1 ? 0.36 : 0.18);
    const dx = pose.offsetX >= 0 ? -i * 14 : i * 14;
    const dy = i * 4;
    ctx.save();
    ctx.globalAlpha = ghostAlpha;
    ctx.translate(74 + pose.offsetX + dx, 136 + pose.offsetY + dy);
    ctx.scale(pose.squashX, pose.squashY);
    ctx.translate(0, -24);
    ctx.rotate(pose.bodyTilt * 0.8);

    ctx.fillStyle = trailColor;
    // Simplified chibi silhouette
    ctx.beginPath();
    ctx.ellipse(0, -45, 24, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    roundedRectPath(ctx, -13, -24, 26, 26, 9);
    ctx.fill();
    ctx.strokeStyle = rgba(appearance.outfitSecondary, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Layer 2: Back Accessories (Cape, Wings, Fox Tail, Scarf Tails)
// ----------------------------------------------------------------------------

function drawBackAccessory(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  vis: ResolvedVisuals
): void {
  const wave = Math.sin(pose.capeWave * Math.PI) * 7;
  const flutter = pose.capeWave * 8;

  switch (vis.accessoryType) {
    case 'hero_cape': {
      ctx.save();
      ctx.translate(-8, -21);
      // Inner shadow fold
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(-18 - flutter * 0.5, 16, -28 - flutter, 36 + wave * 0.5);
      ctx.lineTo(-4 - flutter * 0.3, 39 + wave * 0.3);
      ctx.quadraticCurveTo(6, 20, 12, 4);
      ctx.closePath();
      ctx.fillStyle = shadeColor(vis.accessoryPrimary, -0.32);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Main billowing cape body
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(-20 - flutter * 0.4, 14, -34 - flutter, 32 + wave);
      ctx.quadraticCurveTo(-22 - flutter * 0.6, 36 + wave * 0.5, -10 - flutter * 0.2, 34 + wave * 0.4);
      ctx.quadraticCurveTo(-2, 18, 8, 2);
      ctx.closePath();
      ctx.fillStyle = vis.accessoryPrimary;
      ctx.fill();
      // Gold trim along bottom
      ctx.strokeStyle = vis.accessoryAccent;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-31 - flutter, 29 + wave);
      ctx.quadraticCurveTo(-20 - flutter * 0.5, 33 + wave * 0.5, -11 - flutter * 0.2, 31 + wave * 0.4);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(-20 - flutter * 0.4, 14, -34 - flutter, 32 + wave);
      ctx.quadraticCurveTo(-22 - flutter * 0.6, 36 + wave * 0.5, -10 - flutter * 0.2, 34 + wave * 0.4);
      ctx.quadraticCurveTo(-2, 18, 8, 2);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'demon_wings': {
      const flap = Math.sin(pose.framePhase * Math.PI * 2) * 0.22 + pose.capeWave * 0.14;
      const drawWing = (side: -1 | 1) => {
        ctx.save();
        ctx.translate(side * 6, -18);
        ctx.scale(side, 1);
        ctx.rotate(-0.35 + flap);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(18, -22, 34, -14);
        ctx.quadraticCurveTo(26, -2, 30, 8);
        ctx.quadraticCurveTo(20, 4, 18, 14);
        ctx.quadraticCurveTo(10, 8, 6, 15);
        ctx.quadraticCurveTo(2, 6, 0, 4);
        ctx.closePath();
        ctx.fillStyle = vis.accessoryPrimary;
        ctx.fill();

        // Membrane cel highlight
        ctx.fillStyle = rgba(vis.accessoryAccent, 0.35);
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.quadraticCurveTo(16, -15, 28, -11);
        ctx.quadraticCurveTo(18, -3, 12, 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = INK;
        ctx.lineWidth = BASE_LINE_W;
        ctx.stroke();
        ctx.restore();
      };
      drawWing(-1);
      drawWing(1);
      break;
    }

    case 'fox_tail': {
      ctx.save();
      ctx.translate(-10, -2);
      ctx.rotate(-0.2 + wave * 0.03);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-18, 4, -36, -12, -30, -28);
      ctx.bezierCurveTo(-22, -34, -8, -24, -12, -10);
      ctx.quadraticCurveTo(-6, -4, 2, -2);
      ctx.closePath();
      ctx.fillStyle = vis.accessoryPrimary;
      ctx.fill();

      // Fluffy cream tip
      ctx.save();
      ctx.clip();
      ctx.fillStyle = vis.accessoryAccent;
      ctx.beginPath();
      ctx.arc(-28, -26, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'red_scarf': {
      ctx.save();
      ctx.translate(-8, -22);
      // Long trailing ninja scarf tails
      for (let t = 0; t < 2; t++) {
        const dy = t * 6;
        const wv = wave * (t === 0 ? 1 : 0.65);
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.quadraticCurveTo(-16 - flutter * 0.5, dy + 4 + wv * 0.4, -32 - flutter, dy + 10 + wv);
        ctx.lineTo(-27 - flutter, dy + 18 + wv);
        ctx.quadraticCurveTo(-14 - flutter * 0.4, dy + 11 + wv * 0.4, 2, dy + 6);
        ctx.closePath();
        ctx.fillStyle = t === 0 ? vis.accessoryPrimary : shadeColor(vis.accessoryPrimary, -0.2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = BASE_LINE_W - 0.3;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    default:
      break;
  }
}

// ----------------------------------------------------------------------------
// Layer 3: Legs & All 6 Boot Types
// ----------------------------------------------------------------------------

function drawLegAndBoot(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  angle: number,
  appearance: FighterAppearance,
  vis: ResolvedVisuals,
  isBack: boolean
): void {
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);

  const legShade = isBack ? -0.15 : 0;
  const pantsColor = shadeColor(vis.armorPrimary, -0.28 + legShade);
  const bootMain = shadeColor(vis.bootsPrimary, legShade);
  const bootShadow = shadeColor(bootMain, -0.22);
  const bootAccent = shadeColor(vis.bootsAccent, legShade);

  // Upper chibi leg
  roundedRectPath(ctx, -5.5, 0, 11, 13, 5);
  ctx.fillStyle = pantsColor;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.stroke();

  // Boot at bottom (y = 10..24)
  switch (vis.bootsType) {
    case 'sandals': {
      // Exposed ankle/foot + straw sole + straps
      roundedRectPath(ctx, -5, 11, 12, 10, 4.5);
      ctx.fillStyle = shadeColor(appearance.skinColor, legShade);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Sandal sole
      roundedRectPath(ctx, -6, 18.5, 15, 5, 2.5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      ctx.stroke();

      // Crossed ankle strap
      ctx.strokeStyle = bootAccent;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-4, 13);
      ctx.lineTo(5, 18);
      ctx.moveTo(5, 13);
      ctx.lineTo(-4, 18);
      ctx.stroke();
      break;
    }

    case 'iron_greaves': {
      // Heavy metallic greave with knee cap
      roundedRectPath(ctx, -6.5, 9, 15.5, 14.5, 5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      // Cel shadow half
      ctx.fillStyle = bootShadow;
      ctx.fillRect(-5, 17, 12.5, 5);
      // Specular metallic glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 11, 3, 7);
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      roundedRectPath(ctx, -6.5, 9, 15.5, 14.5, 5);
      ctx.stroke();

      // Knee cap guard
      ctx.fillStyle = bootAccent;
      ctx.beginPath();
      ctx.arc(2.5, 11, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'ninja_tabi': {
      // Sleek shinobi shin wrap + split toe
      roundedRectPath(ctx, -5.5, 9, 14.5, 14, 5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Bandage wraps
      ctx.strokeStyle = bootAccent;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4.5, 12);
      ctx.lineTo(6.5, 14);
      ctx.moveTo(-4.5, 16);
      ctx.lineTo(6.5, 18);
      ctx.stroke();

      // Split toe notch
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 20);
      ctx.lineTo(9, 20);
      ctx.stroke();
      break;
    }

    case 'wing_boots': {
      // Sleek heroic boot
      roundedRectPath(ctx, -6, 10, 15, 13.5, 5.5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Little cel-shaded ankle wing!
      ctx.beginPath();
      ctx.moveTo(-4, 15);
      ctx.lineTo(-14, 9);
      ctx.lineTo(-11, 15);
      ctx.lineTo(-14, 18);
      ctx.lineTo(-4, 19);
      ctx.closePath();
      ctx.fillStyle = bootAccent;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      break;
    }

    case 'mythic_striders': {
      roundedRectPath(ctx, -6.5, 9, 16, 14.5, 5.5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      // Glowing rune trim
      ctx.fillStyle = bootAccent;
      ctx.fillRect(-5, 10.5, 13, 3.2);
      ctx.fillRect(-5, 19, 14, 3);
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      roundedRectPath(ctx, -6.5, 9, 16, 14.5, 5.5);
      ctx.stroke();

      // Radiant heel flare
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(-13, 12);
      ctx.lineTo(-9, 19);
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'leather_boots':
    default: {
      // Classic cuffed adventurer boot
      roundedRectPath(ctx, -6, 10, 15, 13.5, 5);
      ctx.fillStyle = bootMain;
      ctx.fill();
      // Sole shadow
      ctx.fillStyle = bootShadow;
      ctx.fillRect(-5, 19.5, 13.5, 3.5);
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      roundedRectPath(ctx, -6, 10, 15, 13.5, 5);
      ctx.stroke();

      // Folded boot cuff
      roundedRectPath(ctx, -6.8, 9.5, 13.6, 4.8, 2.2);
      ctx.fillStyle = bootAccent;
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 4: Torso & All 7 Armor Types + Front Accessories
// ----------------------------------------------------------------------------

function drawTorsoAndArmor(
  ctx: CanvasRenderingContext2D,
  appearance: FighterAppearance,
  vis: ResolvedVisuals
): void {
  const main = vis.armorPrimary;
  const shadow = shadeColor(main, -0.22);
  const hi = shadeColor(main, 0.24);
  const accent = vis.armorAccent;

  ctx.save();

  // Base compact chibi torso silhouette
  ctx.beginPath();
  ctx.moveTo(-12, -24);
  ctx.quadraticCurveTo(0, -27, 12, -24);
  ctx.lineTo(14.5, -2);
  ctx.quadraticCurveTo(0, 4, -14.5, -2);
  ctx.closePath();
  ctx.fillStyle = main;
  ctx.fill();

  // 2-tone cel shadow on left side
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shadow;
  ctx.fillRect(-16, -28, 12, 34);
  ctx.fillStyle = hi;
  ctx.fillRect(5, -26, 6, 16);
  ctx.restore();

  // Armor-specific surface details
  switch (vis.armorType) {
    case 'gi_martial': {
      // V-neck martial arts gi collar + thick tied obi belt
      ctx.fillStyle = appearance.skinColor;
      ctx.beginPath();
      ctx.moveTo(-4, -25);
      ctx.lineTo(4, -25);
      ctx.lineTo(1, -15);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-5, -25);
      ctx.lineTo(3, -13);
      ctx.moveTo(5, -25);
      ctx.lineTo(-2, -14);
      ctx.stroke();

      // Thick knotted obi belt
      roundedRectPath(ctx, -14, -9, 28, 5.5, 2.5);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      break;
    }

    case 'leather_vest': {
      // Under-tunic center + laced vest panels
      ctx.fillStyle = shadeColor(accent, 0.15);
      ctx.fillRect(-4, -25, 8, 22);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      // Laces
      for (let ly = -21; ly <= -13; ly += 4) {
        ctx.beginPath();
        ctx.moveTo(-4, ly);
        ctx.lineTo(4, ly + 1.5);
        ctx.stroke();
      }
      // Leather belt
      roundedRectPath(ctx, -14, -7.5, 28, 4.8, 2);
      ctx.fillStyle = '#5c341d';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'iron_plate': {
      // Metallic chest ridge + riveted breastplate + bright specular slash
      ctx.strokeStyle = shadeColor(main, -0.35);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-12, -13);
      ctx.quadraticCurveTo(0, -9, 12, -13);
      ctx.stroke();

      ctx.fillStyle = rgba('#ffffff', 0.55);
      ctx.beginPath();
      ctx.moveTo(2, -23);
      ctx.lineTo(9, -23);
      ctx.lineTo(4, -12);
      ctx.lineTo(-1, -12);
      ctx.closePath();
      ctx.fill();

      // Gold/accent waist trim
      roundedRectPath(ctx, -14, -7.5, 28, 4.5, 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      break;
    }

    case 'samurai_do': {
      // Horizontal lamellar plates + braided cord
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      for (let ly = -19; ly <= -7; ly += 5) {
        ctx.beginPath();
        ctx.moveTo(-13, ly);
        ctx.quadraticCurveTo(0, ly + 2.2, 13, ly);
        ctx.stroke();
      }
      // Decorative chest cord bow
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -17, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'dragon_scale': {
      // Overlapping scale scallops + glowing dragon core
      ctx.strokeStyle = shadeColor(main, -0.38);
      ctx.lineWidth = 1.8;
      for (let row = 0; row < 3; row++) {
        const y = -19 + row * 6;
        for (let col = -9; col <= 9; col += 6) {
          ctx.beginPath();
          ctx.arc(col + (row % 2) * 3, y, 3.5, 0, Math.PI);
          ctx.stroke();
        }
      }
      // Glowing chest gem
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(5, -16);
      ctx.lineTo(0, -10);
      ctx.lineTo(-5, -16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'mythic_aegis': {
      // Regal gold trim + winged crest + radiant core
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-11, -21);
      ctx.lineTo(0, -11);
      ctx.lineTo(11, -21);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -15, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'tunic':
    default: {
      // Simple anime adventurer tunic + belt & buckle
      roundedRectPath(ctx, -14, -8.5, 28, 5, 2);
      ctx.fillStyle = '#5a351c';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      // Gold belt buckle
      roundedRectPath(ctx, -3.5, -9, 7, 6, 1.5);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  // Crisp outer ink outline of torso
  ctx.beginPath();
  ctx.moveTo(-12, -24);
  ctx.quadraticCurveTo(0, -27, 12, -24);
  ctx.lineTo(14.5, -2);
  ctx.quadraticCurveTo(0, 4, -14.5, -2);
  ctx.closePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.stroke();

  // Pauldrons for heavy armors
  if (
    vis.armorType === 'iron_plate' ||
    vis.armorType === 'samurai_do' ||
    vis.armorType === 'dragon_scale' ||
    vis.armorType === 'mythic_aegis'
  ) {
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(side * 13.5, -21);
      ctx.rotate(side * 0.28);
      roundedRectPath(ctx, -6, -4.5, 12, 9, 4);
      ctx.fillStyle = vis.armorType === 'mythic_aegis' ? accent : main;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Front accessory chest overlays
  if (vis.accessoryType === 'red_scarf') {
    roundedRectPath(ctx, -14, -27, 28, 8.5, 4);
    ctx.fillStyle = vis.accessoryPrimary;
    ctx.fill();
    ctx.strokeStyle = shadeColor(vis.accessoryPrimary, -0.28);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, -23);
    ctx.quadraticCurveTo(0, -20.5, 10, -23);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = BASE_LINE_W;
    roundedRectPath(ctx, -14, -27, 28, 8.5, 4);
    ctx.stroke();
  } else if (vis.accessoryType === 'golden_amulet') {
    ctx.strokeStyle = vis.accessoryPrimary;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, -24);
    ctx.quadraticCurveTo(0, -15, 6, -24);
    ctx.stroke();
    ctx.fillStyle = vis.accessoryPrimary;
    ctx.beginPath();
    ctx.arc(0, -16.5, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1;
    ctx.stroke();
    ctx.fillStyle = vis.accessoryAccent;
    ctx.beginPath();
    ctx.arc(0, -16.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (vis.accessoryType === 'hero_cape') {
    // Golden cape clasp dots
    for (const sx of [-9, 9]) {
      ctx.fillStyle = vis.accessoryAccent;
      ctx.beginPath();
      ctx.arc(sx, -22, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 5: Arms & All 6 Glove Types
// ----------------------------------------------------------------------------

function drawArmAndGlove(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  angle: number,
  appearance: FighterAppearance,
  vis: ResolvedVisuals,
  isBack: boolean,
  drawWeaponFn?: () => void
): void {
  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(angle);

  const shade = isBack ? -0.14 : 0;
  const sleeveColor = shadeColor(vis.armorPrimary, shade);
  const skin = shadeColor(appearance.skinColor, shade);
  const gloveMain = shadeColor(vis.glovesPrimary, shade);
  const gloveAccent = shadeColor(vis.glovesAccent, shade);

  // Arm segment (0,0 down to hand at 0,16)
  roundedRectPath(ctx, -4.6, -2, 9.2, 15, 4.5);
  ctx.fillStyle = sleeveColor;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.stroke();

  // Draw weapon anchored in front hand BEFORE hand fingers wrap or right at hand
  if (drawWeaponFn) {
    ctx.save();
    ctx.translate(1, 14);
    drawWeaponFn();
    ctx.restore();
  }

  // Hand / Glove at (0, 14)
  ctx.save();
  ctx.translate(0, 14);
  switch (vis.glovesType) {
    case 'wraps': {
      ctx.fillStyle = gloveMain;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      // Bandage lines
      ctx.strokeStyle = shadeColor(gloveMain, -0.25);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(4, 1);
      ctx.moveTo(-4, 2);
      ctx.lineTo(4, 4);
      ctx.stroke();
      break;
    }

    case 'leather_gloves': {
      ctx.fillStyle = gloveMain;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      // Cuff band
      roundedRectPath(ctx, -5.8, -6.8, 11.6, 4.2, 2);
      ctx.fillStyle = gloveAccent;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'iron_gauntlets': {
      roundedRectPath(ctx, -7, -7, 14, 14, 4.5);
      ctx.fillStyle = gloveMain;
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, -4, 3, 5);
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      roundedRectPath(ctx, -7, -7, 14, 14, 4.5);
      ctx.stroke();
      // Knuckle stud
      ctx.fillStyle = gloveAccent;
      ctx.beginPath();
      ctx.arc(3.5, 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'flame_fists': {
      // Fiery cel-shaded outer flames
      ctx.beginPath();
      ctx.moveTo(-7, 2);
      ctx.quadraticCurveTo(-11, -7, -3, -12);
      ctx.quadraticCurveTo(2, -16, 6, -9);
      ctx.quadraticCurveTo(12, -4, 7, 5);
      ctx.quadraticCurveTo(0, 10, -7, 2);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Inner blazing fist
      ctx.fillStyle = gloveMain;
      ctx.beginPath();
      ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(1.5, -1, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'titan_claws': {
      // Oversized armored gauntlet + 3 gleaming blades
      ctx.fillStyle = gloveAccent;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(2, c * 3.5 - 1.2);
        ctx.lineTo(14, c * 4.5);
        ctx.lineTo(3, c * 3.5 + 1.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      roundedRectPath(ctx, -7, -6.5, 13.5, 13, 4.5);
      ctx.fillStyle = gloveMain;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      break;
    }

    case 'none':
    default: {
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 6: Oversized Chibi Weapons (All 10 Types) + Anime Swing Smear Arc
// ----------------------------------------------------------------------------

function drawWeaponSmear(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  vis: ResolvedVisuals
): void {
  if (pose.smearAlpha <= 0.02) return;

  const smearOuter =
    pose.auraAlpha > 0.35
      ? pose.auraColor
      : vis.weaponType === 'crystal_blade'
        ? '#38bdf8'
        : vis.weaponType === 'mythic_scythe'
          ? '#f43f5e'
          : vis.weaponAccent;

  ctx.save();
  ctx.rotate(pose.smearAngle);
  ctx.globalAlpha = Math.min(1, pose.smearAlpha * 0.92);

  // Outer sweeping anime crescent smear
  ctx.beginPath();
  ctx.arc(-8, 0, 58, -1.65, 0.72, false);
  ctx.arc(-16, 4, 34, 0.65, -1.55, true);
  ctx.closePath();
  ctx.fillStyle = rgba(smearOuter, 0.78);
  ctx.fill();
  ctx.strokeStyle = rgba(INK, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bright white-hot inner speed core
  ctx.beginPath();
  ctx.arc(-8, 0, 54, -1.42, 0.58, false);
  ctx.arc(-14, 3, 42, 0.52, -1.35, true);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();

  ctx.restore();
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  vis: ResolvedVisuals
): void {
  ctx.save();
  ctx.rotate(pose.weaponAngle);
  ctx.scale(pose.weaponScale, pose.weaponScale);

  // Draw anime swing smear behind weapon
  drawWeaponSmear(ctx, pose, vis);

  const main = vis.weaponPrimary;
  const shadow = shadeColor(main, -0.24);
  const hi = shadeColor(main, 0.28);
  const accent = vis.weaponAccent;

  // All weapons are drawn extending upward (negative Y) from grip at (0, 0)
  switch (vis.weaponType) {
    case 'fists': {
      // Dynamic anime punch aura rings during attacks
      if (pose.smearAlpha > 0.1 || pose.auraAlpha > 0.3) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(4, -2, 14, -1.1, 1.1);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, -2, 18, -0.8, 0.8);
        ctx.stroke();
      }
      break;
    }

    case 'wooden_club': {
      // Chunky knotted caveman/brute club with iron band & comic spikes!
      ctx.beginPath();
      ctx.moveTo(-3.5, 8);
      ctx.lineTo(3.5, 8);
      ctx.quadraticCurveTo(8, -16, 12, -38);
      ctx.quadraticCurveTo(13, -52, 0, -54);
      ctx.quadraticCurveTo(-13, -52, -12, -38);
      ctx.quadraticCurveTo(-8, -16, -3.5, 8);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.fillStyle = shadow;
      ctx.fillRect(-14, -56, 12, 66);
      // Wood grain knot
      ctx.strokeStyle = shadow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(3, -30, 3, 5, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Iron ring band
      roundedRectPath(ctx, -11, -41, 22, 6, 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();

      // Chunky studs
      for (const [sx, sy] of [
        [-12, -38],
        [12, -38],
        [-9, -48],
        [9, -48],
      ]) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'broadsword': {
      // Grip & pommel
      roundedRectPath(ctx, -3, -4, 6, 15, 2.5);
      ctx.fillStyle = '#5c341d';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 12, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Oversized chunky chibi blade
      ctx.beginPath();
      ctx.moveTo(-7.5, -7);
      ctx.lineTo(-8.5, -48);
      ctx.lineTo(0, -61);
      ctx.lineTo(8.5, -48);
      ctx.lineTo(7.5, -7);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();

      // 2-tone cel split down blade spine
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, -61);
      ctx.lineTo(8.5, -48);
      ctx.lineTo(7.5, -7);
      ctx.closePath();
      ctx.fillStyle = hi;
      ctx.fill();

      // Crisp metallic shine slash
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-6, -34);
      ctx.lineTo(7, -42);
      ctx.lineTo(7, -37);
      ctx.lineTo(-6, -29);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.beginPath();
      ctx.moveTo(-7.5, -7);
      ctx.lineTo(-8.5, -48);
      ctx.lineTo(0, -61);
      ctx.lineTo(8.5, -48);
      ctx.lineTo(7.5, -7);
      ctx.closePath();
      ctx.stroke();

      // Crossguard
      roundedRectPath(ctx, -13, -10, 26, 6.5, 3);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'katana': {
      // Wrapped hilt
      roundedRectPath(ctx, -2.8, -5, 5.6, 17, 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Sleek curved gleaming katana blade
      ctx.beginPath();
      ctx.moveTo(-3.2, -8);
      ctx.quadraticCurveTo(-5, -38, 2.5, -66);
      ctx.lineTo(7.5, -56);
      ctx.quadraticCurveTo(2.5, -34, 3.2, -8);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();

      // Razor edge gleam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(2.5, -10);
      ctx.quadraticCurveTo(1.8, -35, 6.2, -55);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-3.2, -8);
      ctx.quadraticCurveTo(-5, -38, 2.5, -66);
      ctx.lineTo(7.5, -56);
      ctx.quadraticCurveTo(2.5, -34, 3.2, -8);
      ctx.closePath();
      ctx.stroke();

      // Ornate gold tsuba guard
      roundedRectPath(ctx, -8.5, -10.5, 17, 4.8, 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'battle_axe': {
      // Long sturdy wooden haft
      roundedRectPath(ctx, -3.5, -54, 7, 68, 3);
      ctx.fillStyle = '#7c4a28';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Massive double-headed cel-shaded axe blades
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(3, -36);
        ctx.quadraticCurveTo(18, -38, 22, -54);
        ctx.quadraticCurveTo(26, -42, 22, -26);
        ctx.quadraticCurveTo(16, -30, 3, -32);
        ctx.closePath();
        ctx.fillStyle = main;
        ctx.fill();
        // Shiny edge bevel
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(20, -51);
        ctx.quadraticCurveTo(23.5, -41, 20, -29);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = BASE_LINE_W;
        ctx.beginPath();
        ctx.moveTo(3, -36);
        ctx.quadraticCurveTo(18, -38, 22, -54);
        ctx.quadraticCurveTo(26, -42, 22, -26);
        ctx.quadraticCurveTo(16, -30, 3, -32);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      // Center collar
      roundedRectPath(ctx, -6, -44, 12, 11, 3);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'war_hammer': {
      // Reinforced handle
      roundedRectPath(ctx, -3.8, -50, 7.6, 65, 3);
      ctx.fillStyle = '#6b3e26';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Colossal blocky warhammer head
      roundedRectPath(ctx, -21, -55, 42, 22, 5);
      ctx.fillStyle = main;
      ctx.fill();
      ctx.fillStyle = shadow;
      ctx.fillRect(-19, -41, 38, 7);
      ctx.fillStyle = hi;
      ctx.fillRect(-17, -53, 34, 5);
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      roundedRectPath(ctx, -21, -55, 42, 22, 5);
      ctx.stroke();

      // Golden reinforcement straps
      ctx.fillStyle = accent;
      ctx.fillRect(-14, -55, 5, 22);
      ctx.fillRect(9, -55, 5, 22);
      ctx.strokeRect(-14, -55, 5, 22);
      ctx.strokeRect(9, -55, 5, 22);
      break;
    }

    case 'dragon_spear': {
      // Long polearm shaft
      roundedRectPath(ctx, -3, -52, 6, 70, 2.5);
      ctx.fillStyle = '#78350f';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Crimson fluttering tassel below blade
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-3, -44);
      ctx.quadraticCurveTo(-13, -38, -10, -28);
      ctx.lineTo(-2, -33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Winged spearhead
      ctx.beginPath();
      ctx.moveTo(0, -72);
      ctx.lineTo(10, -52);
      ctx.lineTo(4, -44);
      ctx.lineTo(-4, -44);
      ctx.lineTo(-10, -52);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Dragon wing collar
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-12, -46);
      ctx.lineTo(0, -49);
      ctx.lineTo(12, -46);
      ctx.lineTo(0, -41);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'crystal_blade': {
      // Hilt
      roundedRectPath(ctx, -3, -5, 6, 16, 2.5);
      ctx.fillStyle = '#312e81';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Faceted glowing crystal greatsword
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(-11, -46);
      ctx.lineTo(0, -66);
      ctx.lineTo(11, -46);
      ctx.lineTo(8, -9);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();

      // Prismatic inner facets
      ctx.fillStyle = hi;
      ctx.beginPath();
      ctx.moveTo(0, -66);
      ctx.lineTo(11, -46);
      ctx.lineTo(0, -34);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-4, -45);
      ctx.lineTo(0, -58);
      ctx.lineTo(3, -45);
      ctx.lineTo(0, -30);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(-11, -46);
      ctx.lineTo(0, -66);
      ctx.lineTo(11, -46);
      ctx.lineTo(8, -9);
      ctx.closePath();
      ctx.stroke();

      // Winged crystal crossguard
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-14, -12);
      ctx.lineTo(0, -6);
      ctx.lineTo(14, -12);
      ctx.lineTo(0, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'mythic_scythe': {
      // Curved obsidian pole
      ctx.beginPath();
      ctx.moveTo(-3, 18);
      ctx.quadraticCurveTo(-5, -24, 0, -56);
      ctx.lineTo(5, -54);
      ctx.quadraticCurveTo(1, -24, 3, 18);
      ctx.closePath();
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Huge wicked crescent reaper blade!
      ctx.beginPath();
      ctx.moveTo(-2, -55);
      ctx.quadraticCurveTo(22, -62, 34, -32);
      ctx.quadraticCurveTo(20, -45, 2, -42);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();

      // Glowing energy razor edge
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(2, -54);
      ctx.quadraticCurveTo(21, -59, 32, -34);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.beginPath();
      ctx.moveTo(-2, -55);
      ctx.quadraticCurveTo(22, -62, 34, -32);
      ctx.quadraticCurveTo(20, -45, 2, -42);
      ctx.closePath();
      ctx.stroke();

      // Glowing soul orb at scythe neck
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -50, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'frying_pan': {
      // Cast iron handle
      roundedRectPath(ctx, -3.5, -26, 7, 36, 3);
      ctx.fillStyle = main;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();

      // Big round iconic skillet pan!
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, -40, 17.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner pan recess + cartoon shine
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(0, -40, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -40, 9.5, -2.4, -1.2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 7: Large Expressive Chibi Head, Eyes, Mouth, All 8 Hair Styles & 8 Helmets
// ----------------------------------------------------------------------------

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  hairStyle: HairStyle,
  hairColor: string,
  pose: ChibiPose,
  helmetType: HelmetVisualType
): void {
  const wave = Math.sin(pose.capeWave * Math.PI) * 5;
  const darkHair = shadeColor(hairColor, -0.2);

  if (helmetType === 'shadow_hood') {
    // Hood back drape
    ctx.fillStyle = shadeColor('#334155', -0.2);
    ctx.beginPath();
    ctx.ellipse(-3, -2, 27, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = BASE_LINE_W;
    ctx.stroke();
    return;
  }

  ctx.save();
  switch (hairStyle) {
    case 'ponytail': {
      ctx.translate(-21, -8);
      ctx.rotate(-0.2 + wave * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-18, -8, -22, 12);
      ctx.quadraticCurveTo(-16, 22, -6, 26);
      ctx.quadraticCurveTo(-10, 12, 0, 6);
      ctx.closePath();
      ctx.fillStyle = hairColor;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      break;
    }

    case 'twin_tails': {
      // Back (left) and right bouncy twin tails
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.translate(side * 22, -4);
        ctx.rotate(side * (0.18 + wave * 0.03));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * 14, 4, side * 12, 26);
        ctx.quadraticCurveTo(side * 2, 22, 0, 12);
        ctx.closePath();
        ctx.fillStyle = side === -1 ? darkHair : hairColor;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = BASE_LINE_W;
        ctx.stroke();
        // Cute ribbon tie
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'bob': {
      ctx.beginPath();
      ctx.ellipse(-2, 2, 26, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = darkHair;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      break;
    }

    case 'curly': {
      ctx.fillStyle = darkHair;
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.65 + (i / 5) * Math.PI * 1.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 23, Math.sin(a) * 20 - 3, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'bald_bandana': {
      // Fluttering bandana knot tails behind head
      ctx.translate(-22, -4);
      ctx.rotate(wave * 0.05);
      ctx.fillStyle = hairColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -3);
      ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-14, 10);
      ctx.lineTo(-8, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    default:
      break;
  }
  ctx.restore();
}

function drawAnimeEyes(
  ctx: CanvasRenderingContext2D,
  eyeStyle: EyeStyle,
  eyeColor: string,
  pose: ChibiPose
): void {
  // 3/4 facing right eye anchors
  const leftEyeX = -2;
  const rightEyeX = 14.5;
  const eyeY = 3;

  const expr = pose.expression;

  // Special non-iris expressions first
  if (expr === 'hurt') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    // Left >
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 5, eyeY - 4);
    ctx.lineTo(leftEyeX + 3, eyeY);
    ctx.lineTo(leftEyeX - 5, eyeY + 4);
    ctx.stroke();
    // Right <
    ctx.beginPath();
    ctx.moveTo(rightEyeX + 5, eyeY - 4);
    ctx.lineTo(rightEyeX - 3, eyeY);
    ctx.lineTo(rightEyeX + 5, eyeY + 4);
    ctx.stroke();
    return;
  }

  if (expr === 'dizzy') {
    const spin = pose.framePhase * Math.PI * 2;
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.save();
      ctx.translate(ex, eyeY);
      ctx.rotate(spin);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      // Comic spiral
      ctx.beginPath();
      for (let t = 0; t < 16; t++) {
        const a = t * 0.65;
        const r = t * 0.34;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (expr === 'happy') {
    // Joyful sparkly ^_^ eyes!
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 2, 5.8, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    drawFourPointSparkle(ctx, leftEyeX - 8, eyeY - 6, 4.5, '#fef08a', false);
    drawFourPointSparkle(ctx, rightEyeX + 8, eyeY - 7, 4.5, '#fef08a', false);
    return;
  }

  if (pose.blink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + 1, 5.2, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    return;
  }

  // Glossy anime eyes (normal, angry, focused, braced)
  const isNarrow = expr === 'braced' || eyeStyle === 'cool';
  const eyeH = isNarrow ? 5.2 : 7.8;
  const eyeW = 5.4;

  for (const [idx, ex] of [leftEyeX, rightEyeX].entries()) {
    const scaleX = idx === 1 ? 0.9 : 1.0; // slight 3/4 perspective
    ctx.save();
    ctx.translate(ex, eyeY);
    ctx.scale(scaleX, 1);

    // Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clip to eye interior for crisp iris + cel bounce + specular highlights
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.clip();

    // Rich iris
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(0.8, 0.5, eyeW * 0.78, eyeH * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower luminous bounce light
    ctx.fillStyle = shadeColor(eyeColor, 0.42);
    ctx.beginPath();
    ctx.ellipse(0.8, eyeH * 0.52, eyeW * 0.55, eyeH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep pupil
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(0.9, 0.1, eyeW * 0.4, eyeH * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper iris shadow
    ctx.fillStyle = rgba(INK, 0.35);
    ctx.fillRect(-eyeW, -eyeH, eyeW * 2, eyeH * 0.45);

    // Big glossy anime specular catchlight + secondary dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1.4, -eyeH * 0.36, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.2, eyeH * 0.32, 1.1, 0, Math.PI * 2);
    ctx.fill();

    if (eyeStyle === 'starry') {
      drawFourPointSparkle(ctx, 1, 0.5, 3.2, '#fef08a', false);
    }

    ctx.restore();

    // Bold upper anime eyelash line
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, Math.PI * 1.05, Math.PI * 1.98);
    ctx.stroke();

    // Subtle lower rim
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0.25, Math.PI - 0.25);
    ctx.stroke();

    ctx.restore();
  }

  // Expressive anime eyebrows!
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  const angryBrow = expr === 'angry' || expr === 'focused' || eyeStyle === 'fierce';
  if (angryBrow) {
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 6, eyeY - 10);
    ctx.lineTo(leftEyeX + 5, eyeY - 6.5);
    ctx.moveTo(rightEyeX + 5, eyeY - 10);
    ctx.lineTo(rightEyeX - 5, eyeY - 6.5);
    ctx.stroke();
  } else if (expr === 'braced') {
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 5, eyeY - 7);
    ctx.lineTo(leftEyeX + 5, eyeY - 6);
    ctx.moveTo(rightEyeX - 5, eyeY - 6);
    ctx.lineTo(rightEyeX + 5, eyeY - 7);
    ctx.stroke();
  } else if (eyeStyle === 'cheerful') {
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY - 7, 4.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY - 7, 4.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    // Determined / cool confident brows
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 5, eyeY - 9.5);
    ctx.lineTo(leftEyeX + 4, eyeY - 8.5);
    ctx.moveTo(rightEyeX - 4, eyeY - 8.5);
    ctx.lineTo(rightEyeX + 5, eyeY - 9.5);
    ctx.stroke();
  }
}

function drawAnimeMouth(
  ctx: CanvasRenderingContext2D,
  pose: ChibiPose,
  eyeStyle: EyeStyle
): void {
  const mx = 6.5;
  const my = 13.5;

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;

  switch (pose.expression) {
    case 'angry': {
      // Shonen battle shout!
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(mx - 6, my - 2);
      ctx.quadraticCurveTo(mx, my - 5, mx + 6, my - 2);
      ctx.quadraticCurveTo(mx + 5, my + 6, mx, my + 6.5);
      ctx.quadraticCurveTo(mx - 5, my + 6, mx - 6, my - 2);
      ctx.closePath();
      ctx.fill();
      // Cute white upper teeth edge
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 4, my - 2.5, 8, 2.5);
      ctx.stroke();
      break;
    }

    case 'happy': {
      // Big joyful anime laugh D-mouth
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(mx - 6, my - 2);
      ctx.lineTo(mx + 6, my - 2);
      ctx.quadraticCurveTo(mx + 4, my + 6, mx, my + 6);
      ctx.quadraticCurveTo(mx - 4, my + 6, mx - 6, my - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(mx, my + 3.5, 3, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'hurt': {
      // Comic wincing ouch mouth
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(mx, my + 1, 4.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'dizzy': {
      // Wobbly KO squiggle
      ctx.beginPath();
      ctx.moveTo(mx - 5, my + 1);
      ctx.quadraticCurveTo(mx - 2.5, my - 2.5, mx, my + 1);
      ctx.quadraticCurveTo(mx + 2.5, my + 4.5, mx + 5, my + 1);
      ctx.stroke();
      break;
    }

    case 'braced': {
      // Clenched gritting teeth
      roundedRectPath(ctx, mx - 5.5, my - 2, 11, 5, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx - 5, my + 0.5);
      ctx.lineTo(mx + 5, my + 0.5);
      ctx.stroke();
      break;
    }

    case 'focused': {
      // Confident smirk
      ctx.beginPath();
      ctx.moveTo(mx - 4.5, my + 0.5);
      ctx.quadraticCurveTo(mx + 1, my + 2.5, mx + 5, my - 1.5);
      ctx.stroke();
      break;
    }

    case 'normal':
    default: {
      if (eyeStyle === 'cheerful' || eyeStyle === 'starry') {
        ctx.beginPath();
        ctx.arc(mx, my - 1, 4.5, 0.15, Math.PI - 0.15);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(mx - 4.5, my);
        ctx.quadraticCurveTo(mx + 0.5, my + 2.8, mx + 5, my - 0.8);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  hairStyle: HairStyle,
  hairColor: string,
  helmetType: HelmetVisualType
): void {
  // Full-coverage helmets tuck crown spikes cleanly while keeping front bangs visible
  const fullHelm =
    helmetType === 'knight_visor' ||
    helmetType === 'viking_helm' ||
    helmetType === 'samurai_kabuto' ||
    helmetType === 'shadow_hood';

  const hi = shadeColor(hairColor, 0.3);

  ctx.save();
  ctx.fillStyle = hairColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;

  switch (hairStyle) {
    case 'spiky': {
      ctx.beginPath();
      ctx.moveTo(-24, 1);
      if (!fullHelm) {
        ctx.lineTo(-28, -14);
        ctx.lineTo(-18, -18);
        ctx.lineTo(-14, -33);
        ctx.lineTo(-3, -24);
        ctx.lineTo(6, -34);
        ctx.lineTo(13, -23);
        ctx.lineTo(24, -27);
        ctx.lineTo(21, -13);
        ctx.lineTo(27, -8);
      } else {
        ctx.lineTo(-22, -16);
        ctx.lineTo(22, -16);
      }
      ctx.lineTo(22, -1);
      // Iconic shonen bangs
      ctx.lineTo(15, -9);
      ctx.lineTo(10, -1);
      ctx.lineTo(3, -10);
      ctx.lineTo(-4, -1);
      ctx.lineTo(-11, -10);
      ctx.lineTo(-17, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'bob': {
      ctx.beginPath();
      ctx.moveTo(-24, 10);
      ctx.quadraticCurveTo(-27, -14, -12, -24);
      ctx.quadraticCurveTo(4, -29, 19, -20);
      ctx.quadraticCurveTo(26, -10, 24, 6);
      ctx.lineTo(19, 4);
      ctx.lineTo(17, -9);
      ctx.lineTo(11, -4);
      ctx.lineTo(4, -10);
      ctx.lineTo(-3, -4);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'ponytail': {
      ctx.beginPath();
      ctx.moveTo(-23, 0);
      ctx.quadraticCurveTo(-24, -22, 0, -25);
      ctx.quadraticCurveTo(22, -24, 23, -4);
      ctx.lineTo(16, -9);
      ctx.lineTo(10, -2);
      ctx.lineTo(2, -11);
      ctx.lineTo(-6, -2);
      ctx.lineTo(-15, -7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'mohawk': {
      if (!fullHelm) {
        ctx.beginPath();
        ctx.moveTo(-12, -18);
        ctx.lineTo(-16, -34);
        ctx.lineTo(-5, -28);
        ctx.lineTo(0, -39);
        ctx.lineTo(7, -28);
        ctx.lineTo(18, -33);
        ctx.lineTo(13, -15);
        ctx.lineTo(6, -12);
        ctx.lineTo(-4, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-14, -12);
        ctx.lineTo(0, -4);
        ctx.lineTo(14, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'twin_tails': {
      ctx.beginPath();
      ctx.moveTo(-23, 2);
      ctx.quadraticCurveTo(-23, -24, 0, -25);
      ctx.quadraticCurveTo(23, -24, 23, 0);
      ctx.lineTo(17, -7);
      ctx.lineTo(11, -2);
      ctx.lineTo(4, -8);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-9, -8);
      ctx.lineTo(-16, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'samurai_bun': {
      // Topknot bun (if no full helm)
      if (!fullHelm) {
        ctx.beginPath();
        ctx.ellipse(-2, -31, 9, 7, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Hair tie
        roundedRectPath(ctx, -7, -26, 10, 4, 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hairColor;
      }
      // Swept-back ronin hairline + cool side locks
      ctx.beginPath();
      ctx.moveTo(-23, 5);
      ctx.quadraticCurveTo(-24, -22, 0, -25);
      ctx.quadraticCurveTo(22, -22, 23, -5);
      ctx.lineTo(18, -11);
      ctx.quadraticCurveTo(4, -15, -12, -10);
      ctx.lineTo(-17, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'curly': {
      // Bouncy cloud curls across forehead & top
      const puffs: [number, number, number][] = fullHelm
        ? [
            [-14, -10, 7],
            [-3, -11, 7],
            [8, -10, 7],
            [17, -9, 6.5],
          ]
        : [
            [-21, -8, 8.5],
            [-15, -20, 9.5],
            [-3, -24, 10],
            [10, -22, 9.5],
            [20, -13, 8.5],
            [-11, -11, 7.5],
            [1, -12, 7.5],
            [12, -11, 7.5],
          ];
      for (const [px, py, pr] of puffs) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'bald_bandana': {
      // Cute shiny reflection on smooth dome
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-5, -12, 8, Math.PI * 1.15, Math.PI * 1.65);
      ctx.stroke();

      // Tied dojo bandana across forehead
      roundedRectPath(ctx, -23.5, -14, 47, 8, 3);
      ctx.fillStyle = hairColor;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = BASE_LINE_W;
      ctx.stroke();
      break;
    }
  }

  // Glossy anime hair highlight arc (for non-bald, non-fullHelm)
  if (hairStyle !== 'bald_bandana' && !fullHelm) {
    ctx.strokeStyle = rgba(hi, 0.72);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(2, -11, 14, Math.PI * 1.2, Math.PI * 1.75);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHelmet(
  ctx: CanvasRenderingContext2D,
  vis: ResolvedVisuals,
  pose: ChibiPose
): void {
  if (vis.helmetType === 'none') return;

  const main = vis.helmetPrimary;
  const shadow = shadeColor(main, -0.24);
  const accent = vis.helmetAccent;

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;

  switch (vis.helmetType) {
    case 'headband': {
      // Bold anime headband + metal forehead emblem
      roundedRectPath(ctx, -24, -14.5, 48, 8.5, 3);
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();

      roundedRectPath(ctx, -4, -15, 16, 9.5, 2.5);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      // Shine dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -13, 4, 2.5);
      break;
    }

    case 'viking_helm': {
      // Big curved ivory horns!
      for (const side of [-1, 1] as const) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.moveTo(18, -16);
        ctx.quadraticCurveTo(33, -22, 27, -38);
        ctx.quadraticCurveTo(22, -26, 14, -22);
        ctx.closePath();
        ctx.fillStyle = '#fef3c7';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Steel dome
      ctx.beginPath();
      ctx.arc(0, -10, 24.5, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();
      // Riveted rim + nose guard
      roundedRectPath(ctx, -25.5, -13, 51, 6.5, 3);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      roundedRectPath(ctx, 2, -9, 6, 10, 2);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'samurai_kabuto': {
      // Flared neck guard plates (shikoro)
      ctx.beginPath();
      ctx.moveTo(-25, -8);
      ctx.lineTo(-30, 6);
      ctx.lineTo(-18, 8);
      ctx.lineTo(-18, -8);
      ctx.closePath();
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.stroke();

      // Lacquered dome
      ctx.beginPath();
      ctx.arc(0, -10, 24.5, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();

      // Dramatic golden crescent maedate crest!
      ctx.beginPath();
      ctx.moveTo(4, -18);
      ctx.lineTo(-12, -37);
      ctx.lineTo(-4, -22);
      ctx.lineTo(4, -24);
      ctx.lineTo(12, -22);
      ctx.lineTo(20, -37);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'knight_visor': {
      // Flowing plume crest on top
      const wave = Math.sin(pose.capeWave * Math.PI) * 4;
      ctx.beginPath();
      ctx.moveTo(-2, -33);
      ctx.quadraticCurveTo(-18, -42 + wave, -24, -26 + wave);
      ctx.quadraticCurveTo(-12, -26, -2, -28);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.stroke();

      // Rounded armored helm + raised visor brow (so chibi eyes stay expressive!)
      ctx.beginPath();
      ctx.arc(0, -9, 25, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();

      // Angled visor brow shield
      ctx.beginPath();
      ctx.moveTo(-25, -10);
      ctx.lineTo(6, -15);
      ctx.lineTo(26, -8);
      ctx.lineTo(25, -4);
      ctx.lineTo(6, -9);
      ctx.lineTo(-25, -4);
      ctx.closePath();
      ctx.fillStyle = shadeColor(main, 0.2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'shadow_hood': {
      // Sleek ninja/assassin cowl draping over top & sides
      ctx.beginPath();
      ctx.moveTo(-24, 14);
      ctx.quadraticCurveTo(-28, -16, -8, -28);
      ctx.quadraticCurveTo(10, -31, 24, -14);
      ctx.lineTo(23, -5);
      ctx.quadraticCurveTo(6, -14, -14, -7);
      ctx.lineTo(-17, 14);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();
      // Accent trim edge
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-14, -7);
      ctx.quadraticCurveTo(6, -14, 23, -5);
      ctx.stroke();
      break;
    }

    case 'dragon_crown': {
      // Jagged royal dragon-horned crown with glowing gem
      ctx.beginPath();
      ctx.moveTo(-18, -16);
      ctx.lineTo(-22, -34);
      ctx.lineTo(-8, -24);
      ctx.lineTo(2, -39);
      ctx.lineTo(11, -24);
      ctx.lineTo(23, -34);
      ctx.lineTo(19, -16);
      ctx.closePath();
      ctx.fillStyle = main;
      ctx.fill();
      ctx.stroke();

      // Glowing centerpiece gem
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(2, -29);
      ctx.lineTo(7, -22);
      ctx.lineTo(2, -17);
      ctx.lineTo(-3, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'halo_crest': {
      // Floating radiant golden celestial halo!
      const bob = Math.sin(pose.framePhase * Math.PI * 2) * 2.5;
      ctx.save();
      ctx.translate(0, -37 + bob);
      ctx.strokeStyle = rgba('#fef08a', 0.65);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 19, 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = main;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 19, 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21, 6.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Cute winged temple crest
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(-32, -19);
      ctx.lineTo(-28, -9);
      ctx.lineTo(-31, -3);
      ctx.lineTo(-19, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawChibiHead(
  ctx: CanvasRenderingContext2D,
  appearance: FighterAppearance,
  vis: ResolvedVisuals,
  pose: ChibiPose
): void {
  ctx.save();
  // Head sits generously atop compact chibi torso (~48% of total fighter height!)
  ctx.translate(1, -46 + pose.headBob);
  ctx.rotate(pose.headTilt);

  // Back hair layer locked to head
  drawBackHair(ctx, appearance.hairStyle, appearance.hairColor, pose, vis.helmetType);

  const skin = appearance.skinColor;
  const skinShadow = shadeColor(skin, -0.14);

  // Cute chibi ear on left side
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.beginPath();
  ctx.arc(-22, 4, 5.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-21.5, 4, 2.4, Math.PI * 0.7, Math.PI * 1.6);
  ctx.stroke();

  // Large plump chibi anime head shape (48px wide x 44px tall)
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.bezierCurveTo(18, -23, 24.5, -10, 23.5, 6);
  ctx.bezierCurveTo(22.5, 18, 12, 22.5, 2, 22.5);
  ctx.bezierCurveTo(-12, 22.5, -23, 17, -23.5, 4);
  ctx.bezierCurveTo(-24, -11, -18, -23, 0, -23);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();

  // 2-tone cel shading on left/lower cheek
  ctx.save();
  ctx.clip();
  ctx.fillStyle = skinShadow;
  ctx.beginPath();
  ctx.ellipse(-18, 8, 13, 24, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Crisp head outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.stroke();

  // Rosy anime cheek blush!
  ctx.fillStyle = 'rgba(251, 113, 133, 0.42)';
  ctx.beginPath();
  ctx.ellipse(-9.5, 10.5, 5.2, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18.5, 10.5, 4.4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive anime eyes & mouth
  drawAnimeEyes(ctx, appearance.eyeStyle, appearance.eyeColor, pose);
  drawAnimeMouth(ctx, pose, appearance.eyeStyle);

  // Front hair + helmet
  drawFrontHair(ctx, appearance.hairStyle, appearance.hairColor, vis.helmetType);
  drawHelmet(ctx, vis, pose);

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Layer 8: Status & Environmental Overlays (Shield Gleam, Dust, Sparkles, Stars)
// ----------------------------------------------------------------------------

function drawStatusOverlays(ctx: CanvasRenderingContext2D, pose: ChibiPose): void {
  // Block shield / guard energy gleam!
  if (pose.shieldGleam > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.shieldGleam;
    const gx = 96 + pose.offsetX;
    const gy = 95 + pose.offsetY;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(gx - 10, gy, 30, -1.05, 1.05);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(gx - 7, gy, 33, -0.8, 0.8);
    ctx.stroke();
    drawFourPointSparkle(ctx, gx + 14, gy - 12, 9 * pose.shieldGleam, '#fef08a');
    ctx.restore();
  }

  // Cartoon dust puffs at feet (run, heavy slam, block recoil, defeat thud)
  if (pose.dustAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, pose.dustAlpha * 0.9);
    const baseX = 56 + pose.offsetX * 0.4;
    const baseY = 135;
    const puffs: [number, number, number][] = [
      [baseX - 10, baseY - 4, 8],
      [baseX - 2, baseY - 8, 6.5],
      [baseX + 28, baseY - 3, 7],
    ];
    for (const [px, py, pr] of puffs) {
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath();
      ctx.arc(px, py, pr * (0.7 + pose.dustAlpha * 0.35), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.55);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Celebratory sparkles on victory / special
  if (pose.sparkleAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.sparkleAlpha;
    const phase = pose.framePhase * Math.PI * 2;
    const spots: [number, number, number][] = [
      [34, 42 + Math.sin(phase) * 5, 8],
      [126, 36 + Math.cos(phase) * 5, 9],
      [118, 78 + Math.sin(phase + 1.5) * 4, 6.5],
      [38, 86 + Math.cos(phase + 1.2) * 4, 6],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [sx, sy, sr] = spots[i];
      drawFourPointSparkle(
        ctx,
        sx,
        sy,
        sr * (0.75 + 0.25 * Math.sin(phase + i)),
        i % 2 === 0 ? '#fef08a' : '#ffffff'
      );
    }
    ctx.restore();
  }

  // Orbiting dizzy stars on defeat!
  if (pose.dizzyAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = pose.dizzyAlpha;
    const cx = 42 + pose.offsetX * 0.6;
    const cy = 92 + pose.offsetY * 0.6;
    const phase = pose.framePhase * Math.PI * 2;

    // Orbit ring
    ctx.strokeStyle = rgba('#fbbf24', 0.65);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const a = phase + (i * Math.PI * 2) / 3;
      const sx = cx + Math.cos(a) * 20;
      const sy = cy + Math.sin(a) * 6.5;
      drawFivePointStar(ctx, sx, sy, 6.2, 2.8, i === 0 ? '#fef08a' : '#f59e0b');
    }
    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Public Export: drawChibiFrame
// ----------------------------------------------------------------------------

/**
 * Renders a single crisp cel-shaded chibi anime frame into `ctx`.
 * Designed for a normalized 160x160 coordinate grid (scaled cleanly to `frameSize`).
 */
export function drawChibiFrame(
  ctx: CanvasRenderingContext2D,
  appearance: FighterAppearance,
  equipped: EquippedGear,
  anim: AnimationName,
  frameIndex: number,
  totalFrames: number,
  frameSize = SPRITE_FRAME_SIZE
): void {
  const pose = sampleChibiPose(anim, frameIndex, totalFrames);
  const vis = resolveVisuals(appearance, equipped);
  const scale = frameSize / SPRITE_FRAME_SIZE;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Ground shadow
  drawGroundShadow(ctx, pose);

  // 2. Energy aura behind fighter
  drawEnergyAura(ctx, pose, vis);

  // 3. Afterimage ghost silhouettes during dodge/dash
  drawAfterimageGhosts(ctx, pose, appearance);

  // 4. Main articulated chibi fighter
  ctx.save();
  ctx.translate(74 + pose.offsetX, 136 + pose.offsetY);
  ctx.scale(pose.squashX, pose.squashY);
  ctx.translate(0, -24); // hip pivot
  ctx.rotate(pose.bodyTilt);

  // 4a. Back accessory (cape, wings, fox tail, scarf tails)
  drawBackAccessory(ctx, pose, vis);

  // 4b. Back arm + back glove
  drawArmAndGlove(ctx, -11, -20, pose.leftArmAngle, appearance, vis, true);

  // 4c. Back leg + boot
  drawLegAndBoot(ctx, -6.5, 0, pose.leftLegAngle, appearance, vis, true);

  // 4d. Front leg + boot
  drawLegAndBoot(ctx, 6.5, 0, pose.rightLegAngle, appearance, vis, false);

  // 4e. Torso + Armor + chest accessory
  drawTorsoAndArmor(ctx, appearance, vis);

  // 4f. Big expressive chibi head + hair + helmet
  drawChibiHead(ctx, appearance, vis, pose);

  // 4g. Front arm + glove + oversized chibi weapon & smear!
  drawArmAndGlove(ctx, 11, -20, pose.rightArmAngle, appearance, vis, false, () => {
    drawWeapon(ctx, pose, vis);
  });

  ctx.restore();

  // 5. Status & impact FX overlays (shield gleam, dust, sparkles, dizzy stars)
  drawStatusOverlays(ctx, pose);

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Public Export: drawTrainingDummy (My-Brute Style Dojo Straw Dummy!)
// ----------------------------------------------------------------------------

/**
 * Draws a super charming cel-shaded wooden & straw martial-arts training dummy
 * that wobbles dramatically on impact and blazes in Fever Mode!
 * @param hitProgress 0 = resting, 0..1 = spring wobble progression after a click/hit
 */
export function drawTrainingDummy(
  ctx: CanvasRenderingContext2D,
  hitProgress: number,
  feverMode: boolean,
  frameSize = SPRITE_FRAME_SIZE
): void {
  const scale = frameSize / SPRITE_FRAME_SIZE;
  const clamped = Math.max(0, Math.min(1, hitProgress));
  const isHit = clamped > 0.01 && clamped < 0.99;

  // Damped spring oscillation when struck
  const damping = isHit ? Math.exp(-clamped * 3.8) : 0;
  const wobble = isHit ? Math.sin(clamped * Math.PI * 4.5) * 0.36 * damping : 0;
  const squashX = isHit ? 1 + Math.sin(clamped * Math.PI * 3) * 0.14 * damping : 1;
  const squashY = isHit ? 1 - Math.sin(clamped * Math.PI * 3) * 0.12 * damping : 1;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Fever mode golden fiery aura behind dummy!
  if (feverMode) {
    const grad = ctx.createRadialGradient(80, 86, 12, 80, 86, 62);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.45)');
    grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(80, 86, 62, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground drop shadow
  ctx.fillStyle = 'rgba(35, 25, 23, 0.25)';
  ctx.beginPath();
  ctx.ellipse(80, 140, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sturdy wooden cross base (stays planted!)
  roundedRectPath(ctx, 50, 131, 60, 10, 4);
  ctx.fillStyle = '#8b5a2b';
  ctx.fill();
  ctx.fillStyle = '#6b4220';
  ctx.fillRect(52, 136, 56, 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  roundedRectPath(ctx, 50, 131, 60, 10, 4);
  ctx.stroke();

  // Pivot dummy post at base center (80, 132)
  ctx.save();
  ctx.translate(80, 132);
  ctx.scale(squashX, squashY);
  ctx.rotate(wobble);

  // Wooden center post
  roundedRectPath(ctx, -6, -86, 12, 88, 3);
  ctx.fillStyle = '#9c6633';
  ctx.fill();
  ctx.fillStyle = '#7c4e24';
  ctx.fillRect(-5, -85, 5, 86);
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  roundedRectPath(ctx, -6, -86, 12, 88, 3);
  ctx.stroke();

  // Wooden peg arms sticking out
  roundedRectPath(ctx, -38, -56, 76, 11, 5);
  ctx.fillStyle = '#a9713b';
  ctx.fill();
  ctx.fillStyle = '#825225';
  ctx.fillRect(-36, -50, 72, 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  roundedRectPath(ctx, -38, -56, 76, 11, 5);
  ctx.stroke();

  // Woven straw torso bundle
  roundedRectPath(ctx, -20, -68, 40, 46, 14);
  ctx.fillStyle = '#f3d078';
  ctx.fill();
  // Cel shadow on straw
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#d9ad4c';
  ctx.fillRect(-20, -68, 14, 48);
  // Crisp straw texture hatches
  ctx.strokeStyle = '#b9892f';
  ctx.lineWidth = 1.8;
  for (let sx = -14; sx <= 14; sx += 7) {
    ctx.beginPath();
    ctx.moveTo(sx, -64);
    ctx.lineTo(sx - 2, -26);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  roundedRectPath(ctx, -20, -68, 40, 46, 14);
  ctx.stroke();

  // Red dojo belt sash + thick braided rope wrap
  roundedRectPath(ctx, -21, -42, 42, 10, 3);
  ctx.fillStyle = feverMode ? '#ef4444' : '#dc2626';
  ctx.fill();
  ctx.stroke();
  // Sash tie knot
  ctx.beginPath();
  ctx.moveTo(4, -34);
  ctx.lineTo(12, -22);
  ctx.lineTo(4, -22);
  ctx.closePath();
  ctx.fillStyle = '#b91c1c';
  ctx.fill();
  ctx.stroke();

  // Painted bullseye target on chest!
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -52, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, -52, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Round chibi burlap/straw head!
  ctx.save();
  ctx.translate(0, -88);
  // Cute straw tuft sticking out top!
  ctx.fillStyle = '#f3d078';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.lineTo(-10, -31);
  ctx.lineTo(-1, -24);
  ctx.lineTo(4, -33);
  ctx.lineTo(7, -23);
  ctx.lineTo(13, -29);
  ctx.lineTo(6, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head sack
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f5d993';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#dcb360';
  ctx.beginPath();
  ctx.ellipse(-15, 4, 12, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BASE_LINE_W;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 20, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Rope collar tie
  roundedRectPath(ctx, -12, 16, 24, 5.5, 2.5);
  ctx.fillStyle = '#c28b42';
  ctx.fill();
  ctx.stroke();

  // Painted Dojo Headband on dummy!
  roundedRectPath(ctx, -21.5, -12, 43, 6.5, 2.5);
  ctx.fillStyle = feverMode ? '#f59e0b' : '#ef4444';
  ctx.fill();
  ctx.stroke();

  // Hand-painted expressive ink chibi face!
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  if (isHit && damping > 0.25) {
    // Wincing > < painted face when smacked!
    ctx.beginPath();
    ctx.moveTo(-11, -3);
    ctx.lineTo(-5, 1);
    ctx.lineTo(-11, 5);
    ctx.moveTo(11, -3);
    ctx.lineTo(5, 1);
    ctx.lineTo(11, 5);
    ctx.stroke();
    // Comic wavy ouch mouth
    ctx.beginPath();
    ctx.arc(0, 9.5, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (feverMode) {
    // Blazing fever eyes!
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-8, 1, 4.2, 0, Math.PI * 2);
    ctx.arc(8, 1, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Fierce grin
    ctx.beginPath();
    ctx.moveTo(-7, 9);
    ctx.quadraticCurveTo(0, 14, 7, 9);
    ctx.stroke();
  } else {
    // Charming painted determined/grumpy dojo face
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-8, 1, 3.2, 0, Math.PI * 2);
    ctx.arc(8, 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Angry painted brows
    ctx.beginPath();
    ctx.moveTo(-13, -4);
    ctx.lineTo(-4, -1.5);
    ctx.moveTo(13, -4);
    ctx.lineTo(4, -1.5);
    ctx.stroke();
    // Cute little mouth
    ctx.beginPath();
    ctx.moveTo(-5, 9.5);
    ctx.quadraticCurveTo(0, 7.5, 5, 9.5);
    ctx.stroke();
  }
  ctx.restore(); // end head

  ctx.restore(); // end wobble pivot

  // Flying straw splinters & comic impact sparks when struck!
  if (isHit && damping > 0.2) {
    const spread = clamped * 32;
    ctx.save();
    ctx.globalAlpha = damping;
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.6;
    const straws: [number, number, number][] = [
      [46 - spread * 0.7, 56 - spread * 0.4, -0.6],
      [114 + spread * 0.8, 62 - spread * 0.3, 0.5],
      [52 - spread * 0.5, 88 + spread * 0.2, -0.3],
      [110 + spread * 0.6, 86 + spread * 0.3, 0.8],
    ];
    for (const [sx, sy, rot] of straws) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot + clamped * 2);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();
      ctx.restore();
    }
    drawFourPointSparkle(ctx, 114, 42, 8 * damping, '#fef08a');
    ctx.restore();
  }

  // Fever sparkles
  if (feverMode) {
    drawFourPointSparkle(ctx, 32, 46, 8, '#fef08a');
    drawFourPointSparkle(ctx, 128, 52, 9, '#fb923c');
    drawFourPointSparkle(ctx, 120, 108, 6.5, '#fef08a');
  }

  ctx.restore();
}
