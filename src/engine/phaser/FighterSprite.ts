// ============================================================================
// BRUTE LEGENDS — Expressive Phaser 3 FighterSprite Wrapper (Real AI Sprites)
// ============================================================================

import Phaser from 'phaser';
import type { AnimationName, EquippedGear, FighterAppearance } from '@shared/types';
import { ALL_ANIMATIONS, ANIMATION_SPECS, SPRITE_FRAME_SIZE } from '@shared/constants';
import {
  AI_DUMMY_ASSET,
  AI_HERO_SPRITESHEET,
  AI_RIVALS,
  AI_WEAPONS,
  resolveWeaponSprite,
} from '../art/aiAssets';
import { registerFighterSpritesheetInPhaser } from '../art/spritesheetBaker';

export interface PlayAnimOptions {
  returnToIdle?: boolean;
  speedScale?: number;
  onComplete?: () => void;
}

export interface FighterSpriteOptions {
  rivalSpriteKey?: string;
}

type RenderMode = 'ai_hero' | 'ai_rival' | 'procedural_fallback';

interface WeaponPoseState {
  angleDeg: number;
  offX: number;
  offY: number;
  scaleMult: number;
  alpha: number;
  behindBody: boolean;
}

interface RivalPoseState {
  scaleX: number;
  scaleY: number;
  angleDeg: number;
  originXOffset: number;
  originYOffset: number;
  alpha: number;
}

const AI_HERO_ANIM_PREFIX = 'ai_hero';
const AI_ORIGIN_Y = 0.91;
const FALLBACK_ORIGIN_Y = 0.86;
const AI_FRAME_SIZE = AI_HERO_SPRITESHEET.frameWidth; // 256

/**
 * Calibrated frame rates for the 4-frame-per-row AI hero spritesheet so every
 * combat & emote animation feels snappy, readable, and expressive.
 */
const AI_HERO_FRAME_RATES: Record<AnimationName, number> = {
  idle: 5.5,
  walk: 7.5,
  run: 10.5,
  attack: 11.5,
  heavy_attack: 9.0,
  hit: 10.0,
  dodge: 11.5,
  block: 9.5,
  victory: 6.5,
  defeat: 6.0,
  special: 9.5,
};

/**
 * Preloads the real AI hero spritesheet and all deduplicated AI weapon PNGs.
 */
export function preloadHeroAiAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(AI_HERO_SPRITESHEET.key)) {
    scene.load.spritesheet(AI_HERO_SPRITESHEET.key, AI_HERO_SPRITESHEET.url, {
      frameWidth: AI_HERO_SPRITESHEET.frameWidth,
      frameHeight: AI_HERO_SPRITESHEET.frameHeight,
    });
  }

  const seenWeaponKeys = new Set<string>();
  for (const weapon of Object.values(AI_WEAPONS)) {
    if (seenWeaponKeys.has(weapon.key)) continue;
    seenWeaponKeys.add(weapon.key);
    if (!scene.textures.exists(weapon.key)) {
      scene.load.image(weapon.key, weapon.url);
    }
  }
}

/**
 * Preloads all 6 real AI rival/boss transparent PNG sprites.
 */
export function preloadRivalAiAssets(scene: Phaser.Scene): void {
  const seenRivalKeys = new Set<string>();
  for (const rival of Object.values(AI_RIVALS)) {
    if (seenRivalKeys.has(rival.key)) continue;
    seenRivalKeys.add(rival.key);
    if (!scene.textures.exists(rival.key)) {
      scene.load.image(rival.key, rival.url);
    }
  }
}

/**
 * Preloads the real AI dojo training dummy PNG sprite.
 */
export function preloadDummyAiAsset(scene: Phaser.Scene): void {
  if (!scene.textures.exists(AI_DUMMY_ASSET.key)) {
    scene.load.image(AI_DUMMY_ASSET.key, AI_DUMMY_ASSET.url);
  }
}

function hasUsableTexture(scene: Phaser.Scene, key: string | undefined): key is string {
  if (!key || !scene.textures.exists(key)) return false;
  const tex = scene.textures.get(key);
  return Boolean(tex && tex.key !== '__MISSING');
}

function registerAiHeroAnimations(scene: Phaser.Scene): boolean {
  if (!hasUsableTexture(scene, AI_HERO_SPRITESHEET.key)) return false;

  const tex = scene.textures.get(AI_HERO_SPRITESHEET.key);
  const cols = AI_HERO_SPRITESHEET.cols;
  const expectedFrames = cols * AI_HERO_SPRITESHEET.rows;
  if (tex.frameTotal < expectedFrames) {
    return false;
  }

  for (let row = 0; row < ALL_ANIMATIONS.length; row++) {
    const animName = ALL_ANIMATIONS[row];
    const animKey = `${AI_HERO_ANIM_PREFIX}:${animName}`;
    if (scene.anims.exists(animKey)) continue;

    const start = row * cols;
    const end = start + cols - 1;
    const spec = ANIMATION_SPECS[animName];

    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(AI_HERO_SPRITESHEET.key, { start, end }),
      frameRate: AI_HERO_FRAME_RATES[animName],
      repeat: spec.repeat,
    });
  }

  return true;
}

