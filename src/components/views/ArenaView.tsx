import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Swords,
  FastForward,
  SkipForward,
  Trophy,
  Skull,
  Sparkles,
  RotateCcw,
  Lock,
} from 'lucide-react';
import type {
  ArenaTheme,
  BattleResult,
  CombatEvent,
  LeaderboardEntry,
  OpponentDefinition,
} from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import { computeDerivedStats } from '@shared/progression';
import {
  OPPONENTS_CATALOG,
  getAvailableOpponentsForLevel,
} from '@shared/opponentsCatalog';
import { resolveItemIconUrl, resolveRivalSprite } from '@/engine/art/aiAssets';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import {
  CoinPill,
  HeartHp,
  MbRow,
  SectionCard,
  SegmentedBar,
  formatCompact,
} from '@/components/ui/BruteUI';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const ARENA_BADGE: Record<ArenaTheme, string> = {
  coliseum: '🏛️ Colisée',
  dojo: '⛩️ Dojo',
  volcano: '🌋 Volcan',
};

interface LiveHudState {
  leftHp: number;
  leftMaxHp: number;
  leftRage: number;
  rightHp: number;
  rightMaxHp: number;
  rightRage: number;
}

type ArenaFilter = 'all' | 'normal' | 'boss' | 'pvp';

