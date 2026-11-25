// ============================================================================
// BRUTE LEGENDS — ArenaScene (My-Brute / Shonen Choreographed Combat Engine)
// ============================================================================

import Phaser from 'phaser';
import type {
  ArenaTheme,
  BattleResult,
  CombatEvent,
  CombatSide,
} from '@shared/types';
import { resolveRivalSprite } from '../art/aiAssets';
import { registerVfxTexturesInPhaser } from '../art/vfxRenderer';
import { soundEngine } from '../audio/soundEffects';
import {
  FighterSprite,
  preloadHeroAiAssets,
  preloadRivalAiAssets,
} from './FighterSprite';
import {
  ARENA_ASSETS,
  type FighterVisualData,
  type PhaserSceneBridge,
} from './gameBridge';

interface FloatingTextStyle {
  color: string;
  stroke?: string;
  fontSize: number;
  rise?: number;
  duration?: number;
}

export class ArenaScene extends Phaser.Scene {
  private readonly bridge: PhaserSceneBridge;
  private currentArena: ArenaTheme = 'coliseum';
  private battleSpeed: 1 | 2 = 1;
  private failedTextures = new Set<string>();

  private fallbackBg: Phaser.GameObjects.Graphics | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private leftFighter: FighterSprite | null = null;
  private rightFighter: FighterSprite | null = null;

  private activeBattle: BattleResult | null = null;
  private playbackToken = 0;
  private activeTimers = new Set<Phaser.Time.TimerEvent>();
  private activeTweens = new Set<Phaser.Tweens.Tween>();
  private activeVfx = new Set<Phaser.GameObjects.GameObject>();

  private unsubscribers: (() => void)[] = [];
  private isShutDown = false;

  constructor(bridge: PhaserSceneBridge) {
    super({ key: 'ArenaScene' });
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
    preloadRivalAiAssets(this);
  }

