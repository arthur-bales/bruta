import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Swords,
  FastForward,
  SkipForward,
  ArrowLeft,
  Trophy,
  Skull,
  Zap,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type { ArenaTheme, BattleResult, CombatEvent, OpponentDefinition } from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import { computeDerivedStats } from '@shared/progression';
import { getAvailableOpponentsForLevel } from '@shared/opponentsCatalog';
import { resolveItemIconUrl, resolveRivalSprite } from '@/engine/art/aiAssets';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const ARENA_BADGE: Record<ArenaTheme, { label: string; bg: string }> = {
  coliseum: { label: '🏛️ Colisée', bg: '#fff3d6' },
  dojo: { label: '⛩️ Dojo', bg: '#e6f6ff' },
  volcano: { label: '🌋 Volcan', bg: '#ffe4e6' },
};

interface LiveHudState {
  leftHp: number;
  leftMaxHp: number;
  leftRage: number;
  rightHp: number;
  rightMaxHp: number;
  rightRage: number;
}

export const ArenaView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    pendingBattle,
    setPendingBattle,
    startArenaBattle,
    addToast,
    setActiveView,
  } = useGame();

  const [opponents, setOpponents] = useState<OpponentDefinition[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [filter, setFilter] = useState<'all' | 'normal' | 'boss'>('all');
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [lastOpponentId, setLastOpponentId] = useState<string | null>(null);

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

  // Fetch arena opponents
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
      addToast('Plus d’énergie d’arène ! Elle se régénère automatiquement ou monte de niveau.', 'error');
      return;
    }
    setLaunchingId(opponentId);
    try {
      const battle = await startArenaBattle(opponentId);
      setLastOpponentId(opponentId);
      initBattlePlayback(battle);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de lancer le combat.', 'error');
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

  if (!fighter || !derivedStats) return null;

  // ---------------- LIVE BATTLE MODE ----------------
  if (activeBattle && liveHud) {
    const leftHpPct = Math.max(0, Math.min(100, Math.round((liveHud.leftHp / Math.max(1, liveHud.leftMaxHp)) * 100)));
    const rightHpPct = Math.max(0, Math.min(100, Math.round((liveHud.rightHp / Math.max(1, liveHud.rightMaxHp)) * 100)));
    const playerWon = activeBattle.winner === 'left';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Controls Header */}
        <div className="view-header" style={{ marginBottom: 4 }}>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              soundEngine.play('click');
              setActiveBattle(null);
            }}
          >
            <ArrowLeft size={16} />
            Adversaires
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: ARENA_BADGE[activeBattle.arena].bg }}>
              {ARENA_BADGE[activeBattle.arena].label}
            </span>

            <button
              type="button"
              className={`btn btn--sm ${battleSpeed === 2 ? 'btn--gold' : ''}`}
              onClick={() => {
                soundEngine.play('click');
                setBattleSpeed((s) => (s === 1 ? 2 : 1));
              }}
            >
              <FastForward size={15} />
              Vitesse {battleSpeed}x
            </button>

            {!battleFinished && (
              <button
                type="button"
                className="btn btn--sm btn--sky"
                onClick={handleSkipToResult}
              >
                <SkipForward size={15} />
                Passer
              </button>
            )}
          </div>
        </div>

        {/* Dual Fighter HP + Rage HUD */}
        <div className="comic-card battle-hud">
          <div className="battle-fighter-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.96rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeBattle.left.name}
              </strong>
              <span className="badge" style={{ background: '#fff3d6', fontSize: '0.72rem' }}>
                Niv.{activeBattle.left.level}
              </span>
            </div>
            <div className="meter" style={{ height: 18 }}>
              <div className="meter__fill meter__fill--hp-ally" style={{ width: `${leftHpPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 800 }}>
              <span>
                ❤️ {liveHud.leftHp} / {liveHud.leftMaxHp}
              </span>
              <span style={{ color: '#d97706' }}>🔥 Rage {Math.round(liveHud.leftRage)}%</span>
            </div>
            <div className="meter" style={{ height: 9 }}>
              <div className="meter__fill meter__fill--rage" style={{ width: `${Math.min(100, liveHud.leftRage)}%` }} />
            </div>
          </div>

          <div className="battle-vs">VS</div>

          <div className="battle-fighter-bar battle-fighter-bar--right">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexDirection: 'row-reverse' }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.96rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeBattle.right.name}
              </strong>
              <span className="badge" style={{ background: '#ffe4e6', fontSize: '0.72rem' }}>
                Niv.{activeBattle.right.level}
              </span>
            </div>
            <div className="meter" style={{ height: 18 }}>
              <div className="meter__fill meter__fill--hp" style={{ width: `${rightHpPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 800 }}>
              <span style={{ color: '#d97706' }}>Rage {Math.round(liveHud.rightRage)}% 🔥</span>
              <span>
                {liveHud.rightHp} / {liveHud.rightMaxHp} ❤️
              </span>
            </div>
            <div className="meter" style={{ height: 9 }}>
              <div className="meter__fill meter__fill--rage" style={{ width: `${Math.min(100, liveHud.rightRage)}%` }} />
            </div>
          </div>
        </div>

        {/* Live Phaser Arena Canvas */}
        <div className="stage-frame stage-frame--arena">
          <PhaserCanvas
            mode="arena"
            arena={activeBattle.arena}
            battle={activeBattle}
            battleSpeed={battleSpeed}
            onBattleEvent={handleBattleEvent}
            onBattleComplete={handleBattleComplete}
          />
        </div>

        {/* Victory / Defeat Rewards Banner */}
        {battleFinished && (
          <div
            className="comic-card card-pad animate-pop"
            style={{
              background: playerWon
                ? 'linear-gradient(135deg, #ecfdf5 0%, #fef9c3 100%)'
                : 'linear-gradient(135deg, #fef2f2 0%, #ffedd5 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {playerWon ? (
                  <Trophy size={30} color="#d97706" />
                ) : (
                  <Skull size={30} color="#dc2626" />
                )}
                <div>
                  <h2 style={{ fontSize: '1.45rem', color: playerWon ? '#15803d' : '#b91c1c' }}>
                    {playerWon ? 'VICTOIRE ÉCLATANTE !' : 'DÉFAITE HEROÏQUE !'}
                  </h2>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink-body)' }}>
                    Combat terminé en {activeBattle.totalTurns} tour(s) contre {activeBattle.right.name}.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span className="badge" style={{ background: '#fff7dc' }}>
                  🪙 +{activeBattle.rewards.gold} Or
                </span>
                <span className="badge" style={{ background: '#e0f2fe' }}>
                  ⭐ +{activeBattle.rewards.xp} XP
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
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: '2px solid #d97706',
                  background: '#fef08a',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
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
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: `2.5px solid ${RARITY_META[activeBattle.rewards.lootItem.rarity].border}`,
                  background: RARITY_META[activeBattle.rewards.lootItem.rarity].bg,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 14,
                      background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6 100%)',
                      border: `2.5px solid ${RARITY_META[activeBattle.rewards.lootItem.rarity].border}`,
                      boxShadow: '0 2px 0 var(--ink-strong)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      padding: 4,
                    }}
                  >
                    <img
                      src={resolveItemIconUrl(activeBattle.rewards.lootItem)}
                      alt={activeBattle.rewards.lootItem.name}
                      width={52}
                      height={52}
                      style={{
                        width: 52,
                        height: 52,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 2px rgba(35, 25, 23, 0.22))',
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 900, textTransform: 'uppercase', color: RARITY_META[activeBattle.rewards.lootItem.rarity].color }}>
                      🎁 BUTIN OBTENU • {SLOT_LABELS[activeBattle.rewards.lootItem.slot].label} ({RARITY_META[activeBattle.rewards.lootItem.rarity].label})
                    </div>
                    <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {lastOpponentId && (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={launchingId !== null || fighter.energy <= 0}
                  onClick={() => void handleChallengeOpponent(lastOpponentId)}
                >
                  <RotateCcw size={17} />
                  Rejouer ({fighter.energy}⚡)
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveBattle(null);
                }}
              >
                <Swords size={17} />
                Choisir un autre adversaire
              </button>
            </div>
          </div>
        )}

        {/* Live Scrolling French Battle Log */}
        <div className="comic-card">
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '2px solid var(--ink-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <strong style={{ fontFamily: 'var(--font-display)' }}>Journal de Combat</strong>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
              {battleLog.length} action(s)
            </span>
          </div>
          <div className="battle-log" ref={logContainerRef}>
            {battleLog.length === 0 ? (
              <div className="battle-log__entry">Les combattants entrent dans l’arène…</div>
            ) : (
              battleLog.map((ev) => {
                const cls =
                  ev.type === 'victory'
                    ? 'battle-log__entry--victory'
                    : ev.type === 'special'
                      ? 'battle-log__entry--special'
                      : ev.isCrit
                        ? 'battle-log__entry--crit'
                        : '';
                return (
                  <div key={ev.seq} className={`battle-log__entry ${cls}`}>
                    <span style={{ opacity: 0.65, marginRight: 6 }}>[T{ev.turn}]</span>
                    {ev.logText}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- OPPONENT SELECTOR MODE ----------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Swords size={26} color="var(--accent-flame)" />
            Arène des Légendes
          </h1>
          <p className="view-subtitle">
            Choisis un rival ou un Boss d’arène pour gagner de l’or, de l’XP, du classement et du butin !
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge" style={{ background: '#ffedd5', fontSize: '0.86rem', padding: '6px 12px' }}>
            <Zap size={14} color="#ea580c" />
            Énergie : {fighter.energy}/{fighter.maxEnergy}
          </span>
          <span className="badge" style={{ background: '#fff3d6', fontSize: '0.86rem', padding: '6px 12px' }}>
            Ta Puissance : {derivedStats.powerScore}
          </span>
        </div>
      </div>

      <div className="tabs-bar">
        {(
          [
            { id: 'all', label: `Tous (${opponents.length})` },
            { id: 'normal', label: 'Combattants' },
            { id: 'boss', label: 'Boss d’Arène 👹' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${filter === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => {
              soundEngine.play('click');
              setFilter(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingOpps ? (
        <div className="comic-card card-pad" style={{ textAlign: 'center', fontWeight: 800 }}>
          Chargement des adversaires de l’arène…
        </div>
      ) : (
        <div className="grid-cards">
          {filteredOpponents.map((opp) => {
            const oppDerived = computeDerivedStats(opp.baseStats, opp.level, opp.equipped);
            const portraitUrl = resolveRivalSprite(opp.id + ' ' + opp.name).url;
            const isTough = oppDerived.powerScore > derivedStats.powerScore * 1.25;
            const arenaMeta = ARENA_BADGE[opp.arena];

            return (
              <div
                key={opp.id}
                className="comic-card card-pad"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: opp.isBoss
                    ? 'linear-gradient(180deg, #fff5eb 0%, #ffe6d5 100%)'
                    : 'var(--bg-panel)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={portraitUrl}
                    alt={opp.name}
                    className="avatar-thumb"
                    style={{ width: 68, height: 68, padding: 3, objectFit: 'contain' }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.08rem' }}>{opp.name}</h3>
                      {opp.isBoss && (
                        <span className="badge" style={{ background: '#fecaca', color: '#991b1b', fontSize: '0.7rem' }}>
                          BOSS
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                      {opp.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                      <span className="badge" style={{ background: '#fff3d6', fontSize: '0.72rem' }}>
                        Niv.{opp.level}
                      </span>
                      <span className="badge" style={{ background: arenaMeta.bg, fontSize: '0.72rem' }}>
                        {arenaMeta.label}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: isTough ? '#fee2e2' : '#dcfce7',
                          fontSize: '0.72rem',
                        }}
                      >
                        ⚔️ {oppDerived.powerScore}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--ink-body)', fontWeight: 700 }}>
                  {opp.tagline}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="stat-tag">🪙 +{opp.rewardGold} Or</span>
                  <span className="stat-tag">⭐ +{opp.rewardXp} XP</span>
                  <span className="stat-tag stat-tag--effect">
                    🎁 {Math.round(opp.lootChance * 100)}% Butin ({RARITY_META[opp.lootMinRarity].label}+)
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn ${opp.isBoss ? 'btn--danger' : 'btn--primary'}`}
                  disabled={launchingId !== null || fighter.energy <= 0}
                  onClick={() => void handleChallengeOpponent(opp.id)}
                  style={{ marginTop: 'auto', width: '100%' }}
                >
                  <Swords size={18} />
                  {launchingId === opp.id
                    ? 'Préparation…'
                    : fighter.energy <= 0
                      ? 'Énergie épuisée (0⚡)'
                      : 'COMBATTRE ! (-1⚡)'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
