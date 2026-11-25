// ============================================================================
// BRUTE LEGENDS — React <-> Phaser 3 Canvas Host Component
// ============================================================================

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import {
  DEFAULT_CLICKER_METRICS,
  PhaserSceneBridge,
  type PhaserCanvasProps,
  type PhaserSceneMode,
} from '../../engine/phaser/gameBridge';
import { ShowcaseScene } from '../../engine/phaser/ShowcaseScene';
import { ArenaScene } from '../../engine/phaser/ArenaScene';
import { ClickerScene } from '../../engine/phaser/ClickerScene';

function createSceneForMode(mode: PhaserSceneMode, bridge: PhaserSceneBridge): Phaser.Scene {
  switch (mode) {
    case 'arena':
      return new ArenaScene(bridge);
    case 'clicker':
      return new ClickerScene(bridge);
    case 'showcase':
    default:
      return new ShowcaseScene(bridge);
  }
}

export const PhaserCanvas: React.FC<PhaserCanvasProps> = ({
  mode,
  arena,
  fighter,
  previewAnim,
  battle,
  battleSpeed = 1,
  onBattleEvent,
  onBattleComplete,
  clickerMetrics,
  onClickerStrike,
  clickerStrikeNonce,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef<PhaserSceneBridge | null>(null);
  const lastStrikeNonceRef = useRef<number>(clickerStrikeNonce ?? 0);

  // Store latest prop snapshot in a ref so the Phaser mount effect reads fresh
  // initial values without needing to re-create the Phaser.Game on every prop change.
  const latestPropsRef = useRef({
    arena,
    fighter,
    previewAnim,
    battle,
    battleSpeed,
    clickerMetrics,
    onBattleEvent,
    onBattleComplete,
    onClickerStrike,
  });

  latestPropsRef.current = {
    arena,
    fighter,
    previewAnim,
    battle,
    battleSpeed,
    clickerMetrics,
    onBattleEvent,
    onBattleComplete,
    onClickerStrike,
  };

  // Mount & cleanly destroy Phaser.Game per scene mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const snap = latestPropsRef.current;
    const bridge = new PhaserSceneBridge(
      {
        arena: snap.arena ?? (mode === 'arena' ? 'coliseum' : 'dojo'),
        fighter: snap.fighter ?? null,
        previewAnim: snap.previewAnim ?? null,
        battle: snap.battle ?? null,
        battleSpeed: snap.battleSpeed ?? 1,
        clickerMetrics: snap.clickerMetrics ?? DEFAULT_CLICKER_METRICS,
      },
      {
        onBattleEvent: snap.onBattleEvent,
        onBattleComplete: snap.onBattleComplete,
        onClickerStrike: snap.onClickerStrike,
      }
    );
    bridgeRef.current = bridge;

    const rect = container.getBoundingClientRect();
    const initialWidth = Math.max(240, Math.floor(rect.width || container.clientWidth || 640));
    const initialHeight = Math.max(180, Math.floor(rect.height || container.clientHeight || 320));

    const selectedScene = createSceneForMode(mode, bridge);

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container,
      width: initialWidth,
      height: initialHeight,
      transparent: false,
      backgroundColor: '#2c1e16',
      antialias: true,
      banner: false,
      audio: {
        noAudio: true,
      },
      scene: [selectedScene],
      scale: {
        mode: Phaser.Scale.NONE,
      },
    });
    gameRef.current = game;

    let lastW = initialWidth;
    let lastH = initialHeight;

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry || !gameRef.current) return;
            const nextW = Math.max(120, Math.floor(entry.contentRect.width));
            const nextH = Math.max(120, Math.floor(entry.contentRect.height));
            if (nextW === lastW && nextH === lastH) return;
            lastW = nextW;
            lastH = nextH;
            try {
              gameRef.current.scale.resize(nextW, nextH);
            } catch {
              // Ignore resize during teardown
            }
          })
        : null;

    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      bridge.destroy();
      if (bridgeRef.current === bridge) {
        bridgeRef.current = null;
      }
      if (gameRef.current === game) {
        gameRef.current = null;
      }
      try {
        game.destroy(true);
      } catch {
        // Ignore teardown errors
      }
    };
  }, [mode]);

  // Keep React callbacks synced without recreating the Phaser instance
  useEffect(() => {
    bridgeRef.current?.setCallbacks({
      onBattleEvent,
      onBattleComplete,
      onClickerStrike,
    });
  }, [onBattleEvent, onBattleComplete, onClickerStrike]);

  // Push arena theme updates
  useEffect(() => {
    if (arena) {
      bridgeRef.current?.setArena(arena);
    }
  }, [arena]);

  // Push fighter appearance / equipped gear updates live
  useEffect(() => {
    bridgeRef.current?.setFighter(fighter ?? null);
  }, [fighter]);

  // Push animation preview triggers
  useEffect(() => {
    bridgeRef.current?.triggerPreviewAnim(previewAnim ?? null);
  }, [previewAnim]);

  // Push battle timeline updates
  useEffect(() => {
    bridgeRef.current?.setBattle(battle ?? null);
  }, [battle]);

  // Push dynamic battle speed updates
  useEffect(() => {
    bridgeRef.current?.setBattleSpeed(battleSpeed);
  }, [battleSpeed]);

  // Push clicker stats updates
  useEffect(() => {
    if (clickerMetrics) {
      bridgeRef.current?.setClickerMetrics(clickerMetrics);
    }
  }, [clickerMetrics]);

  // Trigger programmatic strike from mobile/thumb button
  useEffect(() => {
    if (
      typeof clickerStrikeNonce === 'number' &&
      clickerStrikeNonce > 0 &&
      clickerStrikeNonce !== lastStrikeNonceRef.current
    ) {
      lastStrikeNonceRef.current = clickerStrikeNonce;
      bridgeRef.current?.emit('clicker:strike-command', clickerStrikeNonce);
    }
  }, [clickerStrikeNonce]);

  return (
    <div
      ref={containerRef}
      className={`phaser-host ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
      data-phaser-mode={mode}
    />
  );
};

export default PhaserCanvas;