  public create(): void {
    this.isShutDown = false;
    registerVfxTexturesInPhaser(this);

    const state = this.bridge.getState();
    this.battleSpeed = state.battleSpeed ?? 1;
    this.currentArena = state.battle?.arena ?? state.arena ?? 'coliseum';

    this.fallbackBg = this.add.graphics().setDepth(0);
    this.applyArenaBackground(this.currentArena);

    if (state.battle) {
      this.startBattle(state.battle);
    } else if (state.fighter) {
      this.spawnIdlePreviewFighter(state.fighter);
    }

    this.unsubscribers.push(
      this.bridge.on('battle:update', (battle) => {
        if (this.isShutDown) return;
        if (battle) {
          this.startBattle(battle);
        } else {
          this.cancelActivePlayback();
          this.clearFighters();
          const currentFighter = this.bridge.getState().fighter;
          if (currentFighter) {
            this.spawnIdlePreviewFighter(currentFighter);
          }
        }
      }),
      this.bridge.on('battle:speed', (speed) => {
        if (this.isShutDown) return;
        this.battleSpeed = speed;
        this.leftFighter?.setAnimSpeedScale(speed);
        this.rightFighter?.setAnimSpeedScale(speed);
      }),
      this.bridge.on('arena:update', (arena) => {
        if (this.isShutDown || this.activeBattle) return;
        this.currentArena = arena;
        this.applyArenaBackground(arena);
      }),
      this.bridge.on('fighter:update', (fighterData) => {
        if (this.isShutDown || this.activeBattle) return;
        if (fighterData) {
          if (this.leftFighter) {
            this.leftFighter.updateVisuals(fighterData.appearance, fighterData.equipped);
          } else {
            this.spawnIdlePreviewFighter(fighterData);
          }
        }
      })
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    this.layoutScene(this.scale.width, this.scale.height);
  }

  private spawnIdlePreviewFighter(data: FighterVisualData): void {
    this.clearFighters();
    const layout = this.computeArenaLayout(this.scale.width, this.scale.height);
    this.leftFighter = new FighterSprite(
      this,
      layout.leftX,
      layout.floorY,
      data.appearance,
      data.equipped,
      layout.scale
    );
    this.leftFighter.setFacing('right');
    this.leftFighter.setDepth(10);
  }

  private startBattle(battle: BattleResult): void {
    this.cancelActivePlayback();
    this.clearFighters();

    const token = ++this.playbackToken;
    this.activeBattle = battle;
    this.currentArena = battle.arena;
    this.applyArenaBackground(battle.arena);

    const layout = this.computeArenaLayout(this.scale.width, this.scale.height);
    const hasMoveIn = battle.events.some((e) => e.type === 'move_in');
    const startLeftX = hasMoveIn ? layout.startLeftX : layout.leftX;
    const startRightX = hasMoveIn ? layout.startRightX : layout.rightX;

    this.leftFighter = new FighterSprite(
      this,
      startLeftX,
      layout.floorY,
      battle.left.appearance,
      battle.left.equipped,
      layout.scale
    );
    this.leftFighter.setFacing('right');
    this.leftFighter.setDepth(10);

    const rivalAsset = resolveRivalSprite(`${battle.right.id} ${battle.right.name}`);
    this.rightFighter = new FighterSprite(
      this,
      startRightX,
      layout.floorY,
      battle.right.appearance,
      battle.right.equipped,
      layout.scale,
      { rivalSpriteKey: rivalAsset.key }
    );
    this.rightFighter.setFacing('left');
    this.rightFighter.setDepth(10);

    // Ensure base stances reflect final combat positions
    this.leftFighter.setBasePosition(layout.leftX, layout.floorY, !hasMoveIn);
    this.rightFighter.setBasePosition(layout.rightX, layout.floorY, !hasMoveIn);

    void this.runBattleTimeline(battle, token);
  }

  private async runBattleTimeline(battle: BattleResult, token: number): Promise<void> {
    let emittedVictory = false;

    for (const event of battle.events) {
      if (!this.isTokenActive(token)) return;
      if (event.type === 'victory') {
        emittedVictory = true;
      }
      await this.playCombatEvent(event, battle, token);
      if (!this.isTokenActive(token)) return;
    }

    if (!emittedVictory && this.isTokenActive(token)) {
      this.playVictoryFinisher(battle.winner, token);
      await this.wait(520, token);
      if (this.isTokenActive(token)) {
        this.bridge.emitBattleComplete(battle);
      }
    }
  }

  private async playCombatEvent(
    event: CombatEvent,
    battle: BattleResult,
    token: number
  ): Promise<void> {
    switch (event.type) {
      case 'battle_start': {
        this.bridge.emitBattleEvent(event);
        this.leftFighter?.playAnim('idle', { speedScale: this.battleSpeed });
        this.rightFighter?.playAnim('idle', { speedScale: this.battleSpeed });
        this.leftFighter?.squashPulse(1.08, 0.92, 160);
        this.rightFighter?.squashPulse(1.08, 0.92, 160);
        this.spawnComicBanner('COMBAT !', '#fde047', '#dc2626');
        soundEngine.play('equip');
        await this.wait(540, token);
        break;
      }

      case 'move_in': {
        this.bridge.emitBattleEvent(event);
        await this.choreographMoveIn(token);
        break;
      }

      case 'attack':
      case 'heavy_attack':
      case 'special':
      case 'counter': {
        await this.choreographStrike(event, token);
        break;
      }

      case 'dodge': {
        this.bridge.emitBattleEvent(event);
        const target = this.getFighter(event.target);
        if (target) {
          const dir = event.target === 'left' ? -1 : 1;
          soundEngine.play('dodge');
          target.playAnim('dodge', { returnToIdle: true, speedScale: this.battleSpeed });
          await this.choreographDodgeHop(target, dir, token);
          const pos = target.getPosition();
          this.spawnFloatingText(pos.x, pos.y - 148 * target.getBaseScale(), 'ESQUIVE!', {
            color: '#38bdf8',
            fontSize: 24,
          });
        }
        await this.wait(220, token);
        break;
      }

      case 'block': {
        this.bridge.emitBattleEvent(event);
        const target = this.getFighter(event.target);
        if (target) {
          soundEngine.play('block');
          target.playAnim('block', { returnToIdle: true, speedScale: this.battleSpeed });
          const pos = target.getPosition();
          const impactY = pos.y - 92 * target.getBaseScale();
          this.spawnShieldVfx(pos.x, impactY);
          this.spawnFloatingText(pos.x, impactY - 46, 'BLOCAGE!', {
            color: '#7dd3fc',
            fontSize: 23,
          });
        }
        await this.wait(260, token);
        break;
      }

      case 'bleed_tick': {
        this.bridge.emitBattleEvent(event);
        const target = this.getFighter(event.target);
        if (target) {
          const pos = target.getPosition();
          const impactY = pos.y - 94 * target.getBaseScale();
          target.flashHit();
          target.squashPulse(0.92, 1.08, 120);
          this.spawnSparkBurst(pos.x, impactY, 5, 0xef4444);
          this.spawnFloatingText(pos.x, impactY - 38, `-${event.damage}`, {
            color: '#f87171',
            fontSize: 22,
          });
        }
        await this.wait(300, token);
        break;
      }

      case 'heal': {
        this.bridge.emitBattleEvent(event);
        const target = this.getFighter(event.target);
        if (target) {
          const pos = target.getPosition();
          const centerY = pos.y - 92 * target.getBaseScale();
          soundEngine.play('coin');
          target.squashPulse(1.08, 0.94, 150);
          this.spawnHealVfx(pos.x, centerY);
          if (event.skillName) {
            this.spawnSkillCallout(pos.x, centerY - 68, event.skillName);
          }
          this.spawnFloatingText(pos.x, centerY - 36, `+${event.heal} PV`, {
            color: '#4ade80',
            fontSize: 25,
          });
        }
        await this.wait(420, token);
        break;
      }

      case 'victory': {
        this.bridge.emitBattleEvent(event);
        this.playVictoryFinisher(battle.winner, token);
        await this.wait(650, token);
        if (this.isTokenActive(token)) {
          this.bridge.emitBattleComplete(battle);
        }
        break;
      }
    }
  }

  private async choreographMoveIn(token: number): Promise<void> {
    if (!this.leftFighter || !this.rightFighter) return;
    const leftBase = this.leftFighter.getBasePosition();
    const rightBase = this.rightFighter.getBasePosition();

    this.leftFighter.playAnim('run', { speedScale: this.battleSpeed });
    this.rightFighter.playAnim('run', { speedScale: this.battleSpeed });

    this.spawnDustBurst(this.leftFighter.sprite.x - 12, leftBase.y - 4);
    this.spawnDustBurst(this.rightFighter.sprite.x + 12, rightBase.y - 4);

    await Promise.all([
      this.tweenTo(this.leftFighter.sprite, { x: leftBase.x, y: leftBase.y }, 360, 'Cubic.easeOut', token),
      this.tweenTo(this.rightFighter.sprite, { x: rightBase.x, y: rightBase.y }, 360, 'Cubic.easeOut', token),
    ]);

    if (!this.isTokenActive(token)) return;
    this.spawnDustBurst(leftBase.x, leftBase.y - 4);
    this.spawnDustBurst(rightBase.x, rightBase.y - 4);
    this.leftFighter.playAnim('idle', { speedScale: this.battleSpeed });
    this.rightFighter.playAnim('idle', { speedScale: this.battleSpeed });
    this.leftFighter.squashPulse(1.1, 0.9, 130);
    this.rightFighter.squashPulse(1.1, 0.9, 130);
    await this.wait(160, token);
  }

  private async choreographStrike(event: CombatEvent, token: number): Promise<void> {
    const attacker = this.getFighter(event.actor);
    const defender = this.getFighter(event.target);
    if (!attacker || !defender) {
      this.bridge.emitBattleEvent(event);
      return;
    }

    const dir = event.actor === 'left' ? 1 : -1;
    const scale = attacker.getBaseScale();
    const attackerBase = attacker.getBasePosition();
    const defenderBase = defender.getBasePosition();

    attacker.setDepth(14);
    defender.setDepth(10);

    // Special / Counter dramatic callout before dash
    if (event.type === 'special') {
      const label = event.skillName ? `${event.skillName.toUpperCase()} !` : 'SPÉCIAL !';
      this.spawnSkillCallout(attacker.sprite.x, attacker.sprite.y - 168 * scale, label);
      this.spawnRingVfx(attacker.sprite.x, attacker.sprite.y - 92 * scale, 0xfbbf24);
      soundEngine.play('special');
      await this.wait(170, token);
      if (!this.isTokenActive(token)) return;
    } else if (event.type === 'counter') {
      this.spawnSkillCallout(attacker.sprite.x, attacker.sprite.y - 162 * scale, 'CONTRE !');
    }

    // 1. Dash forward into strike range
    const strikeGap = Math.max(82, Math.min(130, this.scale.width * 0.16));
    const strikeX = defenderBase.x - dir * strikeGap;

    attacker.playAnim('run', { speedScale: this.battleSpeed * 1.15 });
    this.spawnDustBurst(attacker.sprite.x - dir * 10, attackerBase.y - 4);

    await this.tweenTo(
      attacker.sprite,
      { x: strikeX, y: defenderBase.y },
      event.type === 'counter' ? 140 : 210,
      'Quad.easeOut',
      token
    );
    if (!this.isTokenActive(token)) return;

    // 2. Swing animation + anticipation wind-up
    attacker.playAnim(event.actorAnim, {
      returnToIdle: false,
      speedScale: this.battleSpeed,
    });
    attacker.squashPulse(1.14, 0.9, 130);

    const windupMs = event.type === 'heavy_attack' || event.type === 'special' ? 150 : 95;
    await this.wait(windupMs, token);
    if (!this.isTokenActive(token)) return;

    // 3. Impact frame — sync React HUD & Combat Log right here!
    this.bridge.emitBattleEvent(event);

    const impactX = defender.sprite.x - dir * 18 * scale;
    const impactY = defender.sprite.y - 94 * scale;

    if (event.isDodged) {
      soundEngine.play('dodge');
      defender.playAnim('dodge', { returnToIdle: true, speedScale: this.battleSpeed });
      this.spawnDustBurst(defender.sprite.x, defenderBase.y - 4);
      this.spawnFloatingText(defender.sprite.x, impactY - 42, 'ESQUIVE!', {
        color: '#38bdf8',
        fontSize: 25,
      });
      await this.choreographDodgeHop(defender, dir, token);
    } else if (event.isBlocked) {
      soundEngine.play('block');
      defender.playAnim('block', { returnToIdle: true, speedScale: this.battleSpeed });
      defender.squashPulse(0.88, 1.12, 130);
      this.spawnShieldVfx(impactX, impactY);
      this.spawnSparkBurst(impactX, impactY, 6, 0x38bdf8);
      this.cameras.main.shake(90, 0.004);

      this.spawnFloatingText(defender.sprite.x, impactY - 46, 'BLOCAGE!', {
        color: '#7dd3fc',
        fontSize: 23,
      });
      if (event.damage > 0) {
        this.spawnFloatingText(defender.sprite.x + dir * 14, impactY - 16, `-${event.damage}`, {
          color: '#e2e8f0',
          fontSize: 20,
        });
      }

      await this.applyHitstop(45, token);
      await this.choreographRecoil(defender, dir * 12, token);
    } else {
      const isHeavyImpact =
        event.isCrit || event.type === 'heavy_attack' || event.type === 'special';

      if (event.type === 'special') {
        soundEngine.play('special');
      } else if (event.isCrit) {
        soundEngine.play('crit');
      } else if (event.type === 'heavy_attack') {
        soundEngine.play('heavy_hit');
      } else {
        soundEngine.play('hit');
      }

      // Impact VFX burst
      this.spawnSlashVfx(impactX, impactY, dir, isHeavyImpact ? 1.25 : 0.92);
      this.spawnSparkBurst(
        impactX,
        impactY,
        isHeavyImpact ? 11 : 6,
        event.isCrit ? 0xfbbf24 : 0xfb923c
      );

      if (isHeavyImpact) {
        this.spawnRingVfx(impactX, impactY, event.isCrit ? 0xfef08a : 0xf97316);
        this.spawnStarBurst(impactX, impactY, event.isCrit ? 7 : 4);
      }

      // Camera shake & Hitstop freeze-frame
      this.cameras.main.shake(isHeavyImpact ? 170 : 105, isHeavyImpact ? 0.013 : 0.0055);

      defender.playAnim(event.targetAnim, {
        returnToIdle: true,
        speedScale: this.battleSpeed,
      });
      defender.flashHit();
      defender.squashPulse(0.82, 1.18, 160);

      // Bold comic damage number
      if (event.damage > 0) {
        const dmgText = event.isCrit
          ? `CRIT -${event.damage}!`
          : isHeavyImpact
            ? `-${event.damage}!`
            : `-${event.damage}`;

        this.spawnFloatingText(defender.sprite.x, impactY - 38, dmgText, {
          color: event.isCrit ? '#fde047' : isHeavyImpact ? '#fb7185' : '#fff7ed',
          fontSize: event.isCrit ? 32 : isHeavyImpact ? 28 : 24,
          rise: event.isCrit ? 72 : 56,
        });
      }

      await this.applyHitstop(isHeavyImpact ? 90 : 50, token);
      if (!this.isTokenActive(token)) return;

      await this.choreographRecoil(defender, dir * (isHeavyImpact ? 26 : 14), token);
    }

    // Lifesteal / vampirism heal popup on attacker
    if (event.heal > 0 && this.isTokenActive(token)) {
      const aPos = attacker.getPosition();
      this.spawnHealVfx(aPos.x, aPos.y - 92 * scale);
      this.spawnFloatingText(aPos.x, aPos.y - 148 * scale, `+${event.heal} PV`, {
        color: '#4ade80',
        fontSize: 22,
      });
    }

    if (!this.isTokenActive(token)) return;
    await this.wait(130, token);
    if (!this.isTokenActive(token)) return;

    // 4. Return attacker smoothly to base stance
    const refreshedBase = attacker.getBasePosition();
    attacker.playAnim('run', { speedScale: this.battleSpeed });
    await this.tweenTo(
      attacker.sprite,
      { x: refreshedBase.x, y: refreshedBase.y },
      210,
      'Quad.easeInOut',
      token
    );

    if (!this.isTokenActive(token)) return;
    attacker.setDepth(10);
    attacker.playAnim('idle', { speedScale: this.battleSpeed });
    defender.playAnim('idle', { speedScale: this.battleSpeed });
    await this.wait(110, token);
  }

  private async choreographRecoil(
    defender: FighterSprite,
    knockbackX: number,
    token: number
  ): Promise<void> {
    const base = defender.getBasePosition();
    const clampedX = Phaser.Math.Clamp(base.x + knockbackX, 42, this.scale.width - 42);
    await this.tweenTo(defender.sprite, { x: clampedX }, 85, 'Quad.easeOut', token);
    if (!this.isTokenActive(token)) return;
    const latestBase = defender.getBasePosition();
    await this.tweenTo(defender.sprite, { x: latestBase.x, y: latestBase.y }, 150, 'Back.easeOut', token);
  }

  private async choreographDodgeHop(
    defender: FighterSprite,
    dir: number,
    token: number
  ): Promise<void> {
    const base = defender.getBasePosition();
    const hopX = Phaser.Math.Clamp(base.x + dir * 32, 42, this.scale.width - 42);
    await this.tweenTo(defender.sprite, { x: hopX, y: base.y - 22 }, 115, 'Quad.easeOut', token);
    if (!this.isTokenActive(token)) return;
    const latestBase = defender.getBasePosition();
    await this.tweenTo(defender.sprite, { x: latestBase.x, y: latestBase.y }, 155, 'Quad.easeIn', token);
  }

  private async applyHitstop(ms: number, token: number): Promise<void> {
    const scaledMs = Math.max(24, Math.round(ms / this.battleSpeed));
    this.leftFighter?.sprite.anims.pause();
    this.rightFighter?.sprite.anims.pause();

    await this.waitRaw(scaledMs, token);

    if (!this.isShutDown) {
      this.leftFighter?.sprite.anims.resume();
      this.rightFighter?.sprite.anims.resume();
    }
  }

  private playVictoryFinisher(winnerSide: CombatSide, token: number): void {
    const winner = this.getFighter(winnerSide);
    const loser = this.getFighter(winnerSide === 'left' ? 'right' : 'left');

    if (winner) {
      const base = winner.getBasePosition();
      winner.sprite.setPosition(base.x, base.y);
      winner.setDepth(14);
      winner.playAnim('victory', { returnToIdle: false, speedScale: 1 });
      winner.squashPulse(1.14, 0.9, 200);
      this.spawnVictoryShower(base.x, base.y - 108 * winner.getBaseScale(), token);
    }

    if (loser) {
      const base = loser.getBasePosition();
      loser.sprite.setPosition(base.x, base.y);
      loser.setDepth(8);
      loser.playAnim('defeat', { returnToIdle: false, speedScale: 1 });
    }

    const playerWon = winnerSide === 'left';
    soundEngine.play(playerWon ? 'victory' : 'defeat');
    this.spawnComicBanner(
      playerWon ? 'VICTOIRE !' : 'DÉFAITE...',
      playerWon ? '#fde047' : '#f87171',
      playerWon ? '#ea580c' : '#7f1d1d'
    );
  }

  private spawnVictoryShower(cx: number, cy: number, token: number): void {
    for (let wave = 0; wave < 2; wave++) {
      const timer = this.time.delayedCall(wave * 240, () => {
        this.activeTimers.delete(timer);
        if (!this.isTokenActive(token)) return;
        for (let i = 0; i < 10; i++) {
          const key = i % 3 === 0 ? 'vfx_coin' : 'vfx_star';
          const star = this.add
            .image(cx + Phaser.Math.Between(-50, 50), cy - Phaser.Math.Between(10, 40), key)
            .setDepth(28)
            .setScale(Phaser.Math.FloatBetween(0.42, 0.78));
          this.trackVfx(star);

          const tween = this.tweens.add({
            targets: star,
            x: star.x + Phaser.Math.Between(-75, 75),
            y: star.y - Phaser.Math.Between(45, 115),
            angle: Phaser.Math.Between(-240, 240),
            alpha: 0,
            scale: 0.15,
            duration: Phaser.Math.Between(600, 950),
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.activeTweens.delete(tween);
              this.releaseVfx(star);
            },
          });
          this.activeTweens.add(tween);
        }
      });
      this.activeTimers.add(timer);
    }
  }

