import React, { useMemo, useRef, useState } from 'react';
import { Coins, Flame, Settings, Star, Zap } from 'lucide-react';
import type { UpgradeCategory } from '@shared/types';
import { UPGRADES_CATALOG, getUpgradeCost } from '@shared/upgradesCatalog';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import {
  MbRow,
  PriceButton,
  SectionCard,
  formatCompact,
} from '@/components/ui/BruteUI';
import { GameIcon, resolveUpgradeIconName } from '@/components/ui/GameIcon';
import { soundEngine } from '@/engine/audio/soundEffects';
import { useGame } from '@/state/GameContext';

type UpgradeFilter = 'all' | UpgradeCategory;

export const ClickerView: React.FC = () => {
  const {
    fighter,
    clickMetrics,
    effectiveGold,
    optimisticClicks,
    registerClickStrike,
    buyUpgrade,
    addToast,
  } = useGame();

  const [combo, setCombo] = useState(0);
  const [feverProgress, setFeverProgress] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string>(
    'Clique ou tape directement sur le mannequin pour frapper !',
  );
  const [filter, setFilter] = useState<UpgradeFilter>('all');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const comboTimerRef = useRef<number | null>(null);

  const visibleUpgrades = useMemo(() => {
    if (filter === 'all') return UPGRADES_CATALOG;
    return UPGRADES_CATALOG.filter((u) => u.category === filter);
  }, [filter]);

  if (!fighter || !clickMetrics) return null;

  const scheduleComboDecay = () => {
    if (comboTimerRef.current) {
      window.clearTimeout(comboTimerRef.current);
    }
    comboTimerRef.current = window.setTimeout(() => {
      setCombo(0);
      setIsFever(false);
      setFeverProgress(0);
    }, 2600);
  };

  const handlePhaserStrike = (payload: {
    isCrit: boolean;
    isFever: boolean;
    combo: number;
    feverProgress: number;
  }) => {
    setCombo(payload.combo);
    setIsFever(payload.isFever);
    setFeverProgress(Math.min(100, Math.max(0, Math.round(payload.feverProgress))));
    scheduleComboDecay();
    registerClickStrike(payload);

    if (payload.isFever) {
      setLastFeedback(`MODE FIÈVRE x2 ! Combo x${payload.combo} !`);
    } else if (payload.isCrit) {
      setLastFeedback(`SUPER CRITIQUE ! Combo x${payload.combo} !`);
    } else {
      setLastFeedback(`+${clickMetrics.goldPerClick} Or (Combo x${payload.combo})`);
    }
  };

  const handleBuy = async (upgradeId: string) => {
    setBuyingId(upgradeId);
    try {
      await buyUpgrade(upgradeId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant.', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const totalStrikes = fighter.progress.totalClicks + optimisticClicks;

  return (
    <div className="dojo-layout">
      {/* LEFT COLUMN: Metrics + Directly Clickable Phaser Dojo Stage */}
      <div className="dojo-left-col">
        <div className="dojo-metrics">
          <div className="dojo-metric-tile">
            <span>Or / Clic</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Coins size={15} color="#c9820a" />+{clickMetrics.goldPerClick}
            </strong>
          </div>
          <div className="dojo-metric-tile">
            <span>XP / Clic</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Star size={15} fill="#f2c21b" color="#8b4a2b" />+{clickMetrics.xpPerClick}
            </strong>
          </div>
          <div className="dojo-metric-tile">
            <span>Auto Or / s</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Settings size={15} color="#6b3f22" />
              {clickMetrics.autoGoldPerSec}/s
            </strong>
          </div>
          <div className="dojo-metric-tile">
            <span>Critique Clic</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <GameIcon name="fire_rage" size={16} />
              {Math.round(clickMetrics.clickCritChance * 100)}%
            </strong>
          </div>
        </div>

        <SectionCard
          title="Dojo d’Entraînement"
          right={
            <span className="mb-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GameIcon name="fist" size={15} />
              {formatCompact(totalStrikes)} frappes
            </span>
          }
        >
          <div className="mb-stack mb-stack--sm">
            {/* Warm Parchment Fever Meter */}
            <div className={`dojo-fever-bar ${isFever ? 'dojo-fever-bar--active' : ''}`}>
              <div className="dojo-fever-bar__top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={17} color={isFever ? '#d0412a' : '#e2700c'} />
                  <span className="mb-caption">
                    {isFever ? 'MODE FIÈVRE ACTIF (Or & XP x2) !' : 'Jauge de Fièvre'}
                  </span>
                </div>
                <span className={`mb-tag ${combo >= 10 ? 'mb-tag--orange' : ''}`}>
                  <Zap size={12} style={{ marginRight: 3 }} />
                  Combo x{combo}
                </span>
              </div>

              <div className="meter" style={{ height: 18 }}>
                <div
                  className="meter__fill meter__fill--fever"
                  style={{ width: `${isFever ? 100 : feverProgress}%` }}
                />
                <span className="meter__label">
                  {isFever ? 'FIÈVRE x2 !' : `${feverProgress}%`}
                </span>
              </div>
            </div>

            {/* Directly Clickable Phaser Clicker Stage (no redundant button below) */}
            <div className="dojo-stage-frame" title="Clique sur le mannequin pour frapper !">
              <PhaserCanvas
                mode="clicker"
                arena="dojo"
                fighter={{
                  appearance: fighter.appearance,
                  equipped: fighter.equipped,
                  equippedSkinId: fighter.equippedSkinId,
                }}
                clickerMetrics={{
                  clickDamage: clickMetrics.clickDamage,
                  goldPerClick: clickMetrics.goldPerClick,
                  clickCritChance: clickMetrics.clickCritChance,
                  autoGoldPerSec: clickMetrics.autoGoldPerSec,
                }}
                onClickerStrike={handlePhaserStrike}
              />
            </div>

            <div className="dojo-hint-bar">{lastFeedback}</div>
          </div>
        </SectionCard>
      </div>

      {/* RIGHT COLUMN: All 12 Purchasable Dojo Upgrades */}
      <div className="dojo-right-col">
        <SectionCard
          title="Améliorations du Dojo"
          right={<span className="mb-tag">{UPGRADES_CATALOG.length} disponibles</span>}
        >
          <div className="dojo-upgrade-filters">
            {(
              [
                { id: 'all', label: 'Toutes' },
                { id: 'click', label: 'Clic' },
                { id: 'auto', label: 'Auto' },
                { id: 'dojo', label: 'Dojo' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`cell-mini-pill ${filter === tab.id ? 'cell-mini-pill--active' : ''}`}
                onClick={() => {
                  soundEngine.play('click');
                  setFilter(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dojo-upgrades-list">
            {visibleUpgrades.map((upg) => {
              const currentLvl = fighter.upgrades[upg.id] ?? 0;
              const isMax = currentLvl >= upg.maxLevel;
              const cost = getUpgradeCost(upg, currentLvl);
              const canAfford = effectiveGold >= cost;

              return (
                <MbRow
                  key={upg.id}
                  icon={<GameIcon name={resolveUpgradeIconName(upg.id)} size={30} />}
                  title={upg.name}
                  level={`Niv.${currentLvl}/${upg.maxLevel}`}
                  desc={upg.effectLabel}
                  right={
                    isMax ? (
                      <span className="mb-tag mb-tag--olive">MAX ✓</span>
                    ) : (
                      <PriceButton
                        cost={cost}
                        disabled={!canAfford || buyingId === upg.id}
                        onClick={() => void handleBuy(upg.id)}
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
    </div>
  );
};
