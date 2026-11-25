// ============================================================================
// BRUTE LEGENDS — ClickerScene (Interactive Dojo Training Dummy & Fever Mode)
// ============================================================================

import Phaser from 'phaser';
import type { AnimationName, ArenaTheme } from '@shared/types';
import { getSkinById } from '@shared/skinsCatalog';
import { AI_DUMMY_ASSET } from '../art/aiAssets';
import { registerVfxTexturesInPhaser } from '../art/vfxRenderer';
import { soundEngine } from '../audio/soundEffects';
import {
  FighterSprite,
  preloadDummyAiAsset,
  preloadHeroAiAssets,
  preloadRivalAiAssets,
} from './FighterSprite';
import {
  ARENA_ASSETS,
  DEFAULT_CLICKER_METRICS,
  type ClickerMetrics,
  type FighterVisualData,
  type PhaserSceneBridge,
} from './gameBridge';

const COMBO_DECAY_MS = 2200;
const FEVER_DURATION_MS = 6000;
const DUMMY_WOBBLE_MS = 480;
const DUMMY_FALLBACK_TEX_KEY = 'ai_training_dummy_fallback';

export class ClickerScene extends Phaser.Scene {
  private readonly bridge: PhaserSceneBridge;

  private currentArena: ArenaTheme = 'dojo';
  private metrics: ClickerMetrics = { ...DEFAULT_CLICKER_METRICS };
  private failedTextures = new Set<string>();

  private fallbackBg: Phaser.GameObjects.Graphics | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private feverTintOverlay: Phaser.GameObjects.Rectangle | null = null;
  private fighter: FighterSprite | null = null;
  private currentSkinId: string | undefined;

  // Real AI Training Dummy + ground shadow + Fever Mode golden aura
  private dummyShadow: Phaser.GameObjects.Ellipse | null = null;
  private dummyFeverAura: Phaser.GameObjects.Ellipse | null = null;
  private dummyFeverRing: Phaser.GameObjects.Image | null = null;
  private dummyImage: Phaser.GameObjects.Image | null = null;

  private fighterLungeTween: Phaser.Tweens.Tween | null = null;
  private dummySquashTween: Phaser.Tweens.Tween | null = null;
  private dummyWobbleTween: Phaser.Tweens.Tween | null = null;
  private dummyFlashTimer: Phaser.Time.TimerEvent | null = null;
  private isDummyFlashing = false;
  private activeVfx = new Set<Phaser.GameObjects.GameObject>();

  // Clicker combat state
  private combo = 0;
  private hitCount = 0;
  private lastClickTime = 0;
  private feverProgress = 0; // 0..100
  private isFever = false;
  private feverEndTime = 0;

  private autoPulseAccumMs = 0;
  private feverSparkAccumMs = 0;

  private dummyBaseX = 0;
  private dummyBaseY = 0;
  private baseScale = 1;

  private unsubscribers: (() => void)[] = [];
  private isShutDown = false;

  constructor(bridge: PhaserSceneBridge) {
    super({ key: 'ClickerScene' });
    this.bridge = bridge;
  }

