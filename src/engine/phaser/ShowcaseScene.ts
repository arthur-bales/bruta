// ============================================================================
// BRUTE LEGENDS — ShowcaseScene (Home / Profile / Inventory / Customizer)
// ============================================================================

import Phaser from 'phaser';
import type { AnimationName, ArenaTheme } from '@shared/types';
import { ANIMATION_SPECS } from '@shared/constants';
import { registerVfxTexturesInPhaser } from '../art/vfxRenderer';
import { soundEngine, type SoundEffectType } from '../audio/soundEffects';
import { FighterSprite, preloadHeroAiAssets } from './FighterSprite';
import {
  ARENA_ASSETS,
  type FighterVisualData,
  type PhaserSceneBridge,
  type PreviewAnimCommand,
} from './gameBridge';

interface AmbientPetal {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  spin: number;
}

const CLICK_EMOTES: AnimationName[] = ['attack', 'victory', 'special', 'dodge'];
const HOLD_ANIMATIONS = new Set<AnimationName>(['idle', 'walk', 'run', 'victory', 'defeat']);

export class ShowcaseScene extends Phaser.Scene {
  private readonly bridge: PhaserSceneBridge;
  private currentArena: ArenaTheme = 'dojo';
  private failedTextures = new Set<string>();

  private fallbackBg: Phaser.GameObjects.Graphics | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private floorGlow: Phaser.GameObjects.Ellipse | null = null;
  private fighter: FighterSprite | null = null;
  private petals: AmbientPetal[] = [];
  private activeVfxObjects = new Set<Phaser.GameObjects.GameObject>();

  private unsubscribers: (() => void)[] = [];
  private emoteIndex = 0;
  private isShutDown = false;

  constructor(bridge: PhaserSceneBridge) {
    super({ key: 'ShowcaseScene' });
    this.bridge = bridge;
  }

