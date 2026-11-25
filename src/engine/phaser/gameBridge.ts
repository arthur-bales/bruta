// ============================================================================
// BRUTE LEGENDS — Per-Instance Typed React <-> Phaser 3 Scene Bridge
// ============================================================================

import type {
  AnimationName,
  ArenaTheme,
  BattleResult,
  CombatEvent,
  EquippedGear,
  FighterAppearance,
} from '@shared/types';

export type PhaserSceneMode = 'showcase' | 'arena' | 'clicker';

export interface FighterVisualData {
  appearance: FighterAppearance;
  equipped: EquippedGear;
  equippedSkinId?: string;
}

export interface PreviewAnimCommand {
  anim: AnimationName;
  nonce: number;
}

export interface ClickerMetrics {
  clickDamage: number;
  goldPerClick: number;
  clickCritChance: number;
  autoGoldPerSec: number;
}

export interface ClickerStrikePayload {
  isCrit: boolean;
  isFever: boolean;
  combo: number;
  feverProgress: number;
}

export interface PhaserCanvasProps {
  mode: PhaserSceneMode;
  arena?: ArenaTheme;
  fighter?: { appearance: FighterAppearance; equipped: EquippedGear; equippedSkinId?: string };
  previewAnim?: { anim: AnimationName; nonce: number } | null;
  battle?: BattleResult | null;
  battleSpeed?: 1 | 2;
  onBattleEvent?: (event: CombatEvent) => void;
  onBattleComplete?: (battle: BattleResult) => void;
  clickerMetrics?: {
    clickDamage: number;
    goldPerClick: number;
    clickCritChance: number;
    autoGoldPerSec: number;
  };
  onClickerStrike?: (payload: {
    isCrit: boolean;
    isFever: boolean;
    combo: number;
    feverProgress: number;
  }) => void;
  clickerStrikeNonce?: number;
  className?: string;
}

export interface PhaserSceneState {
  arena: ArenaTheme;
  fighter: FighterVisualData | null;
  previewAnim: PreviewAnimCommand | null;
  battle: BattleResult | null;
  battleSpeed: 1 | 2;
  clickerMetrics: ClickerMetrics;
}

export interface PhaserBridgeCallbacks {
  onBattleEvent?: (event: CombatEvent) => void;
  onBattleComplete?: (battle: BattleResult) => void;
  onClickerStrike?: (payload: ClickerStrikePayload) => void;
}

export interface BridgeEventMap {
  'arena:update': ArenaTheme;
  'fighter:update': FighterVisualData | null;
  'preview:anim': PreviewAnimCommand;
  'battle:update': BattleResult | null;
  'battle:speed': 1 | 2;
  'clicker:metrics': ClickerMetrics;
  'clicker:strike-command': number;
}

type BridgeEventKey = keyof BridgeEventMap;
type Listener<K extends BridgeEventKey> = (payload: BridgeEventMap[K]) => void;

export const DEFAULT_CLICKER_METRICS: ClickerMetrics = {
  clickDamage: 10,
  goldPerClick: 3,
  clickCritChance: 0.1,
  autoGoldPerSec: 0,
};

export const ARENA_ASSETS: Record<ArenaTheme, { key: string; url: string }> = {
  coliseum: { key: 'arena_coliseum', url: '/assets/arenas/coliseum.jpg' },
  dojo: { key: 'arena_dojo', url: '/assets/arenas/dojo.jpg' },
  volcano: { key: 'arena_volcano', url: '/assets/arenas/volcano.jpg' },
};

/**
 * Lightweight, instance-scoped event bus connecting a single React PhaserCanvas
 * instance to its Phaser 3 Scene. Zero global singletons so multiple canvases
 * or rapid tab remounts never collide or leak listeners.
 */
export class PhaserSceneBridge {
  private state: PhaserSceneState;
  private callbacks: PhaserBridgeCallbacks;
  private listeners = new Map<BridgeEventKey, Set<Listener<BridgeEventKey>>>();
  private destroyed = false;