  // ---- VFX & Comic Typography ----

  private spawnComicBanner(label: string, fillColor: string, accentBorder: string): void {
    const cx = this.scale.width * 0.5;
    const cy = this.scale.height * 0.3;

    const text = this.add
      .text(cx, cy, label, {
        fontFamily: '"Fredoka", "Bangers", "Impact", "Arial Black", sans-serif',
        fontSize: `${Math.round(Phaser.Math.Clamp(this.scale.width * 0.068, 28, 48))}px`,
        fontStyle: '900',
        color: fillColor,
        stroke: '#231917',
        strokeThickness: 8,
        shadow: {
          offsetX: 0,
          offsetY: 5,
          color: accentBorder,
          blur: 0,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.25)
      .setAlpha(0);
    this.trackVfx(text);

    const enter = this.tweens.add({
      targets: text,
      scale: 1.06,
      alpha: 1,
      duration: Math.max(120, 210 / this.battleSpeed),
      ease: 'Back.easeOut',
      onComplete: () => {
        this.activeTweens.delete(enter);
        const exit = this.tweens.add({
          targets: text,
          y: cy - 22,
          scale: 1.18,
          alpha: 0,
          delay: Math.max(180, 360 / this.battleSpeed),
          duration: Math.max(140, 240 / this.battleSpeed),
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.activeTweens.delete(exit);
            this.releaseVfx(text);
          },
        });
        this.activeTweens.add(exit);
      },
    });
    this.activeTweens.add(enter);
  }

  private spawnSkillCallout(x: number, y: number, label: string): void {
    const safeX = Phaser.Math.Clamp(x, 90, this.scale.width - 90);
    const safeY = Math.max(36, y);

    const text = this.add
      .text(safeX, safeY, label, {
        fontFamily: '"Fredoka", "Impact", "Arial Black", sans-serif',
        fontSize: '20px',
        fontStyle: '900',
        color: '#fef08a',
        stroke: '#231917',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setScale(0.5);
    this.trackVfx(text);

    const tween = this.tweens.add({
      targets: text,
      scale: 1.08,
      y: safeY - 26,
      alpha: 0,
      duration: Math.max(320, 620 / this.battleSpeed),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.releaseVfx(text);
      },
    });
    this.activeTweens.add(tween);
  }

  private spawnFloatingText(x: number, y: number, label: string, style: FloatingTextStyle): void {
    const safeX = Phaser.Math.Clamp(x + Phaser.Math.Between(-12, 12), 48, this.scale.width - 48);
    const safeY = Math.max(32, y);

    const text = this.add
      .text(safeX, safeY, label, {
        fontFamily: '"Fredoka", "Impact", "Arial Black", sans-serif',
        fontSize: `${style.fontSize}px`,
        fontStyle: '900',
        color: style.color,
        stroke: style.stroke ?? '#231917',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(36)
      .setScale(0.45);
    this.trackVfx(text);

    const popTween = this.tweens.add({
      targets: text,
      scale: 1.15,
      duration: 110,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.activeTweens.delete(popTween);
        const floatTween = this.tweens.add({
          targets: text,
          y: safeY - (style.rise ?? 58),
          scale: 0.95,
          alpha: 0,
          duration: Math.max(260, (style.duration ?? 620) / this.battleSpeed),
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this.activeTweens.delete(floatTween);
            this.releaseVfx(text);
          },
        });
        this.activeTweens.add(floatTween);
      },
    });
    this.activeTweens.add(popTween);
  }

  private spawnSlashVfx(x: number, y: number, dir: number, scaleMult: number): void {
    const slash = this.add
      .image(x, y, 'vfx_slash')
      .setDepth(24)
      .setFlipX(dir < 0)
      .setScale(0.5 * scaleMult)
      .setRotation(dir * -0.35);
    this.trackVfx(slash);

    const tween = this.tweens.add({
      targets: slash,
      scale: 1.25 * scaleMult,
      rotation: dir * 0.35,
      alpha: 0,
      duration: Math.max(120, 200 / this.battleSpeed),
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.releaseVfx(slash);
      },
    });
    this.activeTweens.add(tween);
  }

  private spawnRingVfx(x: number, y: number, tint: number): void {
    const ring = this.add
      .image(x, y, 'vfx_ring')
      .setDepth(22)
      .setScale(0.35)
      .setAlpha(0.95);
    try {
      ring.setTint(tint);
    } catch {
      // Ignore in canvas
    }
    this.trackVfx(ring);

    const tween = this.tweens.add({
      targets: ring,
      scale: 1.75,
      alpha: 0,
      duration: Math.max(160, 290 / this.battleSpeed),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.releaseVfx(ring);
      },
    });
    this.activeTweens.add(tween);
  }