function buildVisualFingerprint(appearance: FighterAppearance, equipped: EquippedGear): string {
  return [
    appearance.skinColor,
    appearance.hairStyle,
    appearance.hairColor,
    appearance.eyeStyle,
    appearance.eyeColor,
    appearance.outfitPrimary,
    appearance.outfitSecondary,
    equipped.weapon?.visualType ?? 'fists',
    equipped.helmet?.visualType ?? 'none',
    equipped.armor?.visualType ?? 'tunic',
    equipped.gloves?.visualType ?? 'none',
    equipped.boots?.visualType ?? 'sandals',
    equipped.accessory?.visualType ?? 'none',
  ].join('|');
}

/**
 * Expressive Phaser 3 FighterSprite wrapper supporting:
 * 1. Real AI Hero Spritesheet (256x256, 4x11 grid) + live AI Equipped Weapon overlay
 * 2. Real AI Rival/Boss PNG Sprites (256x256) with lively tween choreography for all 11 animations
 * 3. Automatic graceful fallback if an AI texture failed to load
 */
export class FighterSprite {
  public readonly sprite: Phaser.GameObjects.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly mode: RenderMode;
  private readonly rivalSpriteKey?: string;

  private textureKey: string;
  private visualFingerprint: string;
  private currentAnim: AnimationName = 'idle';
  private facing: 'left' | 'right' = 'right';
  private animSpeedScale = 1;
  private baseX: number;
  private baseY: number;
  private baseScale: number;

  // Ground contact shadow + Hero AI weapon overlay + Rival special glow aura
  private shadow: Phaser.GameObjects.Ellipse;
  private weaponSprite: Phaser.GameObjects.Image | null = null;
  private currentWeaponKey: string | null = null;
  private specialAura: Phaser.GameObjects.Ellipse | null = null;

  // Composed transform channels (prevents squash/choreo tweens from fighting scene position tweens)
  private squashMul = { x: 1, y: 1 };
  private rivalPose: RivalPoseState = {
    scaleX: 1,
    scaleY: 1,
    angleDeg: 0,
    originXOffset: 0,
    originYOffset: 0,
    alpha: 1,
  };
  private weaponPose: WeaponPoseState = {
    angleDeg: -8,
    offX: 0,
    offY: 0,
    scaleMult: 1,
    alpha: 1,
    behindBody: false,
  };

  private isHitFlashing = false;
  private persistentTint: number | null = null;