export const ArenaView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    pendingBattle,
    setPendingBattle,
    startArenaBattle,
    startPvpBattle,
    addToast,
    setActiveView,
  } = useGame();

  const [opponents, setOpponents] = useState<OpponentDefinition[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [pvpRivals, setPvpRivals] = useState<LeaderboardEntry[]>([]);
  const [loadingPvp, setLoadingPvp] = useState(false);
  const [filter, setFilter] = useState<ArenaFilter>('all');

  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [selectedPvpId, setSelectedPvpId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [lastOpponentId, setLastOpponentId] = useState<string | null>(null);
  const [lastPvpTargetId, setLastPvpTargetId] = useState<string | null>(null);

  const [activeBattle, setActiveBattle] = useState<BattleResult | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2>(fighter?.settings.battleSpeed ?? 1);
  const [liveHud, setLiveHud] = useState<LiveHudState | null>(null);
  const [battleLog, setBattleLog] = useState<CombatEvent[]>([]);
  const [battleFinished, setBattleFinished] = useState(false);

  const battleFinishedRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const initBattlePlayback = useCallback((battle: BattleResult) => {
    setActiveBattle(battle);
    battleFinishedRef.current = false;
    setBattleFinished(false);
    setBattleLog([]);
    setLiveHud({
      leftHp: battle.left.derived.maxHp,
      leftMaxHp: battle.left.derived.maxHp,
      leftRage: 0,
      rightHp: battle.right.derived.maxHp,
      rightMaxHp: battle.right.derived.maxHp,
      rightRage: 0,
    });
  }, []);

  // Load pending PvP battle if triggered from Leaderboard
  useEffect(() => {
    if (pendingBattle) {
      initBattlePlayback(pendingBattle);
      setLastOpponentId(null);
      setPendingBattle(null);
    }
  }, [pendingBattle, initBattlePlayback, setPendingBattle]);

  // Fetch PvE arena opponents
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingOpps(true);
      try {
        const res = await apiClient.getOpponents();
        if (mounted) setOpponents(res.opponents);
      } catch {
        if (mounted && fighter) {
          setOpponents(getAvailableOpponentsForLevel(fighter.level));
        }
      } finally {
        if (mounted) setLoadingOpps(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [fighter?.level]);

  // Fetch PvP rivals when PvP tab is opened
  useEffect(() => {
    if (filter !== 'pvp' || !fighter) return;
    let mounted = true;
    const loadPvp = async () => {
      setLoadingPvp(true);
      try {
        const res = await apiClient.getLeaderboard();
        if (mounted) {
          const rivals = res.entries.filter((e) => e.playerId !== fighter.id);
          setPvpRivals(rivals);
          if (rivals.length > 0) {
            setSelectedPvpId((prev) =>
              prev && rivals.some((r) => r.playerId === prev) ? prev : rivals[0].playerId,
            );
          }
        }
      } catch {
        if (mounted) {
          addToast('Impossible de charger les rivaux PvP.', 'error');
        }
      } finally {
        if (mounted) setLoadingPvp(false);
      }
    };
    void loadPvp();
    return () => {
      mounted = false;
    };
  }, [filter, fighter?.id, addToast]);

  // Auto-scroll battle log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [battleLog]);

  const handleBattleEvent = useCallback((event: CombatEvent) => {
    if (battleFinishedRef.current) return;
    setLiveHud({
      leftHp: event.leftHp,
      leftMaxHp: event.leftMaxHp,
      leftRage: event.leftRage,
      rightHp: event.rightHp,
      rightMaxHp: event.rightMaxHp,
      rightRage: event.rightRage,
    });
    setBattleLog((prev) => {
      if (prev.some((e) => e.seq === event.seq)) return prev;
      return [...prev, event];
    });
  }, []);

  const handleBattleComplete = useCallback((battle: BattleResult) => {
    if (battleFinishedRef.current) return;
    battleFinishedRef.current = true;
    const lastEv = battle.events[battle.events.length - 1];
    if (lastEv) {
      setLiveHud({
        leftHp: lastEv.leftHp,
        leftMaxHp: lastEv.leftMaxHp,
        leftRage: lastEv.leftRage,
        rightHp: lastEv.rightHp,
        rightMaxHp: lastEv.rightMaxHp,
        rightRage: lastEv.rightRage,
      });
    }
    setBattleFinished(true);
    if (battle.winner === 'left') {
      soundEngine.play(battle.rewards.leveledUp ? 'level_up' : 'victory');
    } else {
      soundEngine.play('defeat');
    }
  }, []);

  const handleSkipToResult = () => {
    if (!activeBattle) return;
    soundEngine.play('click');
    setBattleLog(activeBattle.events);
    handleBattleComplete(activeBattle);
  };

  const handleChallengeOpponent = async (opponentId: string) => {
    if (!fighter) return;
    if (fighter.energy <= 0) {
      addToast(
        'Plus d’énergie d’arène ! Elle se régénère automatiquement ou monte de niveau.',
        'error',
      );
      return;
    }
    setLaunchingId(opponentId);
    try {
      const battle = await startArenaBattle(opponentId);
      setLastOpponentId(opponentId);
      setLastPvpTargetId(null);
      initBattlePlayback(battle);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de lancer le combat.', 'error');
    } finally {
      setLaunchingId(null);
    }
  };

  const handleChallengePvp = async (targetPlayerId: string) => {
    if (!fighter) return;
    if (fighter.energy <= 0) {
      addToast(
        'Plus d’énergie d’arène ! Elle se régénère automatiquement ou monte de niveau.',
        'error',
      );
      return;
    }
    setLaunchingId(targetPlayerId);
    try {
      const battle = await startPvpBattle(targetPlayerId);
      setLastPvpTargetId(targetPlayerId);
      setLastOpponentId(null);
      initBattlePlayback(battle);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de lancer le duel PvP.', 'error');
    } finally {
      setLaunchingId(null);
    }
  };

  const filteredOpponents = useMemo(() => {
    return opponents.filter((opp) => {
      if (filter === 'boss') return opp.isBoss;
      if (filter === 'normal') return !opp.isBoss;
      return true;
    });
  }, [opponents, filter]);

  // Up to 2 upcoming locked opponents from catalog for progression preview
  const lockedOpponents = useMemo(() => {
    if (filter === 'pvp') return [];
    const unlockedIds = new Set(opponents.map((o) => o.id));
    return OPPONENTS_CATALOG.filter((opp) => {
      if (unlockedIds.has(opp.id)) return false;
      if (filter === 'boss') return opp.isBoss;
      if (filter === 'normal') return !opp.isBoss;
      return true;
    }).slice(0, 2);
  }, [opponents, filter]);

  // Ensure a valid PvE opponent is always selected when available
  useEffect(() => {
    if (filter === 'pvp') return;
    if (filteredOpponents.length === 0) return;
    if (!selectedOppId || !filteredOpponents.some((o) => o.id === selectedOppId)) {
      setSelectedOppId(filteredOpponents[0].id);
    }
  }, [filteredOpponents, selectedOppId, filter]);

  const fighterVisual = useMemo(
    () => (fighter ? { appearance: fighter.appearance, equipped: fighter.equipped } : undefined),
    [fighter?.appearance, fighter?.equipped],
  );

  if (!fighter || !derivedStats) return null;

  const selectedOpp =
    filteredOpponents.find((o) => o.id === selectedOppId) ?? filteredOpponents[0] ?? null;
  const selectedOppDerived = selectedOpp
    ? computeDerivedStats(selectedOpp.baseStats, selectedOpp.level, selectedOpp.equipped)
    : null;
  const selectedPvp =
    filter === 'pvp'
      ? pvpRivals.find((r) => r.playerId === selectedPvpId) ?? pvpRivals[0] ?? null
      : null;

  const isFighting = Boolean(activeBattle && !battleFinished);
  const playerWon = activeBattle ? activeBattle.winner === 'left' : false;

  // Stage HUD values (live during battle, preview when idle)
  const leftName = activeBattle ? activeBattle.left.name : fighter.name;
  const leftHp = activeBattle && liveHud ? liveHud.leftHp : derivedStats.maxHp;
  const leftMaxHp = activeBattle && liveHud ? liveHud.leftMaxHp : derivedStats.maxHp;
  const leftHpPct = Math.max(0, Math.min(100, Math.round((leftHp / Math.max(1, leftMaxHp)) * 100)));

  const rightName = activeBattle
    ? activeBattle.right.name
    : selectedPvp
      ? selectedPvp.name
      : selectedOpp?.name ?? 'Adversaire';
  const previewRightMaxHp = selectedPvp
    ? Math.max(60, Math.round(selectedPvp.powerScore * 1.15))
    : selectedOppDerived?.maxHp ?? 50;
  const rightHp = activeBattle && liveHud ? liveHud.rightHp : previewRightMaxHp;
  const rightMaxHp = activeBattle && liveHud ? liveHud.rightMaxHp : previewRightMaxHp;
  const rightHpPct = Math.max(
    0,
    Math.min(100, Math.round((rightHp / Math.max(1, rightMaxHp)) * 100)),
  );

  const currentArena: ArenaTheme =
    activeBattle?.arena ?? (filter === 'pvp' ? 'coliseum' : selectedOpp?.arena ?? 'coliseum');

  const idleRivalSpriteUrl = !activeBattle
    ? selectedPvp
      ? resolveRivalSprite(`${selectedPvp.playerId} ${selectedPvp.name}`).url
      : selectedOpp
        ? resolveRivalSprite(`${selectedOpp.id} ${selectedOpp.name}`).url
        : null
    : null;

  const latestEvent = battleLog.length > 0 ? battleLog[battleLog.length - 1] : null;

  const handleMegaAction = () => {
    soundEngine.play('click');
    if (isFighting) return;
    if (activeBattle && battleFinished) {
      if (lastOpponentId) {
        void handleChallengeOpponent(lastOpponentId);
      } else if (lastPvpTargetId) {
        void handleChallengePvp(lastPvpTargetId);
      } else {
        setActiveBattle(null);
      }
      return;
    }
    if (filter === 'pvp') {
      if (selectedPvp) {
        void handleChallengePvp(selectedPvp.playerId);
      }
      return;
    }
    if (selectedOpp) {
      void handleChallengeOpponent(selectedOpp.id);
    }
  };

  const megaDisabled =
    isFighting ||
    launchingId !== null ||
    (!(activeBattle && battleFinished && !lastOpponentId && !lastPvpTargetId) &&
      fighter.energy <= 0) ||
    (!activeBattle && filter !== 'pvp' && !selectedOpp) ||
    (!activeBattle && filter === 'pvp' && !selectedPvp);

  const megaLabel =
    launchingId !== null
      ? 'PRÉPARATION DU COMBAT…'
      : isFighting
        ? 'COMBAT EN COURS…'
        : activeBattle && battleFinished
          ? lastOpponentId || lastPvpTargetId
            ? fighter.energy <= 0
              ? 'ÉNERGIE ÉPUISÉE (0⚡)'
              : 'REVANCHE !'
            : 'NOUVEL ADVERSAIRE'
          : fighter.energy <= 0
            ? 'ÉNERGIE ÉPUISÉE (0⚡)'
            : 'GO ! LANCER LE COMBAT';

  const statusText = activeBattle
    ? battleFinished
      ? playerWon
        ? `🏆 Victoire en ${activeBattle.totalTurns} tour(s) contre ${activeBattle.right.name} !`
        : `💀 Défaite après ${activeBattle.totalTurns} tour(s) contre ${activeBattle.right.name}.`
      : latestEvent?.logText ?? 'Les combattants entrent dans l’arène…'
    : fighter.energy <= 0
      ? 'Plus d’énergie d’arène — patiente ou monte de niveau !'
      : 'Sélectionne un adversaire et clique sur GO !';

  return (
    <div className="arena-view">
      {/* 1. FIGHT STAGE CARD (Dark-brown frame modeled on IMG_4208.PNG) */}
      <section className="mb-panel mb-panel--dark arena-stage-card">
        {/* Top dual HP HUD */}
        <div className="arena-stage__hud">
          <div className="arena-stage__fighter">
            <div className="arena-stage__name-row">
              <span className="arena-stage__name">{leftName}</span>
              <span className="arena-stage__hp-text">
                {leftHp}/{leftMaxHp}
              </span>
            </div>
            <div className="meter arena-stage__hp-meter">
              <div className="meter__fill meter__fill--hp" style={{ width: `${leftHpPct}%` }} />
            </div>
            {activeBattle && liveHud && (
              <div className="meter arena-stage__rage-meter" title={`Rage : ${Math.round(liveHud.leftRage)}%`}>
                <div
                  className="meter__fill meter__fill--rage"
                  style={{ width: `${Math.min(100, liveHud.leftRage)}%` }}
                />
              </div>
            )}
          </div>

          <div className="arena-stage__fighter arena-stage__fighter--right">
            <div className="arena-stage__name-row">
              <span className="arena-stage__name">{rightName}</span>
              <span className="arena-stage__hp-text">
                {rightHp}/{rightMaxHp}
              </span>
            </div>
            <div className="meter arena-stage__hp-meter">
              <div className="meter__fill meter__fill--hp" style={{ width: `${rightHpPct}%` }} />
            </div>
            {activeBattle && liveHud && (
              <div className="meter arena-stage__rage-meter" title={`Rage : ${Math.round(liveHud.rightRage)}%`}>
                <div
                  className="meter__fill meter__fill--rage"
                  style={{ width: `${Math.min(100, liveHud.rightRage)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Center Phaser Arena Viewport */}
        <div className="arena-stage__viewport">
          <span className="arena-stage__arena-pill">{ARENA_BADGE[currentArena]}</span>
          <PhaserCanvas
            mode="arena"
            arena={currentArena}
            fighter={fighterVisual}
            battle={activeBattle}
            battleSpeed={battleSpeed}
            onBattleEvent={handleBattleEvent}
            onBattleComplete={handleBattleComplete}
          />
          {idleRivalSpriteUrl && (
            <div className="arena-stage__idle-rival-wrap" aria-hidden="true">
              <img
                src={idleRivalSpriteUrl}
                alt=""
                className="arena-stage__idle-rival-img animate-breathe"
              />
            </div>
          )}
        </div>

        {/* Bottom dark-brown status strip */}
        <div className={`arena-stage__status ${activeBattle ? 'arena-stage__status--combat' : ''}`}>
          <div className="arena-stage__status-text">{statusText}</div>
          {activeBattle && (
            <div className="arena-stage__controls">
              <button
                type="button"
                className={`btn btn--sm arena-stage__ctrl-btn ${battleSpeed === 2 ? 'btn--gold' : ''}`}
                onClick={() => {
                  soundEngine.play('click');
                  setBattleSpeed((s) => (s === 1 ? 2 : 1));
                }}
              >
                <FastForward size={14} />
                {battleSpeed}x
              </button>
              {!battleFinished && (
                <button
                  type="button"
                  className="btn btn--sm btn--sky arena-stage__ctrl-btn"
                  onClick={handleSkipToResult}
                >
                  <SkipForward size={14} />
                  Passer
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2. GIANT ORANGE CTA (modeled on IMG_4208.PNG) */}
      <button
        type="button"
        className="btn btn--primary btn--mega"
        disabled={megaDisabled}
        onClick={handleMegaAction}
      >
        {activeBattle && battleFinished && (lastOpponentId || lastPvpTargetId) ? (
          <RotateCcw size={24} />
        ) : (
          <Swords size={24} />
        )}
        {megaLabel}
      </button>

      {/* 3. BATTLE RESULT BANNER (when a fight finishes) */}
      {activeBattle && battleFinished && (
        <SectionCard
          className={`arena-result-card animate-pop ${
            playerWon ? 'arena-result-card--win' : 'arena-result-card--loss'
          }`}
        >
          <div className="arena-result__top">
            <div className="arena-result__heading">
              {playerWon ? (
                <Trophy size={28} color="#d9850b" />
              ) : (
                <Skull size={28} color="#b4331d" />
              )}
              <div>
                <h2
                  className={`arena-result__title ${
                    playerWon ? 'arena-result__title--win' : 'arena-result__title--loss'
                  }`}
                >
                  {playerWon ? 'VICTOIRE ÉCLATANTE !' : 'DÉFAITE HÉROÏQUE !'}
                </h2>
                <p className="arena-result__sub">
                  Terminé en {activeBattle.totalTurns} tour(s) contre {activeBattle.right.name}.
                </p>
              </div>
            </div>

            <div className="arena-result__rewards">
              <span className="badge" style={{ background: '#fff7dc' }}>
                🪙 +{formatCompact(activeBattle.rewards.gold)} Or
              </span>
              <span className="badge" style={{ background: '#e0f2fe' }}>
                ⭐ +{formatCompact(activeBattle.rewards.xp)} XP
              </span>
              {activeBattle.rewards.gems > 0 && (
                <span className="badge" style={{ background: '#e6f6ff' }}>
                  💎 +{activeBattle.rewards.gems} Gemmes
                </span>
              )}
              <span
                className="badge"
                style={{
                  background: activeBattle.rewards.ratingDelta >= 0 ? '#dcfce7' : '#fee2e2',
                }}
              >
                🏆 {activeBattle.rewards.ratingDelta >= 0 ? '+' : ''}
                {activeBattle.rewards.ratingDelta} Elo
              </span>
            </div>
          </div>

          {activeBattle.rewards.leveledUp && (
            <div className="arena-result__levelup">
              <span>
                <Sparkles size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                NIVEAU {activeBattle.rewards.newLevel} ATTEINT ! +4 points de caractéristiques !
              </span>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() => setActiveView('profile')}
              >
                Placer mes points
              </button>
            </div>
          )}

          {activeBattle.rewards.lootItem && (
            <div
              className="arena-result__loot"
              style={{
                border: `2.5px solid ${RARITY_META[activeBattle.rewards.lootItem.rarity].border}`,
                background: RARITY_META[activeBattle.rewards.lootItem.rarity].bg,
              }}
            >
              <div className="arena-result__loot-info">
                <div
                  className="arena-result__loot-icon"
                  style={{
                    border: `2.5px solid ${RARITY_META[activeBattle.rewards.lootItem.rarity].border}`,
                  }}
                >
                  <img
                    src={resolveItemIconUrl(activeBattle.rewards.lootItem)}
                    alt={activeBattle.rewards.lootItem.name}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: RARITY_META[activeBattle.rewards.lootItem.rarity].color,
                    }}
                  >
                    🎁 BUTIN • {SLOT_LABELS[activeBattle.rewards.lootItem.slot].label} (
                    {RARITY_META[activeBattle.rewards.lootItem.rarity].label})
                  </div>
                  <strong style={{ fontFamily: 'var(--font-title)', fontSize: '1.02rem' }}>
                    {activeBattle.rewards.lootItem.name}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--sm btn--gold"
                onClick={() => setActiveView('inventory')}
              >
                Voir dans le Sac
              </button>
            </div>
          )}

          <div className="arena-result__actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                soundEngine.play('click');
                setActiveBattle(null);
              }}
            >
              <Swords size={15} />
              Choisir un autre adversaire
            </button>
          </div>
        </SectionCard>
      )}

      {/* 4. OPPONENTS PICKER */}
      <SectionCard
        title="ADVERSAIRES DE L'ARÈNE"
        right={
          <div className="arena-opps-right">
            <span className="arena-wins-label">Victoires : {fighter.progress.arenaWins}</span>
            <CoinPill
              kind="energy"
              value={`⚡ ${fighter.energy}/${fighter.maxEnergy}`}
              title="Énergie d'arène"
              className="arena-energy-pill"
            />
          </div>
        }
      >
        <div className="arena-filter-tabs">
          {(
            [
              { id: 'all', label: `PvE (${opponents.length})` },
              { id: 'normal', label: 'Combattants' },
              { id: 'boss', label: 'Boss 👹' },
              { id: 'pvp', label: 'PvP ⚔️' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`arena-filter-tab ${filter === tab.id ? 'arena-filter-tab--active' : ''}`}
              onClick={() => {
                soundEngine.play('click');
                setFilter(tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* PvP TAB CONTENT */}
        {filter === 'pvp' ? (
          loadingPvp ? (
            <div className="lb-empty">Chargement des rivaux PvP…</div>
          ) : pvpRivals.length === 0 ? (
            <div className="lb-empty">Aucun rival PvP disponible pour le moment.</div>
          ) : (
            <>
              {/* Mobile PvP List */}
              <div className="arena-opps-mobile">
                {pvpRivals.map((rival) => {
                  const isSelected = selectedPvp?.playerId === rival.playerId;
                  const spriteUrl = resolveRivalSprite(`${rival.playerId} ${rival.name}`).url;
                  return (
                    <MbRow
                      key={rival.playerId}
                      state={isSelected ? 'active' : 'default'}
                      icon={<img src={spriteUrl} alt={rival.name} />}
                      title={
                        <span className="arena-row-title-wrap">
                          <span>{rival.name}</span>
                          {isSelected && <span className="mb-tag mb-tag--orange">CIBLE</span>}
                          <span className="mb-tag">NIV. {rival.level}</span>
                        </span>
                      }
                      desc={`${rival.title} • ${rival.wins}V/${rival.losses}D`}
                      right={
                        <div className="arena-row-rewards">
                          <span className="arena-row-rewards__gold">🏆 {rival.rating}</span>
                          <span className="arena-row-rewards__xp">⚔️ {rival.powerScore}</span>
                        </div>
                      }
                      onClick={() => {
                        soundEngine.play('click');
                        if (activeBattle && battleFinished) setActiveBattle(null);
                        setSelectedPvpId(rival.playerId);
                      }}
                    />
                  );
                })}
              </div>

              {/* PC PvP 2-Column Grid */}
              <div className="arena-opps-pc">
                {pvpRivals.map((rival) => {
                  const isSelected = selectedPvp?.playerId === rival.playerId;
                  const spriteUrl = resolveRivalSprite(`${rival.playerId} ${rival.name}`).url;
                  const estHp = Math.max(60, Math.round(rival.powerScore * 1.15));
                  const barScale = Math.max(10, rival.level * 3 + 6);
                  const statEst = Math.max(3, Math.round(rival.powerScore / 18));

                  return (
                    <button
                      key={rival.playerId}
                      type="button"
                      className={`arena-opp-card ${isSelected ? 'arena-opp-card--selected' : ''}`}
                      onClick={() => {
                        soundEngine.play('click');
                        if (activeBattle && battleFinished) setActiveBattle(null);
                        setSelectedPvpId(rival.playerId);
                      }}
                    >
                      <div className="arena-opp-card__info">
                        <div className="arena-opp-card__head">
                          <span className="arena-opp-card__name">{rival.name}</span>
                          <span className="mb-tag">NIV. {rival.level}</span>
                          {isSelected && <span className="mb-tag mb-tag--orange">CIBLE</span>}
                        </div>
                        <div className="arena-opp-card__sub">
                          #{rival.rank} • {rival.title}
                        </div>
                        <div className="arena-opp-card__stats-row">
                          <HeartHp hp={estHp} hideLabel />
                          <div className="arena-opp-card__bars">
                            <div className="arena-mini-stat">
                              <span className="arena-mini-stat__lbl">F</span>
                              <SegmentedBar value={statEst} max={barScale} size="sm" />
                            </div>
                            <div className="arena-mini-stat">
                              <span className="arena-mini-stat__lbl">A</span>
                              <SegmentedBar value={Math.round(statEst * 0.9)} max={barScale} size="sm" />
                            </div>
                            <div className="arena-mini-stat">
                              <span className="arena-mini-stat__lbl">D</span>
                              <SegmentedBar value={Math.round(statEst * 0.85)} max={barScale} size="sm" />
                            </div>
                          </div>
                        </div>
                        <div className="arena-opp-card__foot">
                          <span>🏆 {rival.rating} Elo</span>
                          <span>⚔️ {rival.powerScore}</span>
                        </div>
                      </div>
                      <div className="arena-opp-card__portrait">
                        <img src={spriteUrl} alt={rival.name} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )
        ) : loadingOpps ? (
          <div className="lb-empty">Chargement des adversaires de l’arène…</div>
        ) : (
          <>
            {/* Mobile PvE List (< 860px, modeled on IMG_4208.PNG) */}
            <div className="arena-opps-mobile">
              {filteredOpponents.map((opp) => {
                const isSelected = selectedOpp?.id === opp.id;
                const portraitUrl = resolveRivalSprite(`${opp.id} ${opp.name}`).url;

                return (
                  <MbRow
                    key={opp.id}
                    state={isSelected ? 'active' : 'default'}
                    icon={<img src={portraitUrl} alt={opp.name} />}
                    title={
                      <span className="arena-row-title-wrap">
                        <span>{opp.name}</span>
                        {isSelected && <span className="mb-tag mb-tag--orange">CIBLE</span>}
                        {opp.isBoss && <span className="mb-tag">BOSS</span>}
                      </span>
                    }
                    desc={`${opp.title} • Niv.${opp.level}`}
                    right={
                      <div className="arena-row-rewards">
                        <span className="arena-row-rewards__gold">
                          +{formatCompact(opp.rewardGold)}
                          <span className="arena-mini-coin" aria-hidden="true" />
                        </span>
                        <span className="arena-row-rewards__xp">
                          +{formatCompact(opp.rewardXp)} XP
                        </span>
                      </div>
                    }
                    onClick={() => {
                      soundEngine.play('click');
                      if (activeBattle && battleFinished) setActiveBattle(null);
                      setSelectedOppId(opp.id);
                    }}
                  />
                );
              })}

              {lockedOpponents.map((opp) => (
                <MbRow
                  key={`locked-${opp.id}`}
                  state="locked"
                  icon={<Lock size={20} color="#9a7656" />}
                  title="Adversaire Verrouillé"
                  desc={`Atteins le Niv. ${opp.level} pour débloquer`}
                  right={
                    <div className="arena-row-rewards">
                      <span className="arena-row-rewards__gold">
                        +{formatCompact(opp.rewardGold)}
                        <span className="arena-mini-coin" aria-hidden="true" />
                      </span>
                      <span className="arena-row-rewards__xp">
                        +{formatCompact(opp.rewardXp)} XP
                      </span>
                    </div>
                  }
                />
              ))}
            </div>

            {/* PC PvE 2-Column Grid (>= 860px, modeled on IMG_4200.jpg) */}
            <div className="arena-opps-pc">
              {filteredOpponents.map((opp) => {
                const oppDerived = computeDerivedStats(opp.baseStats, opp.level, opp.equipped);
                const isSelected = selectedOpp?.id === opp.id;
                const portraitUrl = resolveRivalSprite(`${opp.id} ${opp.name}`).url;
                const statMax = Math.max(15, opp.level * 3 + 8);

                return (
                  <button
                    key={opp.id}
                    type="button"
                    className={`arena-opp-card ${opp.isBoss ? 'arena-opp-card--boss' : ''} ${
                      isSelected ? 'arena-opp-card--selected' : ''
                    }`}
                    onClick={() => {
                      soundEngine.play('click');
                      if (activeBattle && battleFinished) setActiveBattle(null);
                      setSelectedOppId(opp.id);
                    }}
                  >
                    <div className="arena-opp-card__info">
                      <div className="arena-opp-card__head">
                        <span className="arena-opp-card__name">{opp.name}</span>
                        <span className="mb-tag">NIV. {opp.level}</span>
                        {isSelected && <span className="mb-tag mb-tag--orange">CIBLE</span>}
                        {opp.isBoss && <span className="mb-tag mb-tag--olive">BOSS</span>}
                      </div>
                      <div className="arena-opp-card__sub">
                        {opp.title} • {ARENA_BADGE[opp.arena]}
                      </div>
                      <div className="arena-opp-card__stats-row">
                        <HeartHp hp={oppDerived.maxHp} hideLabel />
                        <div className="arena-opp-card__bars">
                          <div className="arena-mini-stat">
                            <span className="arena-mini-stat__lbl">F</span>
                            <SegmentedBar
                              value={opp.baseStats.str}
                              max={statMax}
                              size="sm"
                              title={`Force : ${opp.baseStats.str}`}
                            />
                          </div>
                          <div className="arena-mini-stat">
                            <span className="arena-mini-stat__lbl">A</span>
                            <SegmentedBar
                              value={opp.baseStats.agi}
                              max={statMax}
                              size="sm"
                              title={`Agilité : ${opp.baseStats.agi}`}
                            />
                          </div>
                          <div className="arena-mini-stat">
                            <span className="arena-mini-stat__lbl">D</span>
                            <SegmentedBar
                              value={opp.baseStats.def}
                              max={statMax}
                              size="sm"
                              title={`Défense : ${opp.baseStats.def}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="arena-opp-card__foot">
                        <span className="arena-row-rewards__gold">
                          +{formatCompact(opp.rewardGold)}
                          <span className="arena-mini-coin" aria-hidden="true" />
                        </span>
                        <span>+{formatCompact(opp.rewardXp)} XP</span>
                        <span>🎁 {Math.round(opp.lootChance * 100)}%</span>
                      </div>
                    </div>

                    <div className="arena-opp-card__portrait">
                      <img src={portraitUrl} alt={opp.name} />
                    </div>
                  </button>
                );
              })}

              {lockedOpponents.map((opp) => (
                <div
                  key={`locked-pc-${opp.id}`}
                  className="arena-opp-card arena-opp-card--locked"
                  aria-disabled="true"
                >
                  <div className="arena-opp-card__info">
                    <div className="arena-opp-card__head">
                      <span className="arena-opp-card__name">Adversaire Verrouillé</span>
                      <span className="mb-tag">NIV. {opp.level}</span>
                    </div>
                    <div className="arena-opp-card__sub">
                      Atteins le Niv. {opp.level} pour débloquer ce rival.
                    </div>
                    <div className="arena-opp-card__foot">
                      <span className="arena-row-rewards__gold">
                        +{formatCompact(opp.rewardGold)}
                        <span className="arena-mini-coin" aria-hidden="true" />
                      </span>
                      <span>+{formatCompact(opp.rewardXp)} XP</span>
                    </div>
                  </div>
                  <div className="arena-opp-card__portrait">
                    <Lock size={28} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* 5. COMPACT PARCHMENT COMBAT LOG */}
      <SectionCard
        title="JOURNAL DE COMBAT"
        right={<span className="arena-wins-label">{battleLog.length} action(s)</span>}
      >
        <div className="arena-log" ref={logContainerRef}>
          {battleLog.length === 0 ? (
            <div className="arena-log__entry">
              Lance un combat pour suivre les coups, parades et coups critiques tour par tour !
            </div>
          ) : (
            battleLog.map((ev) => {
              const cls =
                ev.type === 'victory'
                  ? 'arena-log__entry--victory'
                  : ev.type === 'special'
                    ? 'arena-log__entry--special'
                    : ev.isCrit
                      ? 'arena-log__entry--crit'
                      : '';
              return (
                <div key={ev.seq} className={`arena-log__entry ${cls}`}>
                  <span className="arena-log__turn">[T{ev.turn}]</span>
                  {ev.logText}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
};
