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
  Zap,
} from 'lucide-react';
import type {
  ArenaTheme,
  BattleResult,
  CombatEvent,
  LeaderboardEntry,
} from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import { computeDerivedStats } from '@shared/progression';
import {
  OPPONENTS_CATALOG,
  getRequiredPreviousOpponent,
  isOpponentUnlocked,
} from '@shared/opponentsCatalog';
import { resolveItemIconUrl, resolveRivalSprite } from '@/engine/art/aiAssets';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import {
  CoinPill,
  MbRow,
  SectionCard,
  formatCompact,
} from '@/components/ui/BruteUI';
import { GameIcon, resolveArenaIconName } from '@/components/ui/GameIcon';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const ARENA_LABEL: Record<ArenaTheme, string> = {
  coliseum: 'Colisée',
  dojo: 'Dojo',
  volcano: 'Volcan',
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

  const defeatedIds = useMemo(
    () => fighter?.progress.defeatedOpponentIds ?? [],
    [fighter?.progress.defeatedOpponentIds],
  );
  const defeatedSet = useMemo(() => new Set(defeatedIds), [defeatedIds]);
  const prevDefeatedLenRef = useRef(defeatedIds.length);

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
    if (!isOpponentUnlocked(opponentId, defeatedIds)) {
      const prevOpp = getRequiredPreviousOpponent(opponentId);
      addToast(
        `Bats ${prevOpp ? prevOpp.name : 'l’adversaire précédent'} pour débloquer ce combat.`,
        'error',
      );
      return;
    }
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

  // All PvE opponents in strict sequential catalog order
  const filteredOpponents = useMemo(() => {
    return OPPONENTS_CATALOG.filter((opp) => {
      if (filter === 'boss') return opp.isBoss;
      if (filter === 'normal') return !opp.isBoss;
      return true;
    });
  }, [filter]);

  const unlockedCount = useMemo(
    () => OPPONENTS_CATALOG.filter((opp) => isOpponentUnlocked(opp.id, defeatedIds)).length,
    [defeatedIds],
  );

  const unlockedFilteredOpponents = useMemo(
    () => filteredOpponents.filter((opp) => isOpponentUnlocked(opp.id, defeatedIds)),
    [filteredOpponents, defeatedIds],
  );

  // Latest unlocked (not-yet-defeated) opponent if available, else first unlocked opponent
  const defaultUnlockedOpp = useMemo(() => {
    const latestNotDefeated = [...unlockedFilteredOpponents]
      .reverse()
      .find((opp) => !defeatedSet.has(opp.id));
    return latestNotDefeated ?? unlockedFilteredOpponents[0] ?? null;
  }, [unlockedFilteredOpponents, defeatedSet]);

  // Keep selectedOppId valid and never stuck on a locked opponent; advance on new win
  useEffect(() => {
    if (filter === 'pvp') return;
    const grew = defeatedIds.length > prevDefeatedLenRef.current;
    prevDefeatedLenRef.current = defeatedIds.length;

    if (
      grew ||
      !selectedOppId ||
      !unlockedFilteredOpponents.some((o) => o.id === selectedOppId)
    ) {
      setSelectedOppId(defaultUnlockedOpp?.id ?? null);
    }
  }, [unlockedFilteredOpponents, selectedOppId, defaultUnlockedOpp, filter, defeatedIds.length]);

  const fighterVisual = useMemo(
    () => (fighter ? { appearance: fighter.appearance, equipped: fighter.equipped } : undefined),
    [fighter?.appearance, fighter?.equipped],
  );

  if (!fighter || !derivedStats) return null;

  const selectedOpp =
    unlockedFilteredOpponents.find((o) => o.id === selectedOppId) ?? defaultUnlockedOpp;
  const selectedOppUnlocked = selectedOpp
    ? isOpponentUnlocked(selectedOpp.id, defeatedIds)
    : false;
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
    if (selectedOpp && selectedOppUnlocked) {
      void handleChallengeOpponent(selectedOpp.id);
    }
  };

  const rematchLocked = Boolean(
    activeBattle &&
      battleFinished &&
      lastOpponentId &&
      !isOpponentUnlocked(lastOpponentId, defeatedIds),
  );

  const megaDisabled =
    isFighting ||
    launchingId !== null ||
    rematchLocked ||
    (!(activeBattle && battleFinished && !lastOpponentId && !lastPvpTargetId) &&
      fighter.energy <= 0) ||
    (!activeBattle && filter !== 'pvp' && (!selectedOpp || !selectedOppUnlocked)) ||
    (!activeBattle && filter === 'pvp' && !selectedPvp);

  const isOutOfEnergy = fighter.energy <= 0;

  const megaLabel =
    launchingId !== null ? (
      'PRÉPARATION DU COMBAT…'
    ) : isFighting ? (
      'COMBAT EN COURS…'
    ) : activeBattle && battleFinished ? (
      lastOpponentId || lastPvpTargetId ? (
        isOutOfEnergy ? (
          <span className="arena-inline-label">
            ÉNERGIE ÉPUISÉE (0 <Zap size={18} />)
          </span>
        ) : (
          'REVANCHE !'
        )
      ) : (
        'NOUVEL ADVERSAIRE'
      )
    ) : isOutOfEnergy ? (
      <span className="arena-inline-label">
        ÉNERGIE ÉPUISÉE (0 <Zap size={18} />)
      </span>
    ) : !selectedOppUnlocked && filter !== 'pvp' ? (
      <span className="arena-inline-label">
        <Lock size={20} /> ADVERSAIRE VERROUILLÉ
      </span>
    ) : (
      'GO ! LANCER LE COMBAT'
    );

  const statusContent = activeBattle ? (
    battleFinished ? (
      playerWon ? (
        <span className="arena-status-inline">
          <GameIcon name="crown" size={18} />
          <span>
            Victoire en {activeBattle.totalTurns} tour(s) contre {activeBattle.right.name} !
          </span>
        </span>
      ) : (
        <span className="arena-status-inline">
          <Skull size={16} color="#ff9d82" />
          <span>
            Défaite après {activeBattle.totalTurns} tour(s) contre {activeBattle.right.name}.
          </span>
        </span>
      )
    ) : (
      latestEvent?.logText ?? 'Les combattants entrent dans l’arène…'
    )
  ) : fighter.energy <= 0 ? (
    'Plus d’énergie d’arène — patiente ou monte de niveau !'
  ) : (
    'Sélectionne un adversaire et clique sur GO !'
  );

  return (
    <div className="arena-view">
      <div className="arena-layout">
        {/* LEFT COLUMN (PC) / TOP STACK (Mobile): Stage + Mega GO + Result */}
        <div className="arena-main-col">
          {/* 1. FIGHT STAGE CARD */}
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
                  <div
                    className="meter arena-stage__rage-meter"
                    title={`Rage : ${Math.round(liveHud.leftRage)}%`}
                  >
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
                  <div
                    className="meter arena-stage__rage-meter"
                    title={`Rage : ${Math.round(liveHud.rightRage)}%`}
                  >
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
              <span className="arena-stage__arena-pill">
                <GameIcon name={resolveArenaIconName(currentArena)} size={16} rounded />
                <span>{ARENA_LABEL[currentArena]}</span>
              </span>
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
            <div
              className={`arena-stage__status ${activeBattle ? 'arena-stage__status--combat' : ''}`}
            >
              <div className="arena-stage__status-text">{statusContent}</div>
              {activeBattle && (
                <div className="arena-stage__controls">
                  <button
                    type="button"
                    className={`btn btn--sm arena-stage__ctrl-btn ${
                      battleSpeed === 2 ? 'btn--gold' : ''
                    }`}
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

          {/* 2. GIANT ORANGE CTA */}
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
                  <span
                    className="badge arena-reward-badge"
                    style={{
                      background: activeBattle.rewards.gold === 0 ? '#fee2e2' : '#fff7dc',
                    }}
                  >
                    <span className="arena-mini-coin" aria-hidden="true" />
                    {activeBattle.rewards.gold === 0
                      ? '0 Or (Défaite)'
                      : `+${formatCompact(activeBattle.rewards.gold)} Or`}
                  </span>
                  <span className="badge arena-reward-badge" style={{ background: '#e0f2fe' }}>
                    <GameIcon name="scroll" size={16} />+{formatCompact(activeBattle.rewards.xp)} XP
                  </span>
                  {activeBattle.rewards.gems > 0 && (
                    <span className="badge arena-reward-badge" style={{ background: '#e6f6ff' }}>
                      <span
                        className="coin-pill__icon coin-pill__icon--gem arena-mini-gem"
                        aria-hidden="true"
                      />
                      +{activeBattle.rewards.gems} Gemmes
                    </span>
                  )}
                  <span
                    className="badge arena-reward-badge"
                    style={{
                      background: activeBattle.rewards.ratingDelta >= 0 ? '#dcfce7' : '#fee2e2',
                    }}
                  >
                    <GameIcon name="crown" size={16} />
                    {activeBattle.rewards.ratingDelta >= 0 ? '+' : ''}
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
                        className="arena-result__loot-label"
                        style={{
                          color: RARITY_META[activeBattle.rewards.lootItem.rarity].color,
                        }}
                      >
                        <GameIcon name="chest_epic" size={16} />
                        <span>
                          BUTIN • {SLOT_LABELS[activeBattle.rewards.lootItem.slot].label} (
                          {RARITY_META[activeBattle.rewards.lootItem.rarity].label})
                        </span>
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
        </div>

        {/* RIGHT COLUMN (PC) / MIDDLE (Mobile): Opponents Picker */}
        <div className="arena-opps-col">
          <SectionCard
            title="ADVERSAIRES DE L'ARÈNE"
            right={
              <div className="arena-opps-right">
                <span className="arena-wins-label">Victoires : {fighter.progress.arenaWins}</span>
                <CoinPill
                  kind="energy"
                  value={`${fighter.energy}/${fighter.maxEnergy}`}
                  title="Énergie d'arène"
                  className="arena-energy-pill"
                />
              </div>
            }
          >
            <div className="arena-filter-tabs">
              {(
                [
                  { id: 'all', label: `PvE (${unlockedCount}/${OPPONENTS_CATALOG.length})`, icon: null },
                  { id: 'normal', label: 'Combattants', icon: null },
                  { id: 'boss', label: 'Boss', icon: 'boss' as const },
                  { id: 'pvp', label: 'PvP', icon: 'sword' as const },
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
                  {tab.icon && <GameIcon name={tab.icon} size={16} rounded={tab.icon === 'boss'} />}
                  <span>{tab.label}</span>
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
                <div className="arena-opps-list">
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
                            <span className="arena-row-rewards__gold">
                              <GameIcon name="crown" size={15} />
                              {rival.rating}
                            </span>
                            <span className="arena-row-rewards__xp arena-row-rewards__power">
                              <GameIcon name="sword" size={14} />
                              {rival.powerScore}
                            </span>
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
              )
            ) : (
              /* PvE SEQUENTIAL LADDER LIST (Mobile + PC vertical MbRow list) */
              <div className="arena-opps-list">
                {filteredOpponents.map((opp) => {
                  const unlocked = isOpponentUnlocked(opp.id, defeatedIds);
                  const isDefeated = defeatedSet.has(opp.id);
                  const isSelected = unlocked && selectedOpp?.id === opp.id;
                  const prevOpp = getRequiredPreviousOpponent(opp.id);

                  if (!unlocked) {
                    return (
                      <MbRow
                        key={opp.id}
                        state="locked"
                        className="arena-opp-card--locked"
                        icon={<Lock size={20} color="#9a7656" />}
                        title={
                          <span className="arena-row-title-wrap">
                            <span>{opp.name}</span>
                            <span className="mb-tag">NIV. {opp.level}</span>
                            {opp.isBoss && <span className="mb-tag">BOSS</span>}
                          </span>
                        }
                        desc={`Bats ${prevOpp ? prevOpp.name : 'le rival précédent'} pour débloquer`}
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
                    );
                  }

                  const portraitUrl = resolveRivalSprite(`${opp.id} ${opp.name}`).url;

                  return (
                    <MbRow
                      key={opp.id}
                      state={isSelected ? 'active' : 'default'}
                      className={opp.isBoss ? 'arena-opp-row--boss' : ''}
                      icon={<img src={portraitUrl} alt={opp.name} />}
                      title={
                        <span className="arena-row-title-wrap">
                          <span>{opp.name}</span>
                          {isSelected && <span className="mb-tag mb-tag--orange">CIBLE</span>}
                          {isDefeated && <span className="mb-tag mb-tag--olive">VAINCU ✓</span>}
                          {opp.isBoss && <span className="mb-tag">BOSS</span>}
                        </span>
                      }
                      desc={
                        <span className="arena-row-desc-inline">
                          <GameIcon name={resolveArenaIconName(opp.arena)} size={14} rounded />
                          <span>
                            {opp.title} • Niv.{opp.level}
                          </span>
                        </span>
                      }
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
              </div>
            )}
          </SectionCard>
        </div>

        {/* LEFT COLUMN ROW 2 (PC) / BOTTOM (Mobile): Compact Combat Log */}
        <div className="arena-log-col">
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
      </div>
    </div>
  );
};