  private squashTween: Phaser.Tweens.Tween | null = null;
  private choreoTweens: Phaser.Tweens.Tween[] = [];
  private weaponTweens: Phaser.Tweens.Tween[] = [];
  private choreoTimers: Phaser.Time.TimerEvent[] = [];
  private hitFlashTimer: Phaser.Time.TimerEvent | null = null;
  private animCompleteListener:
    | ((animation: Phaser.Animations.Animation) => void)
    | null = null;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    appearance: FighterAppearance,
    equipped: EquippedGear,
    scale = 1,
    options?: FighterSpriteOptions
  ) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.baseScale = scale;
    this.rivalSpriteKey = options?.rivalSpriteKey;
    this.visualFingerprint = buildVisualFingerprint(appearance, equipped);

    // Pick best available sprite mode
    if (this.rivalSpriteKey && hasUsableTexture(scene, this.rivalSpriteKey)) {
      this.mode = 'ai_rival';
      this.textureKey = this.rivalSpriteKey;
      this.sprite = scene.add.sprite(x, y, this.textureKey);
      this.sprite.setOrigin(0.5, AI_ORIGIN_Y);
    } else if (!this.rivalSpriteKey && registerAiHeroAnimations(scene)) {
      this.mode = 'ai_hero';
      this.textureKey = AI_HERO_SPRITESHEET.key;
      this.sprite = scene.add.sprite(x, y, this.textureKey, 0);
      this.sprite.setOrigin(0.5, AI_ORIGIN_Y);
    } else {
      this.mode = 'procedural_fallback';
      this.textureKey = registerFighterSpritesheetInPhaser(scene, appearance, equipped);
      this.sprite = scene.add.sprite(x, y, this.textureKey, 0);
      this.sprite.setOrigin(0.5, FALLBACK_ORIGIN_Y);
    }

    this.sprite.setScale(this.getEffectiveScale());

    // Ground contact shadow sitting cleanly under the fighter's boots
    this.shadow = scene.add
      .ellipse(x, y + 3 * scale, 134 * scale, 26 * scale, 0x1a120e, 0.34)
      .setDepth(this.sprite.depth - 0.5);

    // Equip real AI weapon overlay for the Hero
    if (this.mode === 'ai_hero') {
      this.syncWeaponTexture(equipped);
    }

    // Keep shadow, weapon overlay, and rival pose frame-locked to sprite every frame
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncAttachments, this);

    this.playAnim('idle');
    this.syncAttachments();
  }

  /**
   * Updates equipped weapon overlay / fallback texture live without breaking animations.
   */
  public updateVisuals(appearance: FighterAppearance, equipped: EquippedGear): boolean {
    if (this.destroyed || !this.sprite.scene) return false;

    const nextFingerprint = buildVisualFingerprint(appearance, equipped);

    if (this.mode === 'ai_hero') {
      const weaponChanged = this.syncWeaponTexture(equipped);
      const changed = weaponChanged || nextFingerprint !== this.visualFingerprint;
      this.visualFingerprint = nextFingerprint;
      if (changed) {
        this.applyWeaponAnimation(this.currentAnim, this.animSpeedScale);
        this.syncAttachments();
      }
      return changed;
    }

    if (this.mode === 'ai_rival') {
      const changed = nextFingerprint !== this.visualFingerprint;
      this.visualFingerprint = nextFingerprint;
      return changed;
    }

    // Procedural fallback mode
    const nextKey = registerFighterSpritesheetInPhaser(this.scene, appearance, equipped);
    this.visualFingerprint = nextFingerprint;
    if (nextKey === this.textureKey) {
      return false;
    }

    const prevAnim = this.currentAnim;
    const prevSpeed = this.sprite.anims.timeScale || 1;
    const isOneShot = ANIMATION_SPECS[prevAnim].repeat === 0;

    this.textureKey = nextKey;
    this.sprite.setTexture(nextKey, 0);

    this.playAnim(prevAnim, {
      returnToIdle: isOneShot && prevAnim !== 'defeat',
      speedScale: prevSpeed,
    });
    return true;
  }

  /**
   * Plays one of the 11 animations with optional speed scaling, completion callback,
   * and smooth automatic return to `idle` for one-shot actions.
   */
  public playAnim(anim: AnimationName, options?: PlayAnimOptions): void {
    if (this.destroyed || !this.sprite.scene) return;

    const speedScale = Math.max(0.25, options?.speedScale ?? this.animSpeedScale ?? 1);
    this.animSpeedScale = speedScale;
    this.currentAnim = anim;

    if (this.mode === 'ai_rival') {
      this.playRivalChoreography(anim, options, speedScale);
      return;
    }

    const animPrefix = this.mode === 'ai_hero' ? AI_HERO_ANIM_PREFIX : this.textureKey;
    const animKey = `${animPrefix}:${anim}`;
    if (!this.scene.anims.exists(animKey)) return;

    this.clearAnimCompleteListener();

    const spec = ANIMATION_SPECS[anim];
    this.sprite.anims.timeScale = speedScale;

    const ignoreIfPlaying = spec.repeat === -1 && this.sprite.anims.currentAnim?.key === animKey;
    this.sprite.play(animKey, ignoreIfPlaying);

    if (this.mode === 'ai_hero') {
      this.applyWeaponAnimation(anim, speedScale);
    }

    if (spec.repeat === 0) {
      const shouldReturnToIdle = options?.returnToIdle ?? anim !== 'defeat';
      const onComplete = options?.onComplete;

      this.animCompleteListener = (completedAnim: Phaser.Animations.Animation) => {
        if (this.destroyed || completedAnim.key !== animKey) return;
        this.clearAnimCompleteListener();
        onComplete?.();
        if (shouldReturnToIdle && !this.destroyed && this.currentAnim === anim) {
          this.playAnim('idle', { speedScale: 1 });
        }
      };

      this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.animCompleteListener);
    }
  }

  public setFacing(facing: 'left' | 'right'): void {
    if (this.destroyed) return;
    this.facing = facing;
    this.sprite.setFlipX(facing === 'left');
    this.syncAttachments();
  }

  public getFacing(): 'left' | 'right' {
    return this.facing;
  }

  public getCurrentAnim(): AnimationName {
    return this.currentAnim;
  }

  public setAnimSpeedScale(speedScale: number): void {
    if (this.destroyed) return;
    this.animSpeedScale = Math.max(0.25, speedScale);
    this.sprite.anims.timeScale = this.animSpeedScale;
  }

  /**
   * High-visibility hit feedback that works identically in Phaser.CANVAS and WebGL.
   */
  public flashHit(): void {
    if (this.destroyed || !this.sprite.scene) return;

    if (this.hitFlashTimer) {
      this.hitFlashTimer.remove(false);
      this.hitFlashTimer = null;
    }

    this.isHitFlashing = true;

    try {
      this.sprite.setTintFill(0xffffff);
      if (this.weaponSprite && this.weaponSprite.visible) {
        this.weaponSprite.setTintFill(0xffffff);
      }
    } catch {
      // Ignore if renderer does not support tint fill
    }
    this.sprite.setAlpha(0.62);

    this.hitFlashTimer = this.scene.time.delayedCall(95, () => {
      this.hitFlashTimer = null;
      this.isHitFlashing = false;
      if (this.destroyed || !this.sprite.scene) return;
      this.restoreVisualTintAndAlpha();
    });
  }

  /**
   * Expressive anime squash-and-stretch impulse returning smoothly to baseScale.
   */
  public squashPulse(sx: number, sy: number, duration = 170): void {
    if (this.destroyed || !this.sprite.scene) return;

    if (this.squashTween) {
      this.squashTween.stop();
      this.squashTween = null;
    }

    this.squashMul.x = sx;
    this.squashMul.y = sy;
    this.applyComposedScale();

    this.squashTween = this.scene.tweens.add({
      targets: this.squashMul,
      x: 1,
      y: 1,
      duration: Math.max(40, duration),
      ease: 'Back.easeOut',
      onUpdate: () => {
        if (!this.destroyed) this.applyComposedScale();
      },
      onComplete: () => {
        this.squashMul.x = 1;
        this.squashMul.y = 1;
        this.squashTween = null;
        if (!this.destroyed) this.applyComposedScale();
      },
    });
  }

  public setBaseScale(scale: number): void {
    if (this.destroyed) return;
    this.baseScale = scale;
    this.applyComposedScale();
    this.syncAttachments();
  }

  public getBaseScale(): number {
    return this.baseScale;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public getBasePosition(): { x: number; y: number } {
    return { x: this.baseX, y: this.baseY };
  }

  public setBasePosition(x: number, y: number, moveSprite = true): void {
    this.baseX = x;
    this.baseY = y;
    if (!this.destroyed && moveSprite) {
      this.sprite.setPosition(x, y);
      this.syncAttachments();
    }
  }

  public setDepth(depth: number): void {
    if (this.destroyed) return;
    this.sprite.setDepth(depth);
    this.syncAttachments();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncAttachments, this);
    this.clearAnimCompleteListener();
    this.stopChoreoTweensAndTimers();
    this.stopWeaponTweens();

    if (this.squashTween) {
      this.squashTween.stop();
      this.squashTween = null;
    }

    if (this.hitFlashTimer) {
      this.hitFlashTimer.remove(false);
      this.hitFlashTimer = null;
    }

    if (this.specialAura && this.specialAura.scene) {
      this.specialAura.destroy();
    }
    this.specialAura = null;

    if (this.weaponSprite && this.weaponSprite.scene) {
      this.weaponSprite.destroy();
    }
    this.weaponSprite = null;

    if (this.shadow && this.shadow.scene) {
      this.shadow.destroy();
    }

    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy();
    }
  }

  // ---- Equipped AI Weapon Overlay (Hero Mode) ----

  private syncWeaponTexture(equipped: EquippedGear): boolean {
    const resolved = resolveWeaponSprite(equipped.weapon?.visualType);
    const nextKey = resolved && hasUsableTexture(this.scene, resolved.key) ? resolved.key : null;

    if (nextKey === this.currentWeaponKey) {
      return false;
    }

    this.currentWeaponKey = nextKey;

    if (!nextKey) {
      if (this.weaponSprite) {
        this.weaponSprite.setVisible(false);
      }
      return true;
    }

    if (!this.weaponSprite) {
      this.weaponSprite = this.scene.add
        .image(this.sprite.x, this.sprite.y, nextKey)
        .setDepth(this.sprite.depth + 0.5);
    } else {
      this.weaponSprite.setTexture(nextKey).setVisible(true);
    }

    return true;
  }

  private applyWeaponAnimation(anim: AnimationName, speedScale: number): void {
    if (!this.weaponSprite || !this.currentWeaponKey) return;
    this.stopWeaponTweens();

    const dur = (ms: number) => Math.max(45, Math.round(ms / speedScale));

    // Reset default visibility/layering
    this.weaponPose.behindBody = false;
    this.weaponPose.alpha = 1;
    this.weaponPose.scaleMult = 1;

    switch (anim) {
      case 'idle': {
        this.weaponPose.angleDeg = -10;
        this.weaponPose.offX = 0;
        this.weaponPose.offY = 0;
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: -2,
            offY: -5,
            duration: dur(520),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        );
        break;
      }

      case 'walk':
      case 'run': {
        const isRun = anim === 'run';
        this.weaponPose.angleDeg = isRun ? -28 : -18;
        this.weaponPose.offX = isRun ? -8 : -4;
        this.weaponPose.offY = isRun ? -6 : -2;
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: isRun ? -10 : -4,
            offY: isRun ? 5 : 3,
            duration: dur(isRun ? 150 : 230),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        );
        break;
      }

      case 'attack': {
        this.weaponPose.angleDeg = -20;
        this.weaponPose.offX = -4;
        this.weaponPose.offY = -4;
        const windup = this.scene.tweens.add({
          targets: this.weaponPose,
          angleDeg: -66,
          offX: -16,
          offY: -18,
          scaleMult: 1.06,
          duration: dur(85),
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (this.destroyed) return;
            const slash = this.scene.tweens.add({
              targets: this.weaponPose,
              angleDeg: 72,
              offX: 28,
              offY: 12,
              scaleMult: 1.18,
              duration: dur(105),
              ease: 'Cubic.easeOut',
              onComplete: () => {
                if (this.destroyed) return;
                this.trackWeaponTween(
                  this.scene.tweens.add({
                    targets: this.weaponPose,
                    angleDeg: -10,
                    offX: 0,
                    offY: 0,
                    scaleMult: 1,
                    duration: dur(140),
                    ease: 'Quad.easeInOut',
                  })
                );
              },
            });
            this.trackWeaponTween(slash);
          },
        });
        this.trackWeaponTween(windup);
        break;
      }

      case 'heavy_attack': {
        this.weaponPose.angleDeg = -25;
        this.weaponPose.offX = -6;
        this.weaponPose.offY = -6;
        const windup = this.scene.tweens.add({
          targets: this.weaponPose,
          angleDeg: -102,
          offX: -20,
          offY: -36,
          scaleMult: 1.14,
          duration: dur(140),
          ease: 'Back.easeOut',
          onComplete: () => {
            if (this.destroyed) return;
            const slam = this.scene.tweens.add({
              targets: this.weaponPose,
              angleDeg: 92,
              offX: 34,
              offY: 28,
              scaleMult: 1.26,
              duration: dur(110),
              ease: 'Expo.easeOut',
              onComplete: () => {
                if (this.destroyed) return;
                this.trackWeaponTween(
                  this.scene.tweens.add({
                    targets: this.weaponPose,
                    angleDeg: -10,
                    offX: 0,
                    offY: 0,
                    scaleMult: 1,
                    duration: dur(170),
                    ease: 'Quad.easeInOut',
                  })
                );
              },
            });
            this.trackWeaponTween(slam);
          },
        });
        this.trackWeaponTween(windup);
        break;
      }

      case 'special': {
        this.weaponPose.angleDeg = -40;
        this.weaponPose.offX = 0;
        this.weaponPose.offY = -12;
        const charge = this.scene.tweens.add({
          targets: this.weaponPose,
          angleDeg: -130,
          offX: 4,
          offY: -44,
          scaleMult: 1.3,
          duration: dur(135),
          ease: 'Back.easeOut',
          onComplete: () => {
            if (this.destroyed) return;
            const unleash = this.scene.tweens.add({
              targets: this.weaponPose,
              angleDeg: 98,
              offX: 36,
              offY: 16,
              scaleMult: 1.28,
              duration: dur(125),
              ease: 'Cubic.easeOut',
              onComplete: () => {
                if (this.destroyed) return;
                this.trackWeaponTween(
                  this.scene.tweens.add({
                    targets: this.weaponPose,
                    angleDeg: -10,
                    offX: 0,
                    offY: 0,
                    scaleMult: 1,
                    duration: dur(165),
                    ease: 'Quad.easeInOut',
                  })
                );
              },
            });
            this.trackWeaponTween(unleash);
          },
        });
        this.trackWeaponTween(charge);
        break;
      }

      case 'block': {
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: -42,
            offX: 12,
            offY: -12,
            scaleMult: 1.06,
            duration: dur(110),
            ease: 'Quad.easeOut',
          })
        );
        break;
      }

      case 'hit': {
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: -46,
            offX: -18,
            offY: -4,
            duration: dur(95),
            yoyo: true,
            ease: 'Quad.easeOut',
          })
        );
        break;
      }

      case 'dodge': {
        this.weaponPose.behindBody = true;
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: -36,
            offX: -14,
            offY: -10,
            alpha: 0.72,
            duration: dur(120),
            yoyo: true,
            ease: 'Sine.easeOut',
          })
        );
        break;
      }

      case 'victory': {
        this.weaponPose.angleDeg = -46;
        this.weaponPose.offX = 10;
        this.weaponPose.offY = -36;
        this.weaponPose.scaleMult = 1.08;
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: -26,
            offY: -48,
            duration: dur(280),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        );
        break;
      }

      case 'defeat': {
        this.weaponPose.behindBody = true;
        this.trackWeaponTween(
          this.scene.tweens.add({
            targets: this.weaponPose,
            angleDeg: 76,
            offX: 22,
            offY: 72,
            alpha: 0.72,
            duration: dur(320),
            ease: 'Bounce.easeOut',
          })
        );
        break;
      }
    }
  }

  // ---- Lively Tween Choreography for AI Rival/Boss Sprites ----

  private playRivalChoreography(
    anim: AnimationName,
    options: PlayAnimOptions | undefined,
    speedScale: number
  ): void {
    this.stopChoreoTweensAndTimers();
    this.clearSpecialAura();

    const dir = this.facing === 'right' ? 1 : -1;
    const dur = (ms: number) => Math.max(40, Math.round(ms / speedScale));
    const spec = ANIMATION_SPECS[anim];
    const shouldReturnToIdle = options?.returnToIdle ?? anim !== 'defeat';

    // Reset neutral rival tint/alpha unless defeat or special overrides it
    if (anim !== 'defeat') {
      this.persistentTint = null;
      this.rivalPose.alpha = 1;
      if (!this.isHitFlashing) {
        this.restoreVisualTintAndAlpha();
      }
    }

    const finishOneShot = () => {
      if (this.destroyed || this.currentAnim !== anim) return;
      options?.onComplete?.();
      if (shouldReturnToIdle && !this.destroyed && this.currentAnim === anim) {
        this.playAnim('idle', { speedScale: 1 });
      }
    };

    switch (anim) {
      case 'idle': {
        this.rivalPose.angleDeg = 0;
        this.rivalPose.originXOffset = 0;
        this.rivalPose.originYOffset = 0;
        this.rivalPose.scaleX = 1;
        this.rivalPose.scaleY = 1;
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            scaleY: 1.038,
            scaleX: 0.978,
            originYOffset: 0.008,
            duration: dur(540),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        );
        break;
      }

      case 'walk': {
        this.rivalPose.angleDeg = dir * 4;
        this.rivalPose.originXOffset = 0;
        this.rivalPose.originYOffset = 0;
        this.rivalPose.scaleX = 1;
        this.rivalPose.scaleY = 1;
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: dir * 8,
            originYOffset: 0.032,
            scaleY: 1.03,
            duration: dur(210),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        );
        break;
      }

      case 'run': {
        this.rivalPose.angleDeg = dir * 11;
        this.rivalPose.originXOffset = -dir * 0.03;
        this.rivalPose.originYOffset = 0;
        this.rivalPose.scaleX = 1.04;
        this.rivalPose.scaleY = 0.96;
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: dir * 16,
            originYOffset: 0.055,
            scaleX: 0.97,
            scaleY: 1.05,
            duration: dur(135),
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeInOut',
          })
        );
        break;
      }

      case 'attack': {
        // Snappy windup -> forward lunge tilt -> crisp recovery
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 12,
            originXOffset: dir * 0.045,
            originYOffset: 0.02,
            scaleX: 0.94,
            scaleY: 1.06,
            duration: dur(85),
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: dir * 20,
                  originXOffset: -dir * 0.12,
                  originYOffset: 0.01,
                  scaleX: 1.14,
                  scaleY: 0.9,
                  duration: dur(95),
                  ease: 'Back.easeOut',
                  onComplete: () => {
                    if (this.destroyed) return;
                    this.trackChoreoTween(
                      this.scene.tweens.add({
                        targets: this.rivalPose,
                        angleDeg: 0,
                        originXOffset: 0,
                        originYOffset: 0,
                        scaleX: 1,
                        scaleY: 1,
                        duration: dur(145),
                        ease: 'Quad.easeInOut',
                        onComplete: finishOneShot,
                      })
                    );
                  },
                })
              );
            },
          })
        );
        break;
      }

      case 'heavy_attack': {
        // Dramatic windup leap -> massive overhead slam -> recovery
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 20,
            originXOffset: dir * 0.06,
            originYOffset: 0.075,
            scaleX: 0.92,
            scaleY: 1.12,
            duration: dur(145),
            ease: 'Cubic.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: dir * 26,
                  originXOffset: -dir * 0.16,
                  originYOffset: -0.01,
                  scaleX: 1.2,
                  scaleY: 0.84,
                  duration: dur(110),
                  ease: 'Expo.easeOut',
                  onComplete: () => {
                    if (this.destroyed) return;
                    this.trackChoreoTween(
                      this.scene.tweens.add({
                        targets: this.rivalPose,
                        angleDeg: 0,
                        originXOffset: 0,
                        originYOffset: 0,
                        scaleX: 1,
                        scaleY: 1,
                        duration: dur(175),
                        ease: 'Back.easeOut',
                        onComplete: finishOneShot,
                      })
                    );
                  },
                })
              );
            },
          })
        );
        break;
      }

      case 'hit': {
        // Sharp backward recoil -> bounce recovery
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 18,
            originXOffset: dir * 0.09,
            originYOffset: 0.025,
            scaleX: 0.86,
            scaleY: 1.14,
            duration: dur(90),
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: 0,
                  originXOffset: 0,
                  originYOffset: 0,
                  scaleX: 1,
                  scaleY: 1,
                  duration: dur(165),
                  ease: 'Back.easeOut',
                  onComplete: finishOneShot,
                })
              );
            },
          })
        );
        break;
      }

      case 'dodge': {
        // Agile hop with ghostly alpha dip
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 16,
            originYOffset: 0.13,
            scaleX: 0.9,
            scaleY: 1.12,
            alpha: 0.72,
            duration: dur(130),
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: 0,
                  originYOffset: 0,
                  scaleX: 1,
                  scaleY: 1,
                  alpha: 1,
                  duration: dur(155),
                  ease: 'Quad.easeIn',
                  onComplete: finishOneShot,
                })
              );
            },
          })
        );
        break;
      }

      case 'block': {
        // Solid defensive brace
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 8,
            originXOffset: dir * 0.04,
            scaleX: 1.13,
            scaleY: 0.88,
            duration: dur(100),
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: 0,
                  originXOffset: 0,
                  scaleX: 1,
                  scaleY: 1,
                  delay: dur(90),
                  duration: dur(140),
                  ease: 'Back.easeOut',
                  onComplete: finishOneShot,
                })
              );
            },
          })
        );
        break;
      }

      case 'victory': {
        // Joyful celebratory bounce loop
        this.rivalPose.angleDeg = -dir * 4;
        this.rivalPose.originXOffset = 0;
        this.rivalPose.originYOffset = 0;
        this.rivalPose.scaleX = 1.04;
        this.rivalPose.scaleY = 0.96;
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: dir * 6,
            originYOffset: 0.11,
            scaleX: 0.96,
            scaleY: 1.08,
            duration: dur(260),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeOut',
          })
        );
        break;
      }

      case 'defeat': {
        // Dramatic tip-over collapse & dim (stays down)
        this.persistentTint = 0x8e8e9e;
        if (!this.isHitFlashing) {
          this.restoreVisualTintAndAlpha();
        }
        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 78,
            originXOffset: dir * 0.08,
            originYOffset: -0.11,
            scaleX: 1.04,
            scaleY: 0.94,
            alpha: 0.72,
            duration: dur(360),
            ease: 'Bounce.easeOut',
            onComplete: () => {
              options?.onComplete?.();
            },
          })
        );
        break;
      }

      case 'special': {
        // Golden glow pulse + floating power surge + fierce forward lunge!
        this.spawnRivalSpecialAura();
        this.persistentTint = 0xffe478;
        if (!this.isHitFlashing) {
          this.restoreVisualTintAndAlpha();
        }

        this.trackChoreoTween(
          this.scene.tweens.add({
            targets: this.rivalPose,
            angleDeg: -dir * 14,
            originYOffset: 0.1,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: dur(145),
            ease: 'Back.easeOut',
            onComplete: () => {
              if (this.destroyed) return;
              this.trackChoreoTween(
                this.scene.tweens.add({
                  targets: this.rivalPose,
                  angleDeg: dir * 24,
                  originXOffset: -dir * 0.16,
                  originYOffset: 0.02,
                  scaleX: 1.2,
                  scaleY: 0.88,
                  duration: dur(115),
                  ease: 'Expo.easeOut',
                  onComplete: () => {
                    if (this.destroyed) return;
                    this.persistentTint = null;
                    if (!this.isHitFlashing) {
                      this.restoreVisualTintAndAlpha();
                    }
                    this.clearSpecialAura();
                    this.trackChoreoTween(
                      this.scene.tweens.add({
                        targets: this.rivalPose,
                        angleDeg: 0,
                        originXOffset: 0,
                        originYOffset: 0,
                        scaleX: 1,
                        scaleY: 1,
                        duration: dur(175),
                        ease: 'Quad.easeInOut',
                        onComplete: finishOneShot,
                      })
                    );
                  },
                })
              );
            },
          })
        );
        break;
      }
    }

    // Safety fallback if a future one-shot anim didn't attach onComplete
    if (spec.repeat === 0 && anim === 'defeat') {
      // defeat stays down cleanly
    }
  }

  private spawnRivalSpecialAura(): void {
    this.clearSpecialAura();
    const s = this.baseScale;
    this.specialAura = this.scene.add
      .ellipse(this.sprite.x, this.sprite.y - 96 * s, 145 * s, 165 * s, 0xfbbf24, 0.34)
      .setDepth(this.sprite.depth - 0.25);

    this.trackChoreoTween(
      this.scene.tweens.add({
        targets: this.specialAura,
        scaleX: 1.32,
        scaleY: 1.26,
        alpha: 0.08,
        duration: 210,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );
  }

  private clearSpecialAura(): void {
    if (this.specialAura && this.specialAura.scene) {
      this.specialAura.destroy();
    }
    this.specialAura = null;
  }

  // ---- Frame-Locked Transform & Attachment Synchronization ----

  private getEffectiveScale(): number {
    if (this.mode === 'procedural_fallback') {
      // Keep fallback 160px sprites visually identical in size to 256px AI sprites
      return this.baseScale * (AI_FRAME_SIZE / SPRITE_FRAME_SIZE);
    }
    return this.baseScale;
  }

  private applyComposedScale(): void {
    if (this.destroyed || !this.sprite.scene) return;
    const eff = this.getEffectiveScale();
    const rx = this.mode === 'ai_rival' ? this.rivalPose.scaleX : 1;
    const ry = this.mode === 'ai_rival' ? this.rivalPose.scaleY : 1;
    this.sprite.setScale(eff * this.squashMul.x * rx, eff * this.squashMul.y * ry);
  }

  private syncAttachments(): void {
    if (this.destroyed || !this.sprite.scene) return;

    this.applyComposedScale();

    // 1. Apply rival choreography origin/angle/alpha without interfering with sprite.x/y tweens
    if (this.mode === 'ai_rival') {
      this.sprite.setOrigin(
        0.5 + this.rivalPose.originXOffset,
        AI_ORIGIN_Y + this.rivalPose.originYOffset
      );
      this.sprite.setAngle(this.rivalPose.angleDeg);
      if (!this.isHitFlashing) {
        this.sprite.setAlpha(this.rivalPose.alpha);
      }
    }

    const sx = this.sprite.scaleX;
    const sy = this.sprite.scaleY;
    const dir = this.facing === 'right' ? 1 : -1;

    // 2. Sync ground contact shadow right under the boots
    if (this.shadow && this.shadow.scene) {
      const airLift =
        this.mode === 'ai_rival' ? Math.max(0, this.rivalPose.originYOffset) : 0;
      const airShrink = Phaser.Math.Clamp(1 - airLift * 2.4, 0.58, 1);
      this.shadow.setPosition(this.sprite.x, this.sprite.y + 3 * this.baseScale);
      this.shadow.setDisplaySize(
        134 * this.baseScale * this.squashMul.x * airShrink,
        26 * this.baseScale * airShrink
      );
      this.shadow.setDepth(this.sprite.depth - 0.5);
      this.shadow.setAlpha(0.34 * airShrink * Math.min(1, this.sprite.alpha + 0.15));
      this.shadow.setVisible(this.sprite.visible);
    }

    // 3. Sync Rival special golden aura glow
    if (this.specialAura && this.specialAura.scene) {
      this.specialAura.setPosition(this.sprite.x, this.sprite.y - 96 * this.baseScale);
      this.specialAura.setDepth(this.sprite.depth - 0.25);
    }

    // 4. Sync Hero real AI equipped weapon overlay
    if (this.weaponSprite && this.weaponSprite.scene) {
      const showWeapon = this.mode === 'ai_hero' && Boolean(this.currentWeaponKey) && this.sprite.visible;
      this.weaponSprite.setVisible(showWeapon);
      if (showWeapon) {
        // Anchor weapon handle at the hero's lead hand in 256px sprite space
        const handX = 42 + this.weaponPose.offX;
        const handY = -106 + this.weaponPose.offY;
        const weaponBaseScale = 0.56 * this.weaponPose.scaleMult;

        this.weaponSprite.setOrigin(dir > 0 ? 0.24 : 0.76, 0.78);
        this.weaponSprite.setFlipX(dir < 0);
        this.weaponSprite.setPosition(
          this.sprite.x + dir * handX * sx,
          this.sprite.y + handY * sy
        );
        this.weaponSprite.setScale(sx * weaponBaseScale, sy * weaponBaseScale);
        this.weaponSprite.setAngle(dir * this.weaponPose.angleDeg);
        this.weaponSprite.setDepth(
          this.sprite.depth + (this.weaponPose.behindBody ? -0.2 : 0.5)
        );
        if (!this.isHitFlashing) {
          this.weaponSprite.setAlpha(this.weaponPose.alpha * this.sprite.alpha);
        }
      }
    }
  }

  private restoreVisualTintAndAlpha(): void {
    try {
      if (this.persistentTint !== null) {
        this.sprite.setTint(this.persistentTint);
      } else {
        this.sprite.clearTint();
      }
      if (this.weaponSprite && this.weaponSprite.scene) {
        this.weaponSprite.clearTint();
      }
    } catch {
      // Ignore in renderers without tint support
    }

    this.sprite.setAlpha(this.mode === 'ai_rival' ? this.rivalPose.alpha : 1);
  }

  private trackChoreoTween(tween: Phaser.Tweens.Tween): void {
    this.choreoTweens.push(tween);
  }

  private trackWeaponTween(tween: Phaser.Tweens.Tween): void {
    this.weaponTweens.push(tween);
  }

  private stopChoreoTweensAndTimers(): void {
    for (const tw of this.choreoTweens) {
      tw.stop();
    }
    this.choreoTweens = [];

    for (const tm of this.choreoTimers) {
      tm.remove(false);
    }
    this.choreoTimers = [];
  }

  private stopWeaponTweens(): void {
    for (const tw of this.weaponTweens) {
      tw.stop();
    }
    this.weaponTweens = [];
  }

  private clearAnimCompleteListener(): void {
    if (this.animCompleteListener && this.sprite && this.sprite.scene) {
      this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.animCompleteListener);
    }
    this.animCompleteListener = null;
  }
}