  public preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failedTextures.add(file.key);
    });

    for (const theme of Object.keys(ARENA_ASSETS) as ArenaTheme[]) {
      const { key, url } = ARENA_ASSETS[theme];
      if (!this.textures.exists(key)) {
        this.load.image(key, url);
      }
    }

    preloadHeroAiAssets(this);
  }

  public create(): void {
    this.isShutDown = false;
    registerVfxTexturesInPhaser(this);
    this.registerSakuraPetalTexture();

    const state = this.bridge.getState();
    this.currentArena = state.arena ?? 'dojo';

    this.fallbackBg = this.add.graphics().setDepth(0);
    this.floorGlow = this.add
      .ellipse(0, 0, 180, 42, 0xfef08a, 0.22)
      .setDepth(4);

    this.applyArenaBackground(this.currentArena);
    this.createAmbientPetals();

    if (state.fighter) {
      this.syncFighter(state.fighter, false);
    }

    if (state.previewAnim) {
      this.playPreviewAnim(state.previewAnim);
    }

    this.unsubscribers.push(
      this.bridge.on('arena:update', (arena) => {
        if (this.isShutDown) return;
        this.currentArena = arena;
        this.applyArenaBackground(arena);
      }),
      this.bridge.on('fighter:update', (fighterData) => {
        if (this.isShutDown) return;
        this.syncFighter(fighterData, true);
      }),
      this.bridge.on('preview:anim', (cmd) => {
        if (this.isShutDown) return;
        this.playPreviewAnim(cmd);
      })
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.layoutScene(this.scale.width, this.scale.height);
  }

  public update(time: number, delta: number): void {
    if (this.isShutDown) return;
    const dt = Math.min(delta, 50) / 1000;
    const w = this.scale.width;
    const h = this.scale.height;

    for (const p of this.petals) {
      p.sprite.x += (p.vx + Math.sin(time * 0.001 * p.swayFreq + p.phase) * p.swayAmp) * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;

      if (p.sprite.y > h + 24 || p.sprite.x > w + 28) {
        p.sprite.x = Phaser.Math.Between(-30, Math.max(40, w));
        p.sprite.y = Phaser.Math.Between(-40, -10);
      } else if (p.sprite.x < -36) {
        p.sprite.x = w + 18;
      }
    }
  }

  private registerSakuraPetalTexture(): void {
    if (this.textures.exists('vfx_sakura_petal')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(7, -5, 7, 5, 0, 8);
    ctx.bezierCurveTo(-7, 5, -7, -5, 0, -8);
    ctx.closePath();
    ctx.fillStyle = '#fbcfe8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(219, 39, 119, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2, -2, 2.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.textures.addCanvas('vfx_sakura_petal', canvas);
  }

  private createAmbientPetals(): void {
    const w = Math.max(240, this.scale.width);
    const h = Math.max(180, this.scale.height);
    const count = 14;

    for (let i = 0; i < count; i++) {
      const isSparkle = i % 4 === 0;
      const texKey = isSparkle ? 'vfx_spark' : 'vfx_sakura_petal';
      const sprite = this.add
        .image(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), texKey)
        .setDepth(isSparkle ? 6 : 15)
        .setAlpha(isSparkle ? Phaser.Math.FloatBetween(0.28, 0.55) : Phaser.Math.FloatBetween(0.55, 0.88))
        .setScale(isSparkle ? Phaser.Math.FloatBetween(0.22, 0.38) : Phaser.Math.FloatBetween(0.55, 1.05));

      this.petals.push({
        sprite,
        vx: isSparkle ? Phaser.Math.FloatBetween(-6, 8) : Phaser.Math.FloatBetween(12, 30),
        vy: isSparkle ? Phaser.Math.FloatBetween(-12, -5) : Phaser.Math.FloatBetween(16, 34),
        swayAmp: Phaser.Math.FloatBetween(10, 26),
        swayFreq: Phaser.Math.FloatBetween(1.1, 2.4),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        spin: Phaser.Math.FloatBetween(-1.6, 1.8),
      });
    }
  }

  private syncFighter(data: FighterVisualData | null, celebrateSwap: boolean): void {
    if (!data) {
      if (this.fighter) {
        this.fighter.destroy();
        this.fighter = null;
      }
      return;
    }

    const { x, y, scale } = this.computeFighterLayout(this.scale.width, this.scale.height);

    if (!this.fighter) {
      this.fighter = new FighterSprite(
        this,
        x,
        y,
        data.appearance,
        data.equipped,
        scale
      );
      this.fighter.setDepth(10);
      this.fighter.setFacing('right');
      this.bindFighterInteraction(this.fighter);
      this.fighter.squashPulse(1.08, 0.92, 180);
      return;
    }

    const changed = this.fighter.updateVisuals(data.appearance, data.equipped);
    if (changed && celebrateSwap) {
      this.fighter.squashPulse(1.12, 0.9, 170);
      this.spawnEquipBurst(this.fighter.getPosition().x, this.fighter.getPosition().y - 92 * scale);
    }
  }

  private bindFighterInteraction(fighter: FighterSprite): void {
    fighter.sprite.setInteractive({ useHandCursor: true });
    fighter.sprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.isShutDown || !this.fighter) return;
      const emote = CLICK_EMOTES[this.emoteIndex % CLICK_EMOTES.length];
      this.emoteIndex = (this.emoteIndex + 1 + Phaser.Math.Between(0, 1)) % CLICK_EMOTES.length;
      this.triggerEmote(emote, true);
    });
  }

  private playPreviewAnim(cmd: PreviewAnimCommand): void {
    if (!this.fighter) return;
    const returnToIdle = !HOLD_ANIMATIONS.has(cmd.anim);
    this.triggerEmote(cmd.anim, returnToIdle);
  }

  private triggerEmote(anim: AnimationName, returnToIdle: boolean): void {
    if (!this.fighter) return;

    const spec = ANIMATION_SPECS[anim];
    const shouldReturn = returnToIdle && spec.repeat === 0;
    this.fighter.playAnim(anim, {
      returnToIdle: shouldReturn,
      speedScale: 1,
    });
    this.fighter.squashPulse(1.12, 0.9, 160);

    const pos = this.fighter.getPosition();
    const scale = this.fighter.getBaseScale();
    const centerY = pos.y - 92 * scale;

    const sfxMap: Partial<Record<AnimationName, SoundEffectType>> = {
      attack: 'hit',
      heavy_attack: 'heavy_hit',
      special: 'special',
      dodge: 'dodge',
      block: 'block',
      victory: 'victory',
      hit: 'hit',
      defeat: 'defeat',
    };
    const sfx = sfxMap[anim];
    if (sfx) {
      soundEngine.play(sfx);
    } else {
      soundEngine.play('click');
    }

    if (anim === 'attack' || anim === 'heavy_attack') {
      this.spawnSlashVfx(pos.x + 56 * scale, centerY, anim === 'heavy_attack' ? 1.15 : 0.85);
    } else if (anim === 'special') {
      this.spawnRingVfx(pos.x, centerY, 0xfbbf24);
      this.spawnStarBurst(pos.x, centerY, 7);
    } else if (anim === 'victory') {
      this.spawnStarBurst(pos.x, centerY - 32 * scale, 8);
    } else if (anim === 'dodge') {
      this.spawnDustBurst(pos.x, pos.y - 8);
    } else if (anim === 'block') {
      this.spawnShieldVfx(pos.x + 44 * scale, centerY);
    }
  }

  private spawnEquipBurst(x: number, y: number): void {
    this.spawnRingVfx(x, y, 0xfef08a);
    this.spawnStarBurst(x, y, 5);
  }

  private spawnSlashVfx(x: number, y: number, scaleMult: number): void {
    const slash = this.add
      .image(x, y, 'vfx_slash')
      .setDepth(20)
      .setScale(0.45 * scaleMult)
      .setRotation(-0.25)
      .setAlpha(0.95);
    this.trackVfx(slash);

    this.tweens.add({
      targets: slash,
      scale: 1.15 * scaleMult,
      rotation: 0.35,
      alpha: 0,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseVfx(slash),
    });
  }

  private spawnRingVfx(x: number, y: number, tint: number): void {
    const ring = this.add
      .image(x, y, 'vfx_ring')
      .setDepth(18)
      .setScale(0.35)
      .setAlpha(0.9);
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
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => this.releaseVfx(ring),
    });
  }

  private spawnShieldVfx(x: number, y: number): void {
    const shield = this.add
      .image(x, y, 'vfx_shield')
      .setDepth(20)
      .setScale(0.4)
      .setAlpha(0.95);
    this.trackVfx(shield);

    this.tweens.add({
      targets: shield,
      scale: 1.15,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => this.releaseVfx(shield),
    });
  }

  private spawnDustBurst(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const dust = this.add
        .image(x + Phaser.Math.Between(-18, 18), y, 'vfx_dust')
        .setDepth(16)
        .setScale(Phaser.Math.FloatBetween(0.4, 0.7))
        .setAlpha(0.85);
      this.trackVfx(dust);

      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-34, 34),
        y: dust.y - Phaser.Math.Between(10, 26),
        scale: dust.scale * 1.45,
        alpha: 0,
        duration: 290,
        ease: 'Quad.easeOut',
        onComplete: () => this.releaseVfx(dust),
      });
    }
  }

  private spawnStarBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dist = Phaser.Math.FloatBetween(42, 84);
      const key = i % 2 === 0 ? 'vfx_star' : 'vfx_spark';
      const p = this.add
        .image(x, y, key)
        .setDepth(22)
        .setScale(Phaser.Math.FloatBetween(0.38, 0.72));
      this.trackVfx(p);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 14,
        angle: Phaser.Math.Between(-180, 180),
        scale: 0.1,
        alpha: 0,
        duration: Phaser.Math.Between(360, 560),
        ease: 'Cubic.easeOut',
        onComplete: () => this.releaseVfx(p),
      });
    }
  }

  private trackVfx(obj: Phaser.GameObjects.GameObject): void {
    this.activeVfxObjects.add(obj);
  }

  private releaseVfx(obj: Phaser.GameObjects.GameObject): void {
    this.activeVfxObjects.delete(obj);
    if (obj.scene) {
      obj.destroy();
    }
  }

  private applyArenaBackground(arena: ArenaTheme): void {
    const asset = ARENA_ASSETS[arena] ?? ARENA_ASSETS.dojo;
    const canUseImage =
      this.textures.exists(asset.key) &&
      !this.failedTextures.has(asset.key) &&
      this.textures.get(asset.key).key !== '__MISSING';

    if (canUseImage) {
      if (!this.bgImage) {
        this.bgImage = this.add.image(0, 0, asset.key).setDepth(1).setOrigin(0.5, 0.52);
      } else {
        this.bgImage.setTexture(asset.key).setVisible(true);
      }
    } else if (this.bgImage) {
      this.bgImage.setVisible(false);
    }

    this.drawFallbackBackdrop(this.scale.width, this.scale.height, arena);
    this.fitBackgroundImage(this.scale.width, this.scale.height);
  }

  private drawFallbackBackdrop(w: number, h: number, arena: ArenaTheme): void {
    if (!this.fallbackBg) return;
    const g = this.fallbackBg;
    g.clear();

    const palettes: Record<ArenaTheme, { skyTop: number; skyBot: number; floorTop: number; floorBot: number; accent: number }> = {
      dojo: {
        skyTop: 0xffedd5,
        skyBot: 0xfdba74,
        floorTop: 0xb4733d,
        floorBot: 0x7c4a21,
        accent: 0xfef3c7,
      },
      coliseum: {
        skyTop: 0x93c5fd,
        skyBot: 0xfde68a,
        floorTop: 0xe6c28b,
        floorBot: 0xb0824a,
        accent: 0xfff7ed,
      },
      volcano: {
        skyTop: 0x451a03,
        skyBot: 0x9a3412,
        floorTop: 0x44403c,
        floorBot: 0x1c1917,
        accent: 0xfb923c,
      },
    };
    const p = palettes[arena] ?? palettes.dojo;
    const horizon = Math.floor(h * 0.66);

    g.fillGradientStyle(p.skyTop, p.skyTop, p.skyBot, p.skyBot, 1);
    g.fillRect(0, 0, w, horizon);

    g.fillStyle(p.accent, 0.28);
    g.fillCircle(w * 0.5, horizon * 0.52, Math.min(w, h) * 0.28);

    g.fillGradientStyle(p.floorTop, p.floorTop, p.floorBot, p.floorBot, 1);
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

  private computeFighterLayout(w: number, h: number): { x: number; y: number; scale: number } {
    // Adjust scale for 256x256 AI textures (~0.72x of legacy 160px procedural scale)
    const scale = Phaser.Math.Clamp(Math.min(w * 0.9, h) / 185, 0.9, 1.85) * 0.72;
    return {
      x: w * 0.5,
      y: h * 0.86,
      scale,
    };
  }

  private layoutScene(w: number, h: number): void {
    this.drawFallbackBackdrop(w, h, this.currentArena);
    this.fitBackgroundImage(w, h);

    const { x, y, scale } = this.computeFighterLayout(w, h);
    if (this.floorGlow) {
      this.floorGlow.setPosition(x, y + 3);
      this.floorGlow.setDisplaySize(168 * scale, 34 * scale);
    }

    if (this.fighter) {
      this.fighter.setBasePosition(x, y, true);
      this.fighter.setBaseScale(scale);
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

    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.tweens.killAll();
    this.time.removeAllEvents();

    if (this.fighter) {
      this.fighter.destroy();
      this.fighter = null;
    }

    for (const obj of this.activeVfxObjects) {
      if (obj.scene) obj.destroy();
    }
    this.activeVfxObjects.clear();

    for (const p of this.petals) {
      if (p.sprite.scene) p.sprite.destroy();
    }
    this.petals = [];
  }
}
