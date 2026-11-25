import React, { useMemo, useState } from 'react';
import {
  Gift,
  CheckCircle2,
  Calendar,
  Target,
  Award,
  Sparkles,
  Coins,
  Gem,
  Star,
} from 'lucide-react';
import type { EquipmentItem } from '@shared/types';
import { RARITY_META } from '@shared/constants';
import {
  DAILY_REWARDS_CATALOG,
  MISSIONS_CATALOG,
  getMissionProgress,
} from '@shared/missionsCatalog';
import { MbRow, SectionCard } from '@/components/ui/BruteUI';
import { GameIcon, type GameIconName } from '@/components/ui/GameIcon';
import { resolveItemIconUrl } from '@/engine/art/aiAssets';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const MISSION_ICON_MAP: Record<string, GameIconName> = {
  mis_clicks_25: 'fist',
  mis_arena_first_battle: 'sword',
  mis_arena_wins_3: 'crown',
  mis_upgrades_3: 'anvil',
  mis_skills_2: 'scroll',
  mis_items_5: 'chest_wood',
  mis_pvp_win_1: 'axe',
  mis_boss_1: 'boss',
  ach_clicks_500: 'dash_boot',
  ach_level_10: 'helm',
  ach_arena_wins_20: 'fire_rage',
  ach_gold_10000: 'magnet',
  ach_skills_8: 'scroll',
  ach_pvp_wins_10: 'katana',
  ach_bosses_5: 'boss_dragon',
  ach_level_25: 'crown',
};

