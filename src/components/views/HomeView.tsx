import React, { useMemo, useRef, useState } from 'react';
import {
  Coins,
  Gift,
  Palette,
  Sparkles,
  Star,
  Swords,
  X,
} from 'lucide-react';
import type { AnimationName, ArenaTheme, CoreStats, EquipmentItem } from '@shared/types';
import { SKILLS_CATALOG } from '@shared/skillsCatalog';
import { UPGRADES_CATALOG, getUpgradeCost } from '@shared/upgradesCatalog';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import {
  HeartHp,
  MbRow,
  ParchmentButton,
  PriceButton,
  SectionCard,
  SegmentedStat,
  formatCompact,
} from '@/components/ui/BruteUI';
import {
  GameIcon,
  resolveArenaIconName,
  resolveSkillIconName,
  resolveUpgradeIconName,
} from '@/components/ui/GameIcon';
import { resolveItemIconUrl } from '@/engine/art/aiAssets';
import { soundEngine } from '@/engine/audio/soundEffects';
import { useGame } from '@/state/GameContext';

const ARENA_OPTIONS: { id: ArenaTheme; label: string }[] = [
  { id: 'coliseum', label: 'Colisée' },
  { id: 'dojo', label: 'Dojo' },
  { id: 'volcano', label: 'Volcan' },
];

