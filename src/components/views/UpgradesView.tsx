import React, { useMemo, useState } from 'react';
import type { UpgradeCategory } from '@shared/types';
import { UPGRADES_CATALOG, getUpgradeCost } from '@shared/upgradesCatalog';
import { MbRow, PriceButton, SectionCard } from '@/components/ui/BruteUI';
import { soundEngine } from '@/engine/audio/soundEffects';
import { useGame } from '@/state/GameContext';

const CATEGORY_LABELS: Record<'all' | UpgradeCategory, string> = {
  all: 'Toutes (12)',
  click: '👊 Clicker',
  auto: '⚙️ Auto / Idle',
  dojo: '⛩️ Dojo Global',
};

export const UpgradesView: React.FC = () => {
  const { fighter, clickMetrics, effectiveGold, buyUpgrade, addToast } = useGame();
  const [category, setCategory] = useState<'all' | UpgradeCategory>('all');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const visibleUpgrades = useMemo(() => {
    return UPGRADES_CATALOG.filter((u) => (category === 'all' ? true : u.category === category));
  }, [category]);

  if (!fighter || !clickMetrics) return null;

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

  return (
    <div className="mb-stack">
      {/* Live Multiplier Summary */}
      <div className="dojo-metrics">
        <div className="dojo-metric-tile">
          <span>Gain par Clic</span>
          <strong>
            🪙 +{clickMetrics.goldPerClick} • ⭐ +{clickMetrics.xpPerClick}
          </strong>
        </div>
        <div className="dojo-metric-tile">
          <span>Revenu Passif</span>
          <strong>⚙️ {clickMetrics.autoGoldPerSec} Or/s</strong>
        </div>
        <div className="dojo-metric-tile">
          <span>XP Passif</span>
          <strong>📘 {clickMetrics.autoXpPerSec} XP/s</strong>
        </div>
        <div className="dojo-metric-tile">
          <span>Bonus Or / XP</span>
          <strong>
            x{clickMetrics.goldMultiplier} / x{clickMetrics.xpMultiplier}
          </strong>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="upg-filter-bar">
        {(['all', 'click', 'auto', 'dojo'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`mb-subnav__btn ${category === cat ? 'mb-subnav__btn--active' : ''}`}
            onClick={() => {
              soundEngine.play('click');
              setCategory(cat);
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Upgrades List in SectionCard (MbRow + PriceButton matching IMG_4207) */}
      <SectionCard
        title="Améliorations du Dojo"
        right={
          <span className="mb-tag">
            {visibleUpgrades.length} amélioration{visibleUpgrades.length > 1 ? 's' : ''}
          </span>
        }
      >
        <div className="mb-stack mb-stack--sm">
          {visibleUpgrades.map((upg) => {
            const currentLvl = fighter.upgrades[upg.id] ?? 0;
            const isMax = currentLvl >= upg.maxLevel;
            const cost = getUpgradeCost(upg, currentLvl);
            const canAfford = effectiveGold >= cost;
            const totalBonus = currentLvl * upg.effectPerLevel;

            return (
              <MbRow
                key={upg.id}
                icon={<span>{upg.icon}</span>}
                title={upg.name}
                level={`Niv.${currentLvl}/${upg.maxLevel}`}
                desc={
                  <>
                    <div>{upg.description}</div>
                    <div className="upg-row-meta">
                      <span className="upg-row-chip upg-row-chip--effect">{upg.effectLabel}</span>
                      {currentLvl > 0 && (
                        <span className="upg-row-chip">
                          Actuel : +{totalBonus}
                          {upg.effectLabel.includes('%') ? '%' : ''}
                        </span>
                      )}
                    </div>
                  </>
                }
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
  );
};