  private spawnShieldVfx(x: number, y: number): void {
    const shield = this.add
      .image(x, y, 'vfx_shield')
      .setDepth(25)
      .setScale(0.45)
      .setAlpha(0.95);
    this.trackVfx(shield);

    const tween = this.tweens.add({
      targets: shield,
      scale: 1.3,
      alpha: 0,
      duration: Math.max(160, 290 / this.battleSpeed),
      ease: 'Back.easeOut',
      onComplete: () => {
        this.activeTweens.delete(tween);
        this.releaseVfx(shield);
      },
    });
    this.activeTweens.add(tween);
  }

  private spawnSparkBurst(x: number, y: number, count: number, tint?: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(36, 92);
      const spark = this.add
        .image(x, y, 'vfx_spark')
        .setDepth(26)
        .setScale(Phaser.Math.FloatBetween(0.35, 0.78));
      if (tint !== undefined) {
        try {
          spark.setTint(tint);
        } catch {
          // Ignore in canvas
        }
      }
      this.trackVfx(spark);

      const tween = this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        angle: Phaser.Math.Between(-200, 200),
        scale: 0.1,
        alpha: 0,
        duration: Math.max(160, Phaser.Math.Between(240, 420) / this.battleSpeed),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.activeTweens.delete(tween);
          this.releaseVfx(spark);
        },
      });
      this.activeTweens.add(tween);
    }
  }

  private spawnStarBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const dist = Phaser.Math.FloatBetween(45, 98);
      const star = this.add
        .image(x, y, 'vfx_star')
        .setDepth(27)
        .setScale(Phaser.Math.FloatBetween(0.45, 0.8));
      this.trackVfx(star);

      const tween = this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 14,
        angle: Phaser.Math.Between(-240, 240),
        scale: 0.1,
        alpha: 0,
        duration: Math.max(200, Phaser.Math.Between(340, 520) / this.battleSpeed),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.activeTweens.delete(tween);
          this.releaseVfx(star);
        },
      });
      this.activeTweens.add(tween);
    }
  }

  private spawnHealVfx(x: number, y: number): void {
    this.spawnRingVfx(x, y, 0x4ade80);
    for (let i = 0; i < 5; i++) {
      const heart = this.add
        .image(x + Phaser.Math.Between(-26, 26), y + Phaser.Math.Between(-10, 20), 'vfx_heart')
        .setDepth(26)
        .setScale(Phaser.Math.FloatBetween(0.4, 0.68));
      this.trackVfx(heart);

      const tween = this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(42, 76),
        x: heart.x + Phaser.Math.Between(-16, 16),
        alpha: 0,
        scale: 0.2,
        duration: Math.max(240, 480 / this.battleSpeed),
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.activeTweens.delete(tween);
          this.releaseVfx(heart);
        },
      });
      this.activeTweens.add(tween);
    }
  }

  private spawnDustBurst(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const dust = this.add
        .image(x + Phaser.Math.Between(-14, 14), y, 'vfx_dust')
        .setDepth(16)
        .setScale(Phaser.Math.FloatBetween(0.35, 0.62))
        .setAlpha(0.82);
      this.trackVfx(dust);

      const tween = this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-28, 28),
        y: dust.y - Phaser.Math.Between(10, 22),
        scale: dust.scale * 1.45,
        alpha: 0,
        duration: Math.max(150, 280 / this.battleSpeed),
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.activeTweens.delete(tween);
          this.releaseVfx(dust);
        },
      });
      this.activeTweens.add(tween);
    }
  }

  // ---- Helpers & Async Primitives ----

  private getFighter(side: CombatSide): FighterSprite | null {
    return side === 'left' ? this.leftFighter : this.rightFighter;
  }

  private isTokenActive(token: number): boolean {
    return !this.isShutDown && token === this.playbackToken;
  }

  private wait(baseMs: number, token: number): Promise<void> {
    const scaled = Math.max(16, Math.round(baseMs / this.battleSpeed));
    return this.waitRaw(scaled, token);
  }

  private waitRaw(ms: number, token: number): Promise<void> {
    if (!this.isTokenActive(token)) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = this.time.delayedCall(ms, () => {
        this.activeTimers.delete(timer);
        resolve();
      });
      this.activeTimers.add(timer);
    });
  }

  private tweenTo(
    target: Phaser.GameObjects.Sprite,
    props: Record<string, number>,
    baseDuration: number,
    ease: string,
    token: number
  ): Promise<void> {
    if (!this.isTokenActive(token) || !target.scene) return Promise.resolve();
    const duration = Math.max(35, Math.round(baseDuration / this.battleSpeed));

    return new Promise((resolve) => {
      const tween = this.tweens.add({
        targets: target,
        ...props,
        duration,
        ease,
        onComplete: () => {
          this.activeTweens.delete(tween);
          resolve();
        },
        onStop: () => {
          this.activeTweens.delete(tween);
          resolve();
        },
      });
      this.activeTweens.add(tween);
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

  private cancelActivePlayback(): void {
    this.playbackToken++;
    this.activeBattle = null;

    for (const timer of this.activeTimers) {
      timer.remove(false);
    }
    this.activeTimers.clear();

    for (const tween of this.activeTweens) {
      tween.stop();
    }
    this.activeTweens.clear();

    for (const obj of this.activeVfx) {
      if (obj.scene) obj.destroy();
    }
    this.activeVfx.clear();
  }

  private clearFighters(): void {
    if (this.leftFighter) {
      this.leftFighter.destroy();
      this.leftFighter = null;
    }
    if (this.rightFighter) {
      this.rightFighter.destroy();
      this.rightFighter = null;
    }
  }

  // ---- Background & Responsive Layout ----

  private applyArenaBackground(arena: ArenaTheme): void {
    const asset = ARENA_ASSETS[arena] ?? ARENA_ASSETS.coliseum;
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

    const palettes: Record<ArenaTheme, { skyTop: number; skyBot: number; floorTop: number; floorBot: number; glow: number }> = {
      coliseum: {
        skyTop: 0x60a5fa,
        skyBot: 0xfde68a,
        floorTop: 0xe6be8a,
        floorBot: 0xb7844c,
        glow: 0xfffbeb,
      },
      dojo: {
        skyTop: 0xfed7aa,
        skyBot: 0xfb923c,
        floorTop: 0xb4733d,
        floorBot: 0x7c4a21,
        glow: 0xfef3c7,
      },
      volcano: {
        skyTop: 0x450a0a,
        skyBot: 0xb91c1c,
        floorTop: 0x57534e,
        floorBot: 0x1c1917,
        glow: 0xf97316,
      },
    };
    const p = palettes[arena] ?? palettes.coliseum;
    const horizon = Math.floor(h * 0.64);

    g.fillGradientStyle(p.skyTop, p.skyTop, p.skyBot, p.skyBot, 1);
    g.fillRect(0, 0, w, horizon);

    g.fillStyle(p.glow, 0.25);
    g.fillCircle(w * 0.5, horizon * 0.65, Math.min(w, h) * 0.32);

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

  private computeArenaLayout(w: number, h: number) {
    // Adjust scale for 256x256 AI textures (~0.70x of legacy 160px procedural scale)
    const scale = Phaser.Math.Clamp(Math.min(w * 0.56, h) / 215, 0.72, 1.5) * 0.7;
    return {
      startLeftX: w * 0.14,
      startRightX: w * 0.86,
      leftX: w * 0.28,
      rightX: w * 0.72,
      floorY: h * 0.86,
      scale,
    };
  }

  private layoutScene(w: number, h: number): void {
    this.drawFallbackBackdrop(w, h, this.currentArena);
    this.fitBackgroundImage(w, h);

    const layout = this.computeArenaLayout(w, h);
    if (this.leftFighter) {
      const moveNow = !this.activeBattle;
      this.leftFighter.setBasePosition(layout.leftX, layout.floorY, moveNow);
      this.leftFighter.setBaseScale(layout.scale);
      if (!moveNow) {
        this.leftFighter.sprite.y = layout.floorY;
      }
    }
    if (this.rightFighter) {
      const moveNow = !this.activeBattle;
      this.rightFighter.setBasePosition(layout.rightX, layout.floorY, moveNow);
      this.rightFighter.setBaseScale(layout.scale);
      if (!moveNow) {
        this.rightFighter.sprite.y = layout.floorY;
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

    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.cancelActivePlayback();
    this.clearFighters();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
