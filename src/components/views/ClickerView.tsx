import React, { useMemo, useRef, useState } from 'react';
import { Coins, Flame, Hand, Settings, Star, Zap } from 'lucide-react';
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

export const ClickerView: React.FC = () => {
  const {
    fighter,
    clickMetrics,
    effectiveGold,
    optimisticClicks,
    registerClickStrike,
    buyUpgrade,
    setActiveView,
    addToast,
  } = useGame();

  const [combo, setCombo] = useState(0);
  const [feverProgress, setFeverProgress] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [strikeNonce, setStrikeNonce] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string>(
    'Frappe le mannequin pour gagner de l’or et activer la Fièvre !',
  );
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const comboTimerRef = useRef<number | null>(null);

  const quickUpgrades = useMemo(() => {
    const clickUps = UPGRADES_CATALOG.filter((u) => u.category === 'click').slice(0, 3);
    const autoUps = UPGRADES_CATALOG.filter((u) => u.category === 'auto').slice(0, 3);
    return [...clickUps, ...autoUps];
  }, []);

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

  const handleBackupTap = () => {
    setStrikeNonce((n) => n + 1);
  };

  const handleQuickBuy = async (upgradeId: string) => {
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
    <div className="mb-stack">
      {/* Compact Dojo Metrics Strip */}
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

      {/* Main Dojo Clicker Stage Card */}
      <SectionCard
        title="Dojo d’Entraînement"
        right={
          <span className="mb-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <GameIcon name="fist" size={15} />
            {formatCompact(totalStrikes)} frappes
          </span>
        }
      >
        <div className="mb-stack">
          {/* Warm Parchment Fever Meter */}
          <div className={`dojo-fever-bar ${isFever ? 'dojo-fever-bar--active' : ''}`}>
            <div className="dojo-fever-bar__top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={18} color={isFever ? '#d0412a' : '#e2700c'} />
                <span className="mb-caption">
                  {isFever ? 'MODE FIÈVRE ACTIF (Or & XP x2) !' : 'Jauge de Fièvre'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className={`mb-tag ${combo >= 10 ? 'mb-tag--orange' : ''}`}>
                  <Zap size={12} style={{ marginRight: 3 }} />
                  Combo x{combo}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                  {lastFeedback}
                </span>
              </div>
            </div>

            <div className="meter" style={{ height: 20 }}>
              <div
                className="meter__fill meter__fill--fever"
                style={{ width: `${isFever ? 100 : feverProgress}%` }}
              />
              <span className="meter__label">
                {isFever ? 'FIÈVRE x2 !' : `${feverProgress}%`}
              </span>
            </div>
          </div>

          {/* Dark-Brown Interactive Phaser Clicker Stage */}
          <div className="dojo-stage-frame">
            <PhaserCanvas
              mode="clicker"
              arena="dojo"
              fighter={{ appearance: fighter.appearance, equipped: fighter.equipped, equippedSkinId: fighter.equippedSkinId }}
              clickerMetrics={{
                clickDamage: clickMetrics.clickDamage,
                goldPerClick: clickMetrics.goldPerClick,
                clickCritChance: clickMetrics.clickCritChance,
                autoGoldPerSec: clickMetrics.autoGoldPerSec,
              }}
              clickerStrikeNonce={strikeNonce}
              onClickerStrike={handlePhaserStrike}
            />
          </div>

          {/* Giant Orange Tactile CTA Button */}
          <button
            type="button"
            className={`btn btn--mega ${isFever ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleBackupTap}
          >
            <Hand size={24} />
            {isFever
              ? 'FRAPPER EN FIÈVRE ! (x2)'
              : `FRAPPER LE MANNEQUIN ! (+${clickMetrics.goldPerClick} Or)`}
          </button>
        </div>
      </SectionCard>

      {/* Quick Dojo Upgrades List (MbRow + PriceButton) */}
      <SectionCard
        title="Améliorations Rapides"
        right={
          <button
            type="button"
            className="cell-mini-pill"
            onClick={() => {
              soundEngine.play('click');
              setActiveView('upgrades');
            }}
          >
            Toutes (12) →
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
                level={`Niv.${currentLvl}/${upg.maxLevel}`}
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
  );
};