const CORE_STAT_ROWS: { key: keyof CoreStats; label: string }[] = [
  { key: 'str', label: 'Force' },
  { key: 'def', label: 'Défense' },
  { key: 'agi', label: 'Agilité' },
  { key: 'vit', label: 'Vitalité' },
  { key: 'lck', label: 'Chance' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return `${seconds}s`;
}

function formatGoldDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const HomeView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    clickMetrics,
    effectiveGold,
    homeArena,
    setHomeArena,
    setActiveView,
    offlineEarnings,
    dismissOfflineEarnings,
    canClaimDaily,
    claimableMissionsCount,
    claimDailyReward,
    registerClickStrike,
    allocateStat,
    buyUpgrade,
    addToast,
  } = useGame();

  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [allocatingStat, setAllocatingStat] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [tapFeedback, setTapFeedback] = useState<{ text: string; nonce: number } | null>(null);
  const tapComboRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  const quickUpgrades = useMemo(() => UPGRADES_CATALOG.slice(0, 3), []);

  // Collect equipped + owned gear for the wooden board (equipped first, deduplicated)
  const boardItems = useMemo<Array<{ item: EquipmentItem; equipped: boolean }>>(() => {
    if (!fighter) return [];
    const seen = new Set<string>();
    const list: Array<{ item: EquipmentItem; equipped: boolean }> = [];
    const equippedSlots = [
      fighter.equipped.weapon,
      fighter.equipped.helmet,
      fighter.equipped.armor,
      fighter.equipped.gloves,
      fighter.equipped.boots,
    ];
    for (const eq of equippedSlots) {
      if (eq && !seen.has(eq.uid)) {
        seen.add(eq.uid);
        list.push({ item: eq, equipped: true });
      }
    }
    for (const inv of fighter.inventory) {
      if (list.length >= 10) break;
      if (!seen.has(inv.uid)) {
        seen.add(inv.uid);
        list.push({ item: inv, equipped: false });
      }
    }
    return list;
  }, [fighter]);

  if (!fighter || !derivedStats || !clickMetrics) return null;

  const statScale = Math.max(
    10,
    Math.ceil(
      Math.max(
        fighter.baseStats.str,
        fighter.baseStats.def,
        fighter.baseStats.agi,
        fighter.baseStats.vit,
        fighter.baseStats.lck,
        10,
      ) / 10,
    ) * 10,
  );

  const weaponLabel = fighter.equipped.weapon?.name ?? 'Poings Nus';
  const armorLabel =
    fighter.equipped.armor?.name ??
    fighter.equipped.helmet?.name ??
    'Pagnes en Toile';

  const triggerPose = (anim: AnimationName) => {
    soundEngine.play(anim === 'special' ? 'special' : anim === 'attack' ? 'hit' : 'click');
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const handleQuickTrainTap = () => {
    tapComboRef.current += 1;
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = window.setTimeout(() => {
      tapComboRef.current = 0;
      setTapFeedback(null);
    }, 1800);

    const isCrit = Math.random() < clickMetrics.clickCritChance;
    registerClickStrike({
      isCrit,
      isFever: false,
      combo: tapComboRef.current,
      feverProgress: 0,
    });
    soundEngine.play(isCrit ? 'heavy_hit' : 'hit');
    setPreviewAnim((prev) => ({
      anim: isCrit ? 'special' : 'attack',
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    const gain = clickMetrics.goldPerClick * (isCrit ? 1.5 : 1);
    setTapFeedback((prev) => ({
      text: `${isCrit ? 'CRIT! +' : '+'}${formatGoldDecimal(gain)} Or`,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  };

  const handleQuickDailyClaim = async () => {
    if (!canClaimDaily || claimingDaily) {
      setActiveView('missions');
      return;
    }
    setClaimingDaily(true);
    try {
      await claimDailyReward();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur lors de la réclamation.', 'error');
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleInlineAllocate = async (stat: keyof CoreStats) => {
    if (fighter.statPoints <= 0 || allocatingStat) return;
    setAllocatingStat(stat);
    try {
      await allocateStat(stat, 1);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur d’allocation.', 'error');
    } finally {
      setAllocatingStat(null);
    }
  };

  const handleQuickBuy = async (upgradeId: string) => {
    if (buyingId) return;
    setBuyingId(upgradeId);
    try {
      await buyUpgrade(upgradeId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant.', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const unlockedSkillsCount = SKILLS_CATALOG.filter((s) => (fighter.skills[s.id] ?? 0) > 0).length;

  return (
    <div className="cell-page">
      {/* Offline Earnings Welcome Banner */}
      {offlineEarnings && (
        <div className="cell-banner animate-pop">
          <div className="cell-banner__left">
            <div className="cell-banner__icon">
              <Coins size={22} />
            </div>
            <div>
              <div className="cell-banner__title">
                Tes apprentis ont travaillé {formatDuration(offlineEarnings.secondsAway)} !
              </div>
              <p className="cell-banner__sub">
                +{formatCompact(offlineEarnings.goldEarned)} Or
                {offlineEarnings.xpEarned > 0 ? ` & +${formatCompact(offlineEarnings.xpEarned)} XP` : ''} crédités
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--gold"
            onClick={() => {
              soundEngine.play('coin');
              dismissOfflineEarnings();
            }}
          >
            <X size={15} />
            Super !
          </button>
        </div>
      )}

      {/* Daily Reward / Claimable Missions Compact Banner */}
      {(canClaimDaily || claimableMissionsCount > 0) && (
        <div className="cell-banner">
          <div className="cell-banner__left">
            <div className="cell-banner__icon">
              <Gift size={20} />
            </div>
            <div>
              <div className="cell-banner__title">
                {canClaimDaily
                  ? `Cadeau du Jour ${(fighter.dailyStreak % 7) + 1} disponible !`
                  : `${claimableMissionsCount} récompense(s) de mission prête(s) !`}
              </div>
              <p className="cell-banner__sub">
                Récupère ton or, ton XP et tes coffres bonus du dojo.
              </p>
            </div>
          </div>
          <div className="cell-banner__actions">
            {canClaimDaily && (
              <button
                type="button"
                className="btn btn--sm btn--gold"
                disabled={claimingDaily}
                onClick={() => void handleQuickDailyClaim()}
              >
                <Gift size={15} />
                {claimingDaily ? 'En cours…' : 'Réclamer'}
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                soundEngine.play('click');
                setActiveView('missions');
              }}
            >
              <Sparkles size={15} />
              Missions
            </button>
          </div>
        </div>
      )}

      {/* Main Cellule Grid:
          Mobile: Hero -> Stats -> Arsenal -> Training -> Arena CTA
          PC: Left (Arsenal + Training) | Right (Hero + Stats + Arena CTA) */}
      <div className="cell-grid">
        {/* LEFT COLUMN (PC) */}
        <div className="cell-col-left">
          {/* Wooden Weapons Rack + Skill Tiles Grid (IMG_4201) */}
          <SectionCard
            className="cell-card-arsenal"
            title="Armes et équipements de combat"
            right={
              <button
                type="button"
                className="cell-mini-pill"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('inventory');
                }}
              >
                Sac ({fighter.inventory.length}) →
              </button>
            }
          >
            <div
              className="wood-board cell-wood-wrap"
              role="button"
              tabIndex={0}
              aria-label="Ouvrir l'inventaire"
              onClick={() => {
                soundEngine.play('click');
                setActiveView('inventory');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveView('inventory');
                }
              }}
            >
              {boardItems.length === 0 ? (
                <div className="wood-board__empty">
                  Aucune arme accrochée au râtelier — visite la Boutique pour équiper ta brute !
                </div>
              ) : (
                boardItems.map(({ item, equipped }) => (
                  <div
                    key={item.uid}
                    className={`wood-board__item ${equipped ? 'cell-wood-item--equipped' : ''}`}
                    title={`${item.name}${equipped ? ' (Équipé)' : ''}`}
                  >
                    <img src={resolveItemIconUrl(item)} alt={item.name} />
                    {equipped && <span className="cell-wood-item-badge">✓</span>}
                  </div>
                ))
              )}
            </div>

            <div className="cell-skills-block">
              <div className="cell-skills-head">
                <span className="mb-caption">
                  Compétences ({unlockedSkillsCount}/{SKILLS_CATALOG.length})
                </span>
                <button
                  type="button"
                  className="cell-mini-pill"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView('skills');
                  }}
                >
                  Gérer →
                </button>
              </div>
              <div className="skill-grid">
                {SKILLS_CATALOG.map((skill) => {
                  const lvl = fighter.skills[skill.id] ?? 0;
                  const unlocked = lvl > 0;
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={`skill-tile ${unlocked ? 'skill-tile--on' : ''}`}
                      title={`${skill.name} ${unlocked ? `(Niv.${lvl})` : `(Niv. requis : ${skill.unlockLevel})`}`}
                      onClick={() => {
                        soundEngine.play('click');
                        setActiveView('skills');
                      }}
                    >
                      <GameIcon name={resolveSkillIconName(skill.id)} size={28} />
                      {unlocked && <span className="skill-tile__lvl">{lvl}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          {/* Quick Training Upgrades (IMG_4207 bottom) */}
          <SectionCard
            className="cell-card-training"
            title="Entraînement & Compétences"
            right={
              <button
                type="button"
                className="cell-mini-pill"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('upgrades');
                }}
              >
                Tout voir →
              </button>
            }
          >
            <div className="mb-stack mb-stack--sm">
              {quickUpgrades.map((upg) => {
                const currentLvl = fighter.upgrades[upg.id] ?? 0;
                const isMax = currentLvl >= upg.maxLevel;
                const cost = getUpgradeCost(upg, currentLvl);
                const canAfford = effectiveGold >= cost;

                return (
                  <MbRow
                    key={upg.id}
                    icon={<GameIcon name={resolveUpgradeIconName(upg.id)} size={32} />}
                    title={upg.name}
                    level={`Niv.${currentLvl}`}
                    desc={upg.effectLabel}
                    right={
                      isMax ? (
                        <span className="mb-tag mb-tag--olive">MAX</span>
                      ) : (
                        <PriceButton
                          cost={cost}
                          disabled={!canAfford || buyingId === upg.id}
                          onClick={() => void handleQuickBuy(upg.id)}
                          title={`Améliorer ${upg.name} pour ${cost} Or`}
                        />
                      )
                    }
                  />
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN (PC) */}
        <div className="cell-col-right">
          {/* Card 1: Hero Stage Card (IMG_4207 top) */}
          <SectionCard className="cell-card-hero">
            <div className="cell-hero-head">
              <div className="cell-hero-name">
                <h2 className="mb-section-title">{fighter.name}</h2>
              </div>
              <button
                type="button"
                className="cell-train-pill"
                onClick={handleQuickTrainTap}
                title="Tape pour entraîner ta brute et gagner de l'or instantanément !"
              >
                <GameIcon name="fist" size={16} />
                TAPE POUR ENTRAÎNER (+{formatGoldDecimal(clickMetrics.goldPerClick)} Or)
              </button>
            </div>

            <div className="cell-stage-wrap">
              <div
                className="cell-stage-canvas"
                onClick={handleQuickTrainTap}
                style={{ cursor: 'pointer' }}
                title="Tape sur ta brute pour t'entraîner !"
              >
                <PhaserCanvas
                  mode="showcase"
                  arena={homeArena}
                  fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
                  previewAnim={previewAnim}
                />
                {tapFeedback && (
                  <div key={tapFeedback.nonce} className="cell-tap-float">
                    {tapFeedback.text}
                  </div>
                )}
              </div>

              {/* Dark-brown equipment strip (IMG_4207) */}
              <div
                className="cell-equip-strip"
                role="button"
                tabIndex={0}
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('inventory');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveView('inventory');
                  }
                }}
                title="Voir et changer ton équipement"
              >
                <span
                  className="cell-equip-strip__slot"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <GameIcon name="sword" size={16} />
                  {weaponLabel}
                </span>
                <span
                  className="cell-equip-strip__slot cell-equip-strip__slot--right"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <GameIcon name="iron_armor" size={16} />
                  {armorLabel}
                </span>
              </div>
            </div>

            {/* Compact Arena Theme Switcher + Pose / Skins controls */}
            <div className="cell-stage-controls">
              <div className="cell-pill-group">
                {ARENA_OPTIONS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    className={`cell-mini-pill ${homeArena === ar.id ? 'cell-mini-pill--active' : ''}`}
                    onClick={() => {
                      soundEngine.play('click');
                      setHomeArena(ar.id);
                    }}
                  >
                    <GameIcon name={resolveArenaIconName(ar.id)} size={16} rounded />
                    {ar.label}
                  </button>
                ))}
              </div>

              <div className="cell-pill-group">
                <button
                  type="button"
                  className="cell-mini-pill"
                  onClick={() => triggerPose('special')}
                  title="Animation spéciale"
                >
                  <Sparkles size={13} />
                  Pose
                </button>
                <button
                  type="button"
                  className="cell-mini-pill"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView('shop');
                  }}
                >
                  <Palette size={13} />
                  Skins
                </button>
                <button
                  type="button"
                  className="cell-mini-pill"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView('clicker');
                  }}
                >
                  <GameIcon name="training_dummy" size={15} />
                  Dojo
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: Heart HP + Segmented Stats (IMG_4207 middle & IMG_4201 right) */}
          <SectionCard className="cell-card-stats">
            <div className="cell-stats-head">
              <HeartHp hp={derivedStats.maxHp} />
              <div className="cell-rank-pill">
                Rang : {fighter.title}
              </div>
            </div>

            <div className="cell-stat-list">
              {CORE_STAT_ROWS.map((st) => {
                const baseVal = fighter.baseStats[st.key];
                const bonusVal = Object.values(fighter.equipped).reduce(
                  (sum, eq) => sum + (eq?.baseStats[st.key] ?? 0),
                  0,
                );
                const totalVal = baseVal + bonusVal;

                return (
                  <div key={st.key} className="cell-stat-line">
                    <div className="cell-stat-line__bar">
                      <SegmentedStat
                        label={st.label}
                        value={baseVal}
                        bonus={bonusVal}
                        max={statScale}
                        display={totalVal}
                      />
                    </div>
                    {fighter.statPoints > 0 && (
                      <button
                        type="button"
                        className="cell-stat-plus"
                        disabled={allocatingStat !== null}
                        onClick={() => void handleInlineAllocate(st.key)}
                        title={`Ajouter +1 en ${st.label}`}
                        aria-label={`Ajouter +1 en ${st.label}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {fighter.statPoints > 0 && (
              <div className="cell-points-bar">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Star size={15} fill="#f2c21b" color="#6b3f22" />
                  {fighter.statPoints} point(s) à répartir !
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--gold"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView('profile');
                  }}
                >
                  Profil complet
                </button>
              </div>
            )}

            <div className="cell-power-strip">
              <span>
                Puissance <strong>{formatCompact(derivedStats.powerScore)}</strong>
              </span>
              <span>
                Elo <strong>{fighter.rating}</strong>
              </span>
              <span>
                <strong>{fighter.progress.arenaWins}V</strong> - {fighter.progress.arenaLosses}D
              </span>
              <span>
                Auto <strong>{clickMetrics.autoGoldPerSec} Or/s</strong>
              </span>
            </div>
          </SectionCard>

          {/* Giant Torn-Parchment ARÈNE CTA (IMG_4201 bottom right) */}
          <div className="cell-card-arena cell-arena-box">
            <p className="mb-flavor" style={{ margin: 0 }}>
              Si tu veux te défouler sur quelqu&apos;un, c&apos;est par ici ! Plein de Brutes
              t&apos;attendent dans l&apos;Arène pour échanger des mandales !
            </p>
            <ParchmentButton
              onClick={() => {
                soundEngine.play('click');
                setActiveView('arena');
              }}
            >
              <Swords size={26} />
              ARÈNE
            </ParchmentButton>
          </div>
        </div>
      </div>
    </div>
  );
};
