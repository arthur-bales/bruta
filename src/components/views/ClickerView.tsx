import React, { useMemo, useRef, useState } from 'react';
import { Hand, Flame, Zap, ArrowUpCircle, Hammer } from 'lucide-react';
import { UPGRADES_CATALOG, getUpgradeCost } from '@shared/upgradesCatalog';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

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
  const [lastFeedback, setLastFeedback] = useState<string>('Tape sur le mannequin ou clique le gros bouton !');
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
      setLastFeedback(`🔥 MODE FIÈVRE x2 ! Combo x${payload.combo} !`);
    } else if (payload.isCrit) {
      setLastFeedback(`💥 SUPER CRITIQUE ! Combo x${payload.combo} !`);
    } else {
      setLastFeedback(`👊 Frappe ! +${clickMetrics.goldPerClick} Or (Combo x${payload.combo})`);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Hand size={26} color="var(--accent-flame)" />
            Dojo d’Entraînement Clicker
          </h1>
          <p className="view-subtitle">
            Frappe le mannequin pour gagner de l’or et de l’XP en continu — enchaîne les coups pour activer la Fièvre !
          </p>
        </div>
        <span className="badge" style={{ background: '#fff3d6', fontSize: '0.86rem', padding: '6px 12px' }}>
          Total frappes : {(fighter.progress.totalClicks + optimisticClicks).toLocaleString('fr-FR')}
        </span>
      </div>

      {/* Metrics Strip */}
      <div className="clicker-stats-bar">
        <div className="mini-stat-box">
          <span>Or / Clic</span>
          <strong>🪙 +{clickMetrics.goldPerClick}</strong>
        </div>
        <div className="mini-stat-box">
          <span>XP / Clic</span>
          <strong>⭐ +{clickMetrics.xpPerClick}</strong>
        </div>
        <div className="mini-stat-box">
          <span>Auto Or / sec</span>
          <strong>⚙️ {clickMetrics.autoGoldPerSec}/s</strong>
        </div>
        <div className="mini-stat-box">
          <span>Critique Clic</span>
          <strong>💥 {Math.round(clickMetrics.clickCritChance * 100)}%</strong>
        </div>
      </div>

      {/* Combo + Fever Meter */}
      <div
        className="comic-card card-pad"
        style={{
          background: isFever
            ? 'linear-gradient(135deg, #fff1cc 0%, #ffd6e0 100%)'
            : 'var(--bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color={isFever ? '#dc2626' : '#f59e0b'} />
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.02rem' }}>
              {isFever ? '🔥 MODE FIÈVRE ACTIF (Or & XP x2) !' : 'Jauge de Fièvre'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge" style={{ background: combo >= 10 ? '#ffd152' : '#f0efe9' }}>
              <Zap size={13} />
              Combo x{combo}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
              {lastFeedback}
            </span>
          </div>
        </div>

        <div className="meter" style={{ height: 18 }}>
          <div
            className="meter__fill meter__fill--fever"
            style={{ width: `${isFever ? 100 : feverProgress}%` }}
          />
        </div>
      </div>

      {/* Interactive Phaser Clicker Stage */}
      <div className="stage-frame stage-frame--clicker">
        <PhaserCanvas
          mode="clicker"
          arena="dojo"
          fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
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

      {/* Big Tactile Thumb Button for Mobile & Rapid Tapping */}
      <button
        type="button"
        className={`btn btn--lg ${isFever ? 'btn--danger' : 'btn--primary'}`}
        onClick={handleBackupTap}
        style={{
          width: '100%',
          minHeight: 62,
          fontSize: '1.28rem',
          letterSpacing: '0.03em',
        }}
      >
        <Hand size={24} />
        {isFever ? 'FRAPPER EN FIÈVRE ! (x2)' : `FRAPPER LE MANNEQUIN ! (+${clickMetrics.goldPerClick} Or)`}
      </button>

      {/* Quick-Buy Upgrades */}
      <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpCircle size={20} color="var(--accent-jade)" />
            Améliorations Rapides (Clic & Auto)
          </h2>
          <button
            type="button"
            className="btn btn--sm btn--sky"
            onClick={() => {
              soundEngine.play('click');
              setActiveView('upgrades');
            }}
          >
            <Hammer size={15} />
            Toutes les améliorations
          </button>
        </div>

        <div className="grid-cards">
          {quickUpgrades.map((upg) => {
            const currentLvl = fighter.upgrades[upg.id] ?? 0;
            const isMax = currentLvl >= upg.maxLevel;
            const cost = getUpgradeCost(upg, currentLvl);
            const canAfford = effectiveGold >= cost;

            return (
              <div key={upg.id} className="item-card">
                <div className="item-card__header">
                  <div>
                    <div className="item-card__name">
                      {upg.icon} {upg.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                      {upg.effectLabel}
                    </div>
                  </div>
                  <span className="badge" style={{ background: '#e0f2fe' }}>
                    Niv.{currentLvl}/{upg.maxLevel}
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn btn--sm ${canAfford && !isMax ? 'btn--gold' : ''}`}
                  disabled={isMax || !canAfford || buyingId === upg.id}
                  onClick={() => void handleQuickBuy(upg.id)}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  {isMax
                    ? 'NIVEAU MAX'
                    : buyingId === upg.id
                      ? 'Achat…'
                      : `Améliorer • 🪙 ${cost.toLocaleString('fr-FR')}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
