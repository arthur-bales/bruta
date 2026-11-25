import React, { useMemo, useState } from 'react';
import { Gift, CheckCircle2, Calendar, Target, Award, Sparkles } from 'lucide-react';
import type { EquipmentItem } from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import {
  DAILY_REWARDS_CATALOG,
  MISSIONS_CATALOG,
  getMissionProgress,
} from '@shared/missionsCatalog';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const MissionsView: React.FC = () => {
  const {
    fighter,
    canClaimDaily,
    claimDailyReward,
    claimMission,
    addToast,
    setActiveView,
  } = useGame();

  const [tab, setTab] = useState<'daily' | 'missions' | 'achievements'>('daily');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dailyBonusItem, setDailyBonusItem] = useState<EquipmentItem | null>(null);

  const missions = useMemo(
    () => MISSIONS_CATALOG.filter((m) => m.type === 'mission'),
    [],
  );
  const achievements = useMemo(
    () => MISSIONS_CATALOG.filter((m) => m.type === 'achievement'),
    [],
  );

  if (!fighter) return null;

  const readyMissionsCount = missions.filter((m) => {
    const p = getMissionProgress(fighter, m);
    return p.completed && !p.claimed;
  }).length;

  const readyAchievementsCount = achievements.filter((m) => {
    const p = getMissionProgress(fighter, m);
    return p.completed && !p.claimed;
  }).length;

  const completedDaysInCycle = fighter.dailyStreak % 7;
  const nextClaimDay = completedDaysInCycle + 1;

  const handleClaimDaily = async () => {
    if (!canClaimDaily) return;
    setBusyId('daily');
    try {
      const bonusItem = await claimDailyReward();
      if (bonusItem) {
        setDailyBonusItem(bonusItem);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Déjà réclamé aujourd’hui !', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleClaimMission = async (missionId: string) => {
    setBusyId(missionId);
    try {
      await claimMission(missionId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de réclamer cette mission.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const renderMissionList = (list: typeof MISSIONS_CATALOG) => (
    <div className="grid-cards">
      {list.map((mission) => {
        const prog = getMissionProgress(fighter, mission);
        return (
          <div
            key={mission.id}
            className="item-card"
            style={{
              background: prog.claimed
                ? '#f3f4f6'
                : prog.completed
                  ? '#fff9db'
                  : '#ffffff',
              borderColor: prog.completed && !prog.claimed ? '#d97706' : 'var(--ink-strong)',
              opacity: prog.claimed ? 0.72 : 1,
            }}
          >
            <div className="item-card__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'var(--bg-parchment)',
                    border: '2px solid var(--ink-strong)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.35rem',
                    flexShrink: 0,
                  }}
                >
                  {mission.icon}
                </div>
                <div>
                  <div className="item-card__name">{mission.title}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    {mission.description}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800 }}>
                <span>Progression</span>
                <span>
                  {Math.min(prog.current, prog.target).toLocaleString('fr-FR')} /{' '}
                  {prog.target.toLocaleString('fr-FR')} ({prog.percent}%)
                </span>
              </div>
              <div className="meter" style={{ height: 12 }}>
                <div
                  className={`meter__fill ${prog.completed ? 'meter__fill--hp-ally' : 'meter__fill--xp'}`}
                  style={{ width: `${prog.percent}%` }}
                />
              </div>
            </div>

            <div className="item-card__stats">
              <span className="stat-tag">🪙 +{mission.rewardGold} Or</span>
              <span className="stat-tag">💎 +{mission.rewardGems}</span>
              <span className="stat-tag">⭐ +{mission.rewardXp} XP</span>
            </div>

            <button
              type="button"
              className={`btn btn--sm ${prog.completed && !prog.claimed ? 'btn--jade' : ''}`}
              disabled={!prog.completed || prog.claimed || busyId === mission.id}
              onClick={() => void handleClaimMission(mission.id)}
              style={{ marginTop: 'auto', width: '100%' }}
            >
              {prog.claimed ? (
                <>
                  <CheckCircle2 size={15} />
                  Réclamée ✓
                </>
              ) : prog.completed ? (
                <>
                  <Gift size={15} />
                  {busyId === mission.id ? 'Réclamation…' : 'Réclamer la récompense !'}
                </>
              ) : (
                'En cours…'
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Gift size={26} color="var(--accent-flame)" />
            Missions, Succès & Bonus Quotidien
          </h1>
          <p className="view-subtitle">
            Connecte-toi chaque jour et accomplis des objectifs pour récolter de l’or, des gemmes et des coffres rares !
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          type="button"
          className={`tab-btn ${tab === 'daily' ? 'tab-btn--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('daily');
          }}
        >
          <Calendar size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Quotidien {canClaimDaily ? '(1!)' : ''}
        </button>

        <button
          type="button"
          className={`tab-btn ${tab === 'missions' ? 'tab-btn--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('missions');
          }}
        >
          <Target size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Missions {readyMissionsCount > 0 ? `(${readyMissionsCount}!)` : ''}
        </button>

        <button
          type="button"
          className={`tab-btn ${tab === 'achievements' ? 'tab-btn--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('achievements');
          }}
        >
          <Award size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Succès {readyAchievementsCount > 0 ? `(${readyAchievementsCount}!)` : ''}
        </button>
      </div>

      {/* Tab 1: 7-Day Daily Streak Calendar */}
      {tab === 'daily' && (
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.2rem' }}>Calendrier de 7 Jours</h2>
              <p className="view-subtitle">
                Série actuelle : <strong>{fighter.dailyStreak} jour(s)</strong> • Un coffre garanti au Jour 3 et au Jour 7 !
              </p>
            </div>
            <button
              type="button"
              className={`btn ${canClaimDaily ? 'btn--gold btn--lg' : ''}`}
              disabled={!canClaimDaily || busyId === 'daily'}
              onClick={() => void handleClaimDaily()}
            >
              <Gift size={18} />
              {canClaimDaily
                ? busyId === 'daily'
                  ? 'Réclamation…'
                  : `Réclamer le Jour ${nextClaimDay} !`
                : 'Déjà réclamé aujourd’hui ✓'}
            </button>
          </div>

          {dailyBonusItem && (
            <div
              className="animate-pop"
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: `2.5px solid ${RARITY_META[dailyBonusItem.rarity].border}`,
                background: RARITY_META[dailyBonusItem.rarity].bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 900, color: RARITY_META[dailyBonusItem.rarity].color }}>
                  <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  COFFRE QUOTIDIEN OUVERT ({RARITY_META[dailyBonusItem.rarity].label})
                </div>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
                  {SLOT_LABELS[dailyBonusItem.slot].icon} {dailyBonusItem.name} ajouté à ton sac !
                </strong>
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

          <div className="daily-grid">
            {DAILY_REWARDS_CATALOG.map((reward) => {
              const isClaimed =
                completedDaysInCycle >= reward.day ||
                (!canClaimDaily && fighter.dailyStreak > 0 && completedDaysInCycle === 0);
              const isToday = canClaimDaily && reward.day === nextClaimDay;

              return (
                <div
                  key={reward.day}
                  className={`daily-day ${isClaimed ? 'daily-day--claimed' : ''} ${
                    isToday ? 'daily-day--today' : ''
                  }`}
                >
                  <span
                    className="badge"
                    style={{
                      background: isToday ? '#ef5b36' : isClaimed ? '#22c55e' : '#f5ebd4',
                      color: isToday || isClaimed ? '#ffffff' : 'var(--ink-strong)',
                    }}
                  >
                    Jour {reward.day}
                  </span>
                  <div style={{ fontSize: '1.85rem', lineHeight: 1.1 }}>{reward.icon}</div>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.86rem' }}>
                    {reward.title}
                  </strong>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--ink-body)' }}>
                    🪙 {reward.gold} • 💎 {reward.gems}
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                    ⭐ +{reward.xp} XP
                  </div>
                  {reward.chestRarity && (
                    <span
                      className="badge"
                      style={{
                        background: RARITY_META[reward.chestRarity].bg,
                        color: RARITY_META[reward.chestRarity].color,
                        fontSize: '0.68rem',
                      }}
                    >
                      Coffre {RARITY_META[reward.chestRarity].label}
                    </span>
                  )}
                  {isClaimed && (
                    <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#15803d' }}>
                      ✓ Reçu
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Missions */}
      {tab === 'missions' && renderMissionList(missions)}

      {/* Tab 3: Achievements */}
      {tab === 'achievements' && renderMissionList(achievements)}
    </div>
  );
};