  constructor(
    initialState?: Partial<PhaserSceneState>,
    initialCallbacks?: PhaserBridgeCallbacks
  ) {
    this.state = {
      arena: initialState?.arena ?? 'dojo',
      fighter: initialState?.fighter ?? null,
      previewAnim: initialState?.previewAnim ?? null,
      battle: initialState?.battle ?? null,
      battleSpeed: initialState?.battleSpeed ?? 1,
      clickerMetrics: initialState?.clickerMetrics ?? { ...DEFAULT_CLICKER_METRICS },
    };
    this.callbacks = { ...(initialCallbacks ?? {}) };
  }

  public getState(): Readonly<PhaserSceneState> {
    return this.state;
  }

  public setCallbacks(callbacks: PhaserBridgeCallbacks): void {
    if (this.destroyed) return;
    this.callbacks = { ...callbacks };
  }

  public on<K extends BridgeEventKey>(event: K, listener: Listener<K>): () => void {
    if (this.destroyed) return () => {};
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<BridgeEventKey>);
    return () => {
      this.off(event, listener);
    };
  }

  public off<K extends BridgeEventKey>(event: K, listener: Listener<K>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    bucket.delete(listener as Listener<BridgeEventKey>);
    if (bucket.size === 0) {
      this.listeners.delete(event);
    }
  }

  public emit<K extends BridgeEventKey>(event: K, payload: BridgeEventMap[K]): void {
    if (this.destroyed) return;
    const bucket = this.listeners.get(event);
    if (!bucket || bucket.size === 0) return;
    // Snapshot to protect against listeners unsubscribing mid-emit
    const snapshot = Array.from(bucket);
    for (const fn of snapshot) {
      fn(payload);
    }
  }

  public setArena(arena: ArenaTheme): void {
    if (this.destroyed || this.state.arena === arena) return;
    this.state = { ...this.state, arena };
    this.emit('arena:update', arena);
  }

  public setFighter(fighter: FighterVisualData | null): void {
    if (this.destroyed) return;
    this.state = { ...this.state, fighter };
    this.emit('fighter:update', fighter);
  }

  public triggerPreviewAnim(previewAnim: PreviewAnimCommand | null): void {
    if (this.destroyed) return;
    const prev = this.state.previewAnim;
    this.state = { ...this.state, previewAnim };
    if (
      previewAnim &&
      (!prev || prev.nonce !== previewAnim.nonce || prev.anim !== previewAnim.anim)
    ) {
      this.emit('preview:anim', previewAnim);
    }
  }

  public setBattle(battle: BattleResult | null): void {
    if (this.destroyed) return;
    const prevId = this.state.battle?.battleId ?? null;
    const nextId = battle?.battleId ?? null;
    this.state = { ...this.state, battle };
    if (prevId !== nextId) {
      this.emit('battle:update', battle);
    }
  }

  public setBattleSpeed(speed: 1 | 2): void {
    if (this.destroyed || this.state.battleSpeed === speed) return;
    this.state = { ...this.state, battleSpeed: speed };
    this.emit('battle:speed', speed);
  }

  public setClickerMetrics(metrics: ClickerMetrics): void {
    if (this.destroyed) return;
    this.state = { ...this.state, clickerMetrics: { ...metrics } };
    this.emit('clicker:metrics', this.state.clickerMetrics);
  }

  // ---- Outbound Phaser -> React Notifications ----

  public emitBattleEvent(event: CombatEvent): void {
    if (this.destroyed) return;
    this.callbacks.onBattleEvent?.(event);
  }

  public emitBattleComplete(battle: BattleResult): void {
    if (this.destroyed) return;
    this.callbacks.onBattleComplete?.(battle);
  }

  public emitClickerStrike(payload: ClickerStrikePayload): void {
    if (this.destroyed) return;
    this.callbacks.onClickerStrike?.(payload);
  }

  public destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
    this.callbacks = {};
  }
}