const DAILY_ICON_MAP: Record<number, GameIconName> = {
  1: 'magnet',
  2: 'training_dummy',
  3: 'chest_wood',
  4: 'chest_epic',
  5: 'arena_coliseum',
  6: 'arena_volcano',
  7: 'chest_mythic',
};

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

  const renderMissionList = (title: string, list: typeof MISSIONS_CATALOG) => {
    const claimedCount = list.filter((m) => getMissionProgress(fighter, m).claimed).length;

    return (
      <SectionCard
        title={title}
        right={
          <span className="mb-tag mb-tag--olive">
            {claimedCount}/{list.length} terminées
          </span>
        }
      >
        <div className="missions-list">
          {list.map((mission) => {
            const prog = getMissionProgress(fighter, mission);
            const canClaim = prog.completed && !prog.claimed;

            return (
              <MbRow
                key={mission.id}
                state={prog.claimed ? 'locked' : canClaim ? 'active' : 'default'}
                icon={
                  <GameIcon
                    name={MISSION_ICON_MAP[mission.id] ?? 'scroll'}
                    size={32}
                    rounded={mission.id === 'mis_boss_1' || mission.id === 'ach_bosses_5'}
                  />
                }
                title={mission.title}
                level={`${prog.percent}%`}
                desc={
                  <div className="mission-row-progress">
                    <span>{mission.description}</span>
                    <div className="meter" style={{ height: 15 }}>
                      <div
                        className={`meter__fill ${prog.completed ? 'meter__fill--hp' : 'meter__fill--xp'}`}
                        style={{ width: `${prog.percent}%` }}
                      />
                      <span className="meter__label">
                        {Math.min(prog.current, prog.target).toLocaleString('fr-FR')} /{' '}
                        {prog.target.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="arsenal-stat-tags">
                      <span
                        className="arsenal-stat-tag"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Coins size={12} color="#c9820a" />+{mission.rewardGold} Or
                      </span>
                      <span
                        className="arsenal-stat-tag"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Gem size={12} color="#2563eb" />+{mission.rewardGems}
                      </span>
                      <span
                        className="arsenal-stat-tag"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Star size={12} fill="#f2c21b" color="#8b4a2b" />+{mission.rewardXp} XP
                      </span>
                    </div>
                  </div>
                }
                right={
                  <div className="mission-row-right">
                    {prog.claimed ? (
                      <span className="mb-tag mb-tag--olive">
                        <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                        REÇU
                      </span>
                    ) : canClaim ? (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={busyId === mission.id}
                        onClick={() => void handleClaimMission(mission.id)}
                      >
                        <Gift size={14} />
                        {busyId === mission.id ? '…' : 'RÉCLAMER'}
                      </button>
                    ) : (
                      <span className="mb-tag">En cours</span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="arsenal-view">
      {/* Parchment Tab Pills */}
      <div className="arsenal-pills">
        <button
          type="button"
          className={`arsenal-pill ${tab === 'daily' ? 'arsenal-pill--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('daily');
          }}
        >
          <Calendar size={15} />
          Quotidien
          {canClaimDaily && <span className="mb-tag mb-tag--orange">1!</span>}
        </button>

        <button
          type="button"
          className={`arsenal-pill ${tab === 'missions' ? 'arsenal-pill--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('missions');
          }}
        >
          <Target size={15} />
          Missions
          {readyMissionsCount > 0 && (
            <span className="mb-tag mb-tag--orange">{readyMissionsCount}!</span>
          )}
        </button>

        <button
          type="button"
          className={`arsenal-pill ${tab === 'achievements' ? 'arsenal-pill--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setTab('achievements');
          }}
        >
          <Award size={15} />
          Succès
          {readyAchievementsCount > 0 && (
            <span className="mb-tag mb-tag--orange">{readyAchievementsCount}!</span>
          )}
        </button>
      </div>

      {/* Tab 1: 7-Day Daily Streak Calendar */}
      {tab === 'daily' && (
        <SectionCard
          title="Calendrier de 7 Jours"
          right={
            <>
              <span className="mb-tag">Série : {fighter.dailyStreak} j</span>
              {canClaimDaily ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busyId === 'daily'}
                  onClick={() => void handleClaimDaily()}
                >
                  <Gift size={15} />
                  {busyId === 'daily' ? 'Réclamation…' : `RÉCLAMER JOUR ${nextClaimDay}`}
                </button>
              ) : (
                <span className="mb-tag mb-tag--olive">REÇU AUJOURD’HUI ✓</span>
              )}
            </>
          }
        >
          <p className="mb-flavor" style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>
            Connecte-toi chaque jour pour grimper ta série — un coffre garanti au Jour 3 et au Jour 7 !
          </p>

          {dailyBonusItem && (
            <div
              className="equipped-inspector animate-pop"
              style={{
                marginTop: 0,
                marginBottom: 12,
                borderColor: RARITY_META[dailyBonusItem.rarity].border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  className="parchment-item-card__meta"
                  style={{ color: RARITY_META[dailyBonusItem.rarity].color }}
                >
                  <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  COFFRE QUOTIDIEN OUVERT ({RARITY_META[dailyBonusItem.rarity].label})
                </div>
                <div
                  className="parchment-item-card__title"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <img
                    src={resolveItemIconUrl(dailyBonusItem)}
                    alt={dailyBonusItem.name}
                    width={22}
                    height={22}
                  />
                  {dailyBonusItem.name} ajouté à ton sac !
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

          <div className="missions-daily-grid">
            {DAILY_REWARDS_CATALOG.map((reward) => {
              const isClaimed =
                completedDaysInCycle >= reward.day ||
                (!canClaimDaily && fighter.dailyStreak > 0 && completedDaysInCycle === 0);
              const isToday = canClaimDaily && reward.day === nextClaimDay;

              return (
                <div
                  key={reward.day}
                  className={`daily-tile ${isClaimed ? 'daily-tile--claimed' : ''} ${
                    isToday ? 'daily-tile--today' : ''
                  }`}
                >
                  <span
                    className={`mb-tag ${
                      isToday ? 'mb-tag--orange' : isClaimed ? 'mb-tag--olive' : ''
                    }`}
                  >
                    Jour {reward.day}
                  </span>
                  <div className="daily-tile__icon" aria-hidden="true">
                    <GameIcon
                      name={DAILY_ICON_MAP[reward.day] ?? 'chest_wood'}
                      size={38}
                      rounded={reward.day === 5 || reward.day === 6}
                    />
                  </div>
                  <div className="daily-tile__title">{reward.title}</div>
                  <div className="daily-tile__rewards">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Coins size={12} color="#c9820a" />
                      {reward.gold}
                    </span>{' '}
                    •{' '}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Gem size={12} color="#2563eb" />
                      {reward.gems}
                    </span>
                    <br />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Star size={12} fill="#f2c21b" color="#8b4a2b" />+{reward.xp} XP
                    </span>
                  </div>
                  {reward.chestRarity && (
                    <span
                      className="arsenal-stat-tag arsenal-stat-tag--effect"
                      style={{ fontSize: '0.66rem' }}
                    >
                      Coffre {RARITY_META[reward.chestRarity].label}
                    </span>
                  )}
                  {isClaimed && (
                    <span className="mb-tag mb-tag--olive" style={{ fontSize: '0.68rem' }}>
                      ✓ Reçu
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Tab 2: Missions */}
      {tab === 'missions' && renderMissionList('Missions de l’Arène', missions)}

      {/* Tab 3: Achievements */}
      {tab === 'achievements' && renderMissionList('Succès & Exploits', achievements)}
    </div>
  );
};
