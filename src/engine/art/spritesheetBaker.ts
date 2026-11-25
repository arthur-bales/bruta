// ============================================================================
// BRUTE LEGENDS — Dynamic 1280x1760 Spritesheet Baker & Phaser Texture Bridge
// ============================================================================

import type Phaser from 'phaser';
import type {
  AnimationName,
  EquipmentSlot,
  EquippedGear,
  FighterAppearance,
} from '@shared/types';
import {
  ALL_ANIMATIONS,
  ANIMATION_SPECS,
  SPRITE_FRAME_SIZE,
  SPRITE_MAX_COLS,
} from '@shared/constants';
import { drawChibiFrame } from './chibiRenderer';

export const SPRITESHEET_WIDTH = SPRITE_MAX_COLS * SPRITE_FRAME_SIZE; // 1280
export const SPRITESHEET_HEIGHT = ALL_ANIMATIONS.length * SPRITE_FRAME_SIZE; // 1760

const EQUIPMENT_SLOTS_ORDER: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'accessory',
];

const portraitCache = new Map<string, string>();
const MAX_PORTRAIT_CACHE = 120;

/**
 * Deterministic 32-bit FNV-1a hash converted to compact base-36 string.
 */
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Computes a deterministic short Phaser texture key from fighter appearance
 * and all visually relevant equipped gear attributes.
 */
export function computeFighterTextureKey(
  appearance: FighterAppearance,
  equipped: EquippedGear
): string {
  const parts: string[] = [
    appearance.skinColor,
    appearance.hairStyle,
    appearance.hairColor,
    appearance.eyeStyle,
    appearance.eyeColor,
    appearance.outfitPrimary,
    appearance.outfitSecondary,
  ];

  for (const slot of EQUIPMENT_SLOTS_ORDER) {
    const item = equipped[slot];
    if (item) {
      parts.push(`${slot}:${item.visualType}:${item.primaryColor}:${item.accentColor}`);
    } else {
      parts.push(`${slot}:none`);
    }
  }

  return `chibi_${fnv1aHash(parts.join('|'))}`;
}

/**
 * Bakes a regular 1280x1760 transparent spritesheet canvas containing
 * all 11 animations (rows) x up to 8 frames (columns) at 160x160 per cell.
 */
export function bakeFighterSpritesheetCanvas(
  appearance: FighterAppearance,
  equipped: EquippedGear
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITESHEET_WIDTH;
  canvas.height = SPRITESHEET_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const animName of ALL_ANIMATIONS) {
    const spec = ANIMATION_SPECS[animName];
    const rowY = spec.row * SPRITE_FRAME_SIZE;

    for (let col = 0; col < spec.frames; col++) {
      const colX = col * SPRITE_FRAME_SIZE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(colX, rowY, SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE);
      ctx.clip();
      ctx.translate(colX, rowY);

      drawChibiFrame(
        ctx,
        appearance,
        equipped,
        animName,
        col,
        spec.frames,
        SPRITE_FRAME_SIZE
      );

      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Registers the fighter's 1280x1760 spritesheet texture and all 11 Phaser
 * animations (`${key}:${animName}`) inside the given Phaser scene if not
 * already cached. Returns the deterministic texture key.
 */
export function registerFighterSpritesheetInPhaser(
  scene: Phaser.Scene,
  appearance: FighterAppearance,
  equipped: EquippedGear
): string {
  const key = computeFighterTextureKey(appearance, equipped);

  if (!scene.textures.exists(key)) {
    const canvas = bakeFighterSpritesheetCanvas(appearance, equipped);
    scene.textures.addSpriteSheet(
      key,
      canvas as unknown as HTMLImageElement,
      {
        frameWidth: SPRITE_FRAME_SIZE,
        frameHeight: SPRITE_FRAME_SIZE,
      }
    );
  }

  for (const animName of ALL_ANIMATIONS) {
    const animKey = `${key}:${animName}`;
    if (scene.anims.exists(animKey)) continue;

    const spec = ANIMATION_SPECS[animName];
    const start = spec.row * SPRITE_MAX_COLS;
    const end = start + spec.frames - 1;

    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(key, { start, end }),
      frameRate: spec.frameRate,
      repeat: spec.repeat,
    });
  }

  return key;
}

/**
 * Renders a crisp 160x160 PNG data URL portrait for React fighter cards,
 * customization previews, and leaderboard avatars. Cached by visual signature.
 */
export function renderFighterPortraitDataUrl(
  appearance: FighterAppearance,
  equipped: EquippedGear,
  anim: AnimationName = 'idle'
): string {
  const cacheKey = `${computeFighterTextureKey(appearance, equipped)}:${anim}`;
  const existing = portraitCache.get(cacheKey);
  if (existing) return existing;

  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_FRAME_SIZE;
  canvas.height = SPRITE_FRAME_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const spec = ANIMATION_SPECS[anim] ?? ANIMATION_SPECS.idle;
  // Pick a signature expressive frame for portrait previews
  const frameIndex =
    anim === 'attack'
      ? 2
      : anim === 'heavy_attack' || anim === 'special'
        ? 4
        : anim === 'victory'
          ? 1
          : 0;

  drawChibiFrame(
    ctx,
    appearance,
    equipped,
    anim,
    frameIndex,
    spec.frames,
    SPRITE_FRAME_SIZE
  );

  const dataUrl = canvas.toDataURL('image/png');
  if (portraitCache.size >= MAX_PORTRAIT_CACHE) {
    const firstKey = portraitCache.keys().next().value;
    if (firstKey !== undefined) {
      portraitCache.delete(firstKey);
    }
  }
  portraitCache.set(cacheKey, dataUrl);
  return dataUrl;
}
