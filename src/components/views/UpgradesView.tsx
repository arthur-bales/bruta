import React, { useMemo, useState } from 'react';
import { Hammer, ArrowUpCircle } from 'lucide-react';
import type { UpgradeCategory } from '@shared/types';
import { UPGRADES_CATALOG, getUpgradeCost } from '@shared/upgradesCatalog';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Hammer size={26} color="var(--accent-flame)" />
            Améliorations du Dojo & Revenus Idle
          </h1>
          <p className="view-subtitle">
            Investis ton or pour booster chaque clic, générer des revenus passifs hors-ligne et multiplier ta puissance !
          </p>
        </div>
      </div>

      {/* Live Multiplier Summary */}
      <div className="clicker-stats-bar">
        <div className="mini-stat-box">
          <span>Gain par Clic</span>
          <strong>
            🪙 +{clickMetrics.goldPerClick} • ⭐ +{clickMetrics.xpPerClick}
          </strong>
        </div>
        <div className="mini-stat-box">
          <span>Revenu Passif / sec</span>
          <strong>
            ⚙️ {clickMetrics.autoGoldPerSec} Or/s
          </strong>
        </div>
        <div className="mini-stat-box">
          <span>XP Passif / sec</span>
          <strong>
            📘 {clickMetrics.autoXpPerSec} XP/s
          </strong>
        </div>
        <div className="mini-stat-box">
          <span>Bonus Or / XP</span>
          <strong>
            x{clickMetrics.goldMultiplier} / x{clickMetrics.xpMultiplier}
          </strong>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="tabs-bar">
        {(['all', 'click', 'auto', 'dojo'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`tab-btn ${category === cat ? 'tab-btn--active' : ''}`}
            onClick={() => {
              soundEngine.play('click');
              setCategory(cat);
            }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Upgrades Grid */}
      <div className="grid-cards">
        {visibleUpgrades.map((upg) => {
          const currentLvl = fighter.upgrades[upg.id] ?? 0;
          const isMax = currentLvl >= upg.maxLevel;
          const cost = getUpgradeCost(upg, currentLvl);
          const canAfford = effectiveGold >= cost;
          const totalBonus = currentLvl * upg.effectPerLevel;
          const pct = Math.round((currentLvl / upg.maxLevel) * 100);

          return (
            <div key={upg.id} className="item-card">
              <div className="item-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--bg-parchment)',
                      border: '2px solid var(--ink-strong)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.45rem',
                      flexShrink: 0,
                    }}
                  >
                    {upg.icon}
                  </div>
                  <div>
                    <div className="item-card__name">{upg.name}</div>
                    <span className="badge" style={{ background: '#e0f2fe', fontSize: '0.7rem', marginTop: 2 }}>
                      Niv.{currentLvl} / {upg.maxLevel}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-body)' }}>
                {upg.description}
              </p>

              <div className="item-card__stats">
                <span className="stat-tag stat-tag--effect">Prochain : {upg.effectLabel}</span>
                {currentLvl > 0 && (
                  <span className="stat-tag">
                    Actuel : +{totalBonus}
                    {upg.effectLabel.includes('%') ? '%' : ''}
                  </span>
                )}
              </div>

              <div className="meter" style={{ height: 10 }}>
                <div className="meter__fill meter__fill--xp" style={{ width: `${pct}%` }} />
              </div>

              <button
                type="button"
                className={`btn ${!isMax && canAfford ? 'btn--gold' : ''}`}
                disabled={isMax || !canAfford || buyingId === upg.id}
                onClick={() => void handleBuy(upg.id)}
                style={{ marginTop: 'auto', width: '100%' }}
              >
                <ArrowUpCircle size={17} />
                {isMax
                  ? 'NIVEAU MAXIMUM ✓'
                  : buyingId === upg.id
                    ? 'Amélioration…'
                    : `Améliorer • 🪙 ${cost.toLocaleString('fr-FR')} Or`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