  public preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failedTextures.add(file.key);
    });

    const dojo = ARENA_ASSETS.dojo;
    if (!this.textures.exists(dojo.key)) {
      this.load.image(dojo.key, dojo.url);
    }

    preloadHeroAiAssets(this);
    preloadRivalAiAssets(this);
    preloadDummyAiAsset(this);
  }

  public create(): void {
    this.isShutDown = false;
    registerVfxTexturesInPhaser(this);

    const state = this.bridge.getState();
    this.currentArena = state.arena ?? 'dojo';
    this.metrics = { ...(state.clickerMetrics ?? DEFAULT_CLICKER_METRICS) };

    this.fallbackBg = this.add.graphics().setDepth(0);
    this.applyDojoBackground();

    // Subtle fiery overlay activated during FEVER MODE
    this.feverTintOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xf97316, 0)
      .setOrigin(0, 0)
      .setDepth(3);

    this.createTrainingDummy();

    if (state.fighter) {
      this.syncFighter(state.fighter);
    }

    // Tap/click ANYWHERE on canvas to strike!
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    if (this.input.manager?.canvas) {
      this.input.manager.canvas.style.cursor = 'pointer';
    }

    this.unsubscribers.push(
      this.bridge.on('fighter:update', (fighterData) => {
        if (this.isShutDown) return;
        this.syncFighter(fighterData);
      }),
      this.bridge.on('clicker:metrics', (nextMetrics) => {
        if (this.isShutDown) return;
        this.metrics = { ...nextMetrics };
      }),
      this.bridge.on('clicker:strike-command', () => {
        if (this.isShutDown) return;
        this.performStrike();
      })
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.layoutScene(this.scale.width, this.scale.height);
  }

  public update(time: number, delta: number): void {
    if (this.isShutDown) return;
    const clampedDelta = Math.min(delta, 60);

    // 1. Combo decay after 2.2s idle
    if (this.combo > 0 && time - this.lastClickTime > COMBO_DECAY_MS) {
      this.combo = 0;
    }

    // 2. Fever Mode timer countdown, golden aura glow & rising flame embers
    if (this.isFever) {
      const remaining = this.feverEndTime - time;
      if (remaining <= 0) {
        this.exitFeverVisuals();
      } else {
        this.feverProgress = Math.max(0, Math.min(100, (remaining / FEVER_DURATION_MS) * 100));
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.013);

        if (this.feverTintOverlay) {
          this.feverTintOverlay.setAlpha(0.06 + pulse * 0.06);
        }

        if (this.dummyFeverAura) {
          this.dummyFeverAura.setVisible(true);
          this.dummyFeverAura.setAlpha(0.28 + pulse * 0.24);
          this.dummyFeverAura.setDisplaySize(
            (175 + pulse * 36) * this.baseScale,
            (210 + pulse * 40) * this.baseScale
          );
        }

        if (this.dummyFeverRing) {
          this.dummyFeverRing.setVisible(true);
          this.dummyFeverRing.setAlpha(0.45 + pulse * 0.35);
          this.dummyFeverRing.setScale((1.05 + pulse * 0.24) * this.baseScale);
          this.dummyFeverRing.rotation += (clampedDelta / 1000) * 2.4;
        }

        if (this.dummyImage && !this.isDummyFlashing) {
          try {
            this.dummyImage.setTint(0xffe69c);
          } catch {
            // Ignore in canvas renderer
          }
        }

        this.feverSparkAccumMs += clampedDelta;
        if (this.feverSparkAccumMs >= 145 && this.dummyImage) {
          this.feverSparkAccumMs = 0;
          this.spawnFeverEmber(
            this.dummyBaseX + Phaser.Math.Between(-46, 46) * this.baseScale,
            this.dummyBaseY - Phaser.Math.Between(36, 150) * this.baseScale
          );
        }
      }
    }

    // 3. Subtle 1-second auto-attack visual pulse when autoGoldPerSec > 0
    if (this.metrics.autoGoldPerSec > 0) {
      this.autoPulseAccumMs += clampedDelta;
      if (this.autoPulseAccumMs >= 1000) {
        this.autoPulseAccumMs -= 1000;
        this.triggerAutoIncomePulse();
      }
    } else {
      this.autoPulseAccumMs = 0;
    }
  }

  private exitFeverVisuals(): void {
    this.isFever = false;
    this.feverProgress = 0;
    if (this.feverTintOverlay) {
      this.feverTintOverlay.setAlpha(0);
    }
    if (this.dummyFeverAura) {
      this.dummyFeverAura.setVisible(false).setAlpha(0);
    }
    if (this.dummyFeverRing) {
      this.dummyFeverRing.setVisible(false).setAlpha(0);
    }
    if (this.dummyImage && !this.isDummyFlashing) {
      try {
        this.dummyImage.clearTint();
      } catch {
        // Ignore
      }
    }
  }

  private createTrainingDummy(): void {
    const canUseAiDummy =
      this.textures.exists(AI_DUMMY_ASSET.key) &&
      !this.failedTextures.has(AI_DUMMY_ASSET.key) &&
      this.textures.get(AI_DUMMY_ASSET.key).key !== '__MISSING';

    const texKey = canUseAiDummy ? AI_DUMMY_ASSET.key : this.ensureFallbackDummyTexture();

    // Ground contact shadow beneath the wooden dummy stump
    this.dummyShadow = this.add
      .ellipse(0, 0, 128, 28, 0x1a120e, 0.36)
      .setDepth(8);

    // Fiery golden aura glow shown behind the dummy during Fever Mode
    this.dummyFeverAura = this.add
      .ellipse(0, 0, 180, 215, 0xfbbf24, 0)
      .setDepth(9)
      .setVisible(false);

    this.dummyFeverRing = this.add
      .image(0, 0, 'vfx_ring')
      .setDepth(9)
      .setAlpha(0)
      .setVisible(false);
    try {
      this.dummyFeverRing.setTint(0xf97316);
    } catch {
      // Ignore in canvas
    }

    // Real AI transparent PNG training dummy pivoting at its wooden base
    this.dummyImage = this.add
      .image(0, 0, texKey)
      .setOrigin(0.5, 0.9)
      .setDepth(10);
  }

  private ensureFallbackDummyTexture(): string {
    if (this.textures.exists(DUMMY_FALLBACK_TEX_KEY)) {
      return DUMMY_FALLBACK_TEX_KEY;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(114, 150, 28, 82);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(128, 120, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(128, 120, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(128, 60, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    this.textures.addCanvas(DUMMY_FALLBACK_TEX_KEY, canvas);
    return DUMMY_FALLBACK_TEX_KEY;
  }

  private syncFighter(data: FighterVisualData | null): void {
    if (!data) {
      if (this.fighterLungeTween) {
        this.fighterLungeTween.stop();
        this.fighterLungeTween = null;
      }
      if (this.fighter) {
        this.fighter.destroy();
        this.fighter = null;
      }
      this.currentSkinId = undefined;
      return;
    }

    const layout = this.computeLayout(this.scale.width, this.scale.height);
    const nextSkinId = data.equippedSkinId;
    const playerSkinKey = getSkinById(nextSkinId).rivalSpriteKey;

    if (this.fighter && this.currentSkinId !== nextSkinId) {
      if (this.fighterLungeTween) {
        this.fighterLungeTween.stop();
        this.fighterLungeTween = null;
      }
      this.fighter.destroy();
      this.fighter = null;
    }

    if (!this.fighter) {
      this.currentSkinId = nextSkinId;
      this.fighter = new FighterSprite(
        this,
        layout.fighterX,
        layout.floorY,
        data.appearance,
        data.equipped,
        layout.scale,
        { rivalSpriteKey: playerSkinKey }
      );
      this.fighter.setFacing('right');
      this.fighter.setDepth(12);
    } else {
      this.fighter.updateVisuals(data.appearance, data.equipped);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.performStrike(pointer.x, pointer.y);
  }

  private performStrike(tapX?: number, tapY?: number): void {
    if (this.isShutDown) return;

    const now = this.time.now;
    this.combo += 1;
    this.hitCount += 1;
    this.lastClickTime = now;

    // Crit roll
    const critChance = Phaser.Math.Clamp(this.metrics.clickCritChance, 0, 0.95);
    const isCrit = Math.random() < critChance;

    // Fever gauge buildup & trigger
    let justTriggeredFever = false;
    if (!this.isFever) {
      const gain = isCrit ? 9 : 5;
      this.feverProgress = Math.min(100, this.feverProgress + gain);
      if (this.feverProgress >= 100) {
        this.isFever = true;
        this.feverEndTime = now + FEVER_DURATION_MS;
        justTriggeredFever = true;
      }
    }

    // Pick attack animation cadence
    let anim: AnimationName = 'attack';
    if (this.isFever || this.hitCount % 10 === 0) {
      anim = 'special';
    } else if (this.hitCount % 5 === 0) {
      anim = 'heavy_attack';
    }

    // Compute display damage & gold (mirrors server/store formula for crisp visual feedback)
    const feverMult = this.isFever ? 2 : 1;
    const critMult = isCrit ? 2 : 1;
    const displayDamage = Math.max(
      1,
      Math.round(this.metrics.clickDamage * critMult * feverMult)
    );
    const displayGold = Math.max(
      1,
      Math.round(this.metrics.goldPerClick * (isCrit ? 1.5 : 1) * feverMult)
    );

    // 1. Fighter lunge & animation
    if (this.fighter) {
      const base = this.fighter.getBasePosition();
      const lungeDist = Math.min(68, this.scale.width * 0.13);

      this.fighter.playAnim(anim, { returnToIdle: true, speedScale: 1.35 });
      this.fighter.squashPulse(1.14, 0.88, 130);

      if (this.fighterLungeTween) {
        this.fighterLungeTween.stop();
        this.fighterLungeTween = null;
      }

      // Snap slightly forward from base on rapid taps, then always return cleanly to base.x
      this.fighter.sprite.x = base.x + Math.min(14, lungeDist * 0.22);
      this.fighterLungeTween = this.tweens.add({
        targets: this.fighter.sprite,
        x: base.x + lungeDist,
        duration: 68,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!this.fighter || this.isShutDown) {
            this.fighterLungeTween = null;
            return;
          }
          const returnX = this.fighter.getBasePosition().x;
          this.fighterLungeTween = this.tweens.add({
            targets: this.fighter.sprite,
            x: returnX,
            duration: 120,
            delay: 20,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              this.fighterLungeTween = null;
            },
          });
        },
      });
    }

    // 2. AI Training Dummy: damped spring rotation wobble + squash-and-stretch pop + white hit flash
    this.triggerDummyImpact(isCrit || anim === 'special' || anim === 'heavy_attack');

    // 3. Impact VFX, coins, and camera punch
    const hitX = this.dummyBaseX - 18 * this.baseScale;
    const hitY = this.dummyBaseY - 104 * this.baseScale;

    this.spawnSlashVfx(hitX, hitY, isCrit || anim !== 'attack' ? 1.2 : 0.88);
    this.spawnCoinBurst(
      this.dummyBaseX,
      hitY,
      this.isFever ? 6 : isCrit ? 5 : 3
    );
    this.spawnSparkStarBurst(hitX, hitY, isCrit || this.isFever);

    if (isCrit || anim === 'special' || anim === 'heavy_attack') {
      this.spawnRingVfx(hitX, hitY, this.isFever ? 0xf97316 : 0xfbbf24);
    }

    // Subtle tap ripple where pointer clicked (if far from dummy)
    if (
      typeof tapX === 'number' &&
      typeof tapY === 'number' &&
      Phaser.Math.Distance.Between(tapX, tapY, hitX, hitY) > 70
    ) {
      this.spawnSparkMini(tapX, tapY);
    }

    // Camera shake
    if (justTriggeredFever) {
      this.cameras.main.shake(200, 0.012);
      this.spawnFeverBanner();
    } else if (isCrit || anim === 'special') {
      this.cameras.main.shake(110, 0.0075);
    } else {
      this.cameras.main.shake(65, 0.003);
    }

    // 4. Audio SFX
    if (justTriggeredFever || anim === 'special') {
      soundEngine.play('special');
    } else if (isCrit) {
      soundEngine.play('crit');
    } else {
      soundEngine.play('hit');
    }

    // 5. Floating comic numbers (-Damage & +Gold)
    const dmgLabel = isCrit ? `CRIT -${displayDamage}!` : `-${displayDamage}`;
    this.spawnFloatingText(
      this.dummyBaseX + Phaser.Math.Between(-24, 16),
      hitY - 42,
      dmgLabel,
      isCrit ? '#fde047' : this.isFever ? '#fb923c' : '#ffffff',
      isCrit ? 30 : 23
    );

    this.spawnFloatingText(
      this.dummyBaseX + Phaser.Math.Between(14, 42),
      hitY - 12,
      `+${displayGold} or`,
      '#fde047',
      this.isFever ? 22 : 18
    );

    // 6. Emit strike payload to React store
    const currentFeverPct = this.isFever
      ? Math.max(0, Math.min(100, ((this.feverEndTime - now) / FEVER_DURATION_MS) * 100))
      : this.feverProgress;

    this.bridge.emitClickerStrike({
      isCrit,
      isFever: this.isFever,
      combo: this.combo,
      feverProgress: Math.round(currentFeverPct),
    });
  }

  private triggerDummyImpact(isHeavy: boolean): void {
    if (!this.dummyImage || this.isShutDown) return;

    // A. Squash-and-stretch pop
    if (this.dummySquashTween) {
      this.dummySquashTween.stop();
      this.dummySquashTween = null;
    }
    const sx = isHeavy ? 1.22 : 1.16;
    const sy = isHeavy ? 0.8 : 0.85;
    this.dummyImage.setScale(this.baseScale * sx, this.baseScale * sy);
    this.dummySquashTween = this.tweens.add({
      targets: this.dummyImage,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: 185,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.dummySquashTween = null;
      },
    });

    // B. Damped spring rotation wobble oscillating cleanly around wooden stump pivot
    if (this.dummyWobbleTween) {
      this.dummyWobbleTween.stop();
      this.dummyWobbleTween = null;
    }
    const maxRadians = Phaser.Math.DegToRad(isHeavy || this.isFever ? 27 : 19);
    const kickOffsetX = (isHeavy ? 10 : 6) * this.baseScale;

    this.dummyWobbleTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: DUMMY_WOBBLE_MS,
      ease: 'Linear',
      onUpdate: (tween) => {
        if (!this.dummyImage || this.isShutDown) return;
        const t = tween.getValue() ?? 0;
        const decay = Math.exp(-3.4 * t);
        const osc = Math.sin(t * Math.PI * 3.5);
        this.dummyImage.setRotation(osc * decay * maxRadians);
        this.dummyImage.x = this.dummyBaseX + osc * decay * kickOffsetX;
      },
      onComplete: () => {
        this.dummyWobbleTween = null;
        if (this.dummyImage && !this.isShutDown) {
          this.dummyImage.setRotation(0);
          this.dummyImage.x = this.dummyBaseX;
        }
      },
    });

    // C. Crisp white hit flash
    this.flashDummyHit();
  }

  private flashDummyHit(): void {
    if (!this.dummyImage || this.isShutDown) return;

    if (this.dummyFlashTimer) {
      this.dummyFlashTimer.remove(false);
      this.dummyFlashTimer = null;
    }

    this.isDummyFlashing = true;
    try {
      this.dummyImage.setTintFill(0xffffff);
    } catch {
      // Ignore in canvas renderer
    }
    this.dummyImage.setAlpha(0.78);

    this.dummyFlashTimer = this.time.delayedCall(80, () => {
      this.dummyFlashTimer = null;
      this.isDummyFlashing = false;
      if (!this.dummyImage || this.isShutDown) return;
      try {
        if (this.isFever) {
          this.dummyImage.setTint(0xffe69c);
        } else {
          this.dummyImage.clearTint();
        }
      } catch {
        // Ignore
      }
      this.dummyImage.setAlpha(1);
    });
  }

  private triggerAutoIncomePulse(): void {
    if (!this.dummyImage || this.isShutDown) return;
    const autoAmt = Math.max(1, Math.round(this.metrics.autoGoldPerSec));
    const cx = this.dummyBaseX;
    const cy = this.dummyBaseY - 122 * this.baseScale;

    // Tiny golden spark + coin pop + "+Auto" float
    for (let i = 0; i < 2; i++) {
      const coin = this.add
        .image(cx + Phaser.Math.Between(-18, 18), cy, i === 0 ? 'vfx_coin' : 'vfx_spark')
        .setDepth(22)
        .setScale(0.36)
        .setAlpha(0.9);
      this.trackVfx(coin);

      this.tweens.add({
        targets: coin,
        x: coin.x + Phaser.Math.Between(-22, 22),
        y: coin.y - Phaser.Math.Between(32, 54),
        scale: 0.14,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseVfx(coin),
      });
    }

    this.spawnFloatingText(cx + 24, cy - 16, `+${autoAmt} auto`, '#fef08a', 16);
  }

  // ---- VFX Helpers ----

  private spawnSlashVfx(x: number, y: number, scaleMult: number): void {
    const slash = this.add
      .image(x, y, 'vfx_slash')
      .setDepth(24)
      .setScale(0.42 * scaleMult)
      .setRotation(Phaser.Math.FloatBetween(-0.55, 0.25));
    this.trackVfx(slash);

    this.tweens.add({
      targets: slash,
      scale: 1.12 * scaleMult,
      rotation: slash.rotation + 0.55,
      alpha: 0,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseVfx(slash),
    });
  }

  private spawnRingVfx(x: number, y: number, tint: number): void {
    const ring = this.add.image(x, y, 'vfx_ring').setDepth(20).setScale(0.32).setAlpha(0.95);
    try {
      ring.setTint(tint);
    } catch {
      // Ignore in canvas
    }
    this.trackVfx(ring);

    this.tweens.add({
      targets: ring,
      scale: 1.55,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseVfx(ring),
    });
  }

  private spawnCoinBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const coin = this.add
        .image(x, y, 'vfx_coin')
        .setDepth(25)
        .setScale(Phaser.Math.FloatBetween(0.45, 0.72));
      this.trackVfx(coin);

      const dx = Phaser.Math.Between(-72, 84);
      const peakY = y - Phaser.Math.Between(48, 105);
      const endY = y + Phaser.Math.Between(18, 52);

      this.tweens.add({
        targets: coin,
        x: x + dx,
        angle: Phaser.Math.Between(-240, 240),
        duration: 540,
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: coin,
        y: peakY,
        duration: 230,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!coin.scene) return;
          this.tweens.add({
            targets: coin,
            y: endY,
            alpha: 0,
            scale: 0.2,
            duration: 310,
            ease: 'Quad.easeIn',
            onComplete: () => this.releaseVfx(coin),
          });
        },
      });
    }
  }

  private spawnSparkStarBurst(x: number, y: number, big: boolean): void {
    const count = big ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const key = big && i % 2 === 0 ? 'vfx_star' : 'vfx_spark';
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(30, big ? 84 : 56);
      const p = this.add
        .image(x, y, key)
        .setDepth(26)
        .setScale(Phaser.Math.FloatBetween(0.32, big ? 0.72 : 0.54));
      this.trackVfx(p);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        angle: Phaser.Math.Between(-180, 180),
        scale: 0.08,
        alpha: 0,
        duration: Phaser.Math.Between(220, 380),
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseVfx(p),
      });
    }
  }

  private spawnSparkMini(x: number, y: number): void {
    const p = this.add.image(x, y, 'vfx_spark').setDepth(24).setScale(0.35).setAlpha(0.8);
    this.trackVfx(p);
    this.tweens.add({
      targets: p,
      scale: 0.75,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseVfx(p),
    });
  }

  private spawnFeverEmber(x: number, y: number): void {
    const ember = this.add
      .image(x, y, 'vfx_spark')
      .setDepth(18)
      .setScale(Phaser.Math.FloatBetween(0.32, 0.58))
      .setAlpha(0.9);
    try {
      ember.setTint(Phaser.Math.Between(0, 1) === 0 ? 0xfbbf24 : 0xf97316);
    } catch {
      // Ignore
    }
    this.trackVfx(ember);

    this.tweens.add({
      targets: ember,
      y: y - Phaser.Math.Between(42, 82),
      x: x + Phaser.Math.Between(-22, 22),
      scale: 0.1,
      alpha: 0,
      duration: 440,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseVfx(ember),
    });
  }

  private spawnFeverBanner(): void {
    const cx = this.scale.width * 0.5;
    const cy = this.scale.height * 0.24;

    const text = this.add
      .text(cx, cy, 'FEVER MODE x2 !', {
        fontFamily: '"Fredoka", "Impact", "Arial Black", sans-serif',
        fontSize: `${Math.round(Phaser.Math.Clamp(this.scale.width * 0.062, 24, 42))}px`,
        fontStyle: '900',
        color: '#fef08a',
        stroke: '#7c2d12',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.3);
    this.trackVfx(text);

    this.tweens.add({
      targets: text,
      scale: 1.08,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!text.scene) return;
        this.tweens.add({
          targets: text,
          y: cy - 26,
          alpha: 0,
          delay: 520,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => this.releaseVfx(text),
        });
      },
    });
  }

  private spawnFloatingText(
    x: number,
    y: number,
    label: string,
    color: string,
    fontSize: number
  ): void {
    const safeX = Phaser.Math.Clamp(x, 42, this.scale.width - 42);
    const safeY = Math.max(28, y);

    const text = this.add
      .text(safeX, safeY, label, {
        fontFamily: '"Fredoka", "Impact", "Arial Black", sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: '900',
        color,
        stroke: '#231917',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setScale(0.5);
    this.trackVfx(text);

    this.tweens.add({
      targets: text,
      scale: 1.12,
      duration: 90,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!text.scene) return;
        this.tweens.add({
          targets: text,
          y: safeY - 56,
          scale: 0.9,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => this.releaseVfx(text),
        });
      },
    });
  }

  private trackVfx(obj: Phaser.GameObjects.GameObject): void {
    this.activeVfx.add(obj);
  }

  private releaseVfx(obj: Phaser.GameObjects.GameObject): void {
    this.activeVfx.delete(obj);
    if (obj.scene) {
      obj.destroy();
    }
  }

  // ---- Background & Layout ----

  private applyDojoBackground(): void {
    const dojo = ARENA_ASSETS.dojo;
    const canUseImage =
      this.textures.exists(dojo.key) &&
      !this.failedTextures.has(dojo.key) &&
      this.textures.get(dojo.key).key !== '__MISSING';

    if (canUseImage) {
      if (!this.bgImage) {
        this.bgImage = this.add.image(0, 0, dojo.key).setDepth(1).setOrigin(0.5, 0.52);
      } else {
        this.bgImage.setTexture(dojo.key).setVisible(true);
      }
    } else if (this.bgImage) {
      this.bgImage.setVisible(false);
    }

    this.drawFallbackDojo(this.scale.width, this.scale.height);
    this.fitBackgroundImage(this.scale.width, this.scale.height);
  }

  private drawFallbackDojo(w: number, h: number): void {
    if (!this.fallbackBg) return;
    const g = this.fallbackBg;
    g.clear();

    const horizon = Math.floor(h * 0.64);
    g.fillGradientStyle(0xffedd5, 0xffedd5, 0xfdba74, 0xfdba74, 1);
    g.fillRect(0, 0, w, horizon);

    g.fillStyle(0xfef3c7, 0.32);
    g.fillCircle(w * 0.5, horizon * 0.5, Math.min(w, h) * 0.28);

    g.fillGradientStyle(0xb4733d, 0xb4733d, 0x7c4a21, 0x7c4a21, 1);
    g.fillRect(0, horizon, w, h - horizon);

    g.lineStyle(3, 0x231917, 0.35);
    g.lineBetween(0, horizon, w, horizon);
  }

  private fitBackgroundImage(w: number, h: number): void {
    if (!this.bgImage || !this.bgImage.visible) return;
    const tex = this.bgImage.texture.getSourceImage() as { width?: number; height?: number } | null;
    const imgW = tex?.width || 1024;
    const imgH = tex?.height || 576;
    const scale = Math.max(w / imgW, h / imgH);
    this.bgImage.setPosition(w * 0.5, h * 0.52);
    this.bgImage.setScale(scale);
  }

  private computeLayout(w: number, h: number) {
    // Adjust scale for 256x256 AI Hero & Training Dummy textures (~0.70x of legacy 160px scale)
    const scale = Phaser.Math.Clamp(Math.min(w * 0.56, h) / 205, 0.78, 1.55) * 0.7;
    return {
      fighterX: w * 0.3,
      dummyX: w * 0.7,
      floorY: h * 0.86,
      scale,
    };
  }

  private layoutScene(w: number, h: number): void {
    this.drawFallbackDojo(w, h);
    this.fitBackgroundImage(w, h);

    if (this.feverTintOverlay) {
      this.feverTintOverlay.setSize(w, h);
    }

    const layout = this.computeLayout(w, h);
    this.baseScale = layout.scale;
    this.dummyBaseX = layout.dummyX;
    this.dummyBaseY = layout.floorY;

    if (this.fighter) {
      this.fighter.setBasePosition(layout.fighterX, layout.floorY, true);
      this.fighter.setBaseScale(layout.scale);
    }

    if (this.dummyShadow) {
      this.dummyShadow.setPosition(layout.dummyX, layout.floorY + 3 * layout.scale);
      this.dummyShadow.setDisplaySize(132 * layout.scale, 26 * layout.scale);
    }

    if (this.dummyFeverAura) {
      this.dummyFeverAura.setPosition(layout.dummyX, layout.floorY - 100 * layout.scale);
      this.dummyFeverAura.setDisplaySize(180 * layout.scale, 215 * layout.scale);
    }

    if (this.dummyFeverRing) {
      this.dummyFeverRing.setPosition(layout.dummyX, layout.floorY - 102 * layout.scale);
      this.dummyFeverRing.setScale(1.1 * layout.scale);
    }

    if (this.dummyImage) {
      this.dummyImage.setPosition(layout.dummyX, layout.floorY);
      if (!this.dummySquashTween) {
        this.dummyImage.setScale(layout.scale);
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (this.isShutDown) return;
    this.layoutScene(gameSize.width, gameSize.height);
  }

  private cleanup(): void {
    if (this.isShutDown) return;
    this.isShutDown = true;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    if (this.dummyWobbleTween) {
      this.dummyWobbleTween.stop();
      this.dummyWobbleTween = null;
    }
    if (this.dummySquashTween) {
      this.dummySquashTween.stop();
      this.dummySquashTween = null;
    }
    if (this.fighterLungeTween) {
      this.fighterLungeTween.stop();
      this.fighterLungeTween = null;
    }
    if (this.dummyFlashTimer) {
      this.dummyFlashTimer.remove(false);
      this.dummyFlashTimer = null;
    }

    this.tweens.killAll();
    this.time.removeAllEvents();

    if (this.fighter) {
      this.fighter.destroy();
      this.fighter = null;
    }
    this.currentSkinId = undefined;

    if (this.dummyShadow && this.dummyShadow.scene) {
      this.dummyShadow.destroy();
    }
    this.dummyShadow = null;

    if (this.dummyFeverAura && this.dummyFeverAura.scene) {
      this.dummyFeverAura.destroy();
    }
    this.dummyFeverAura = null;

    if (this.dummyFeverRing && this.dummyFeverRing.scene) {
      this.dummyFeverRing.destroy();
    }
    this.dummyFeverRing = null;

    if (this.dummyImage && this.dummyImage.scene) {
      this.dummyImage.destroy();
    }
    this.dummyImage = null;

    for (const obj of this.activeVfx) {
      if (obj.scene) obj.destroy();
    }
    this.activeVfx.clear();
  }
}
