import React, { useState } from 'react';
import {
  Swords,
  Hand,
  Gift,
  Sparkles,
  Trophy,
  Flame,
  Shield,
  Zap,
  Coins,
  Crown,
  X,
  Palette,
  ShoppingBag,
} from 'lucide-react';
import type { AnimationName, ArenaTheme } from '@shared/types';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const ARENA_OPTIONS: { id: ArenaTheme; label: string; emoji: string }[] = [
  { id: 'coliseum', label: 'Colisée', emoji: '🏛️' },
  { id: 'dojo', label: 'Dojo', emoji: '⛩️' },
  { id: 'volcano', label: 'Volcan', emoji: '🌋' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return `${seconds}s`;
}

export const HomeView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    clickMetrics,
    homeArena,
    setHomeArena,
    setActiveView,
    offlineEarnings,
    dismissOfflineEarnings,
    canClaimDaily,
    claimableMissionsCount,
    claimDailyReward,
    setShowCreationModal,
    addToast,
  } = useGame();

  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);

  if (!fighter || !derivedStats || !clickMetrics) return null;

  const triggerPose = (anim: AnimationName) => {
    soundEngine.play(anim === 'special' ? 'special' : anim === 'attack' ? 'hit' : 'click');
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Offline Earnings Welcome Banner */}
      {offlineEarnings && (
        <div
          className="comic-card card-pad animate-pop"
          style={{
            background: 'linear-gradient(135deg, #fff6d1 0%, #ffe6a3 100%)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--accent-gold)',
                border: '2.5px solid var(--ink-strong)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Coins size={24} color="var(--ink-strong)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.08rem' }}>
                Tes apprentis ont travaillé pendant {formatDuration(offlineEarnings.secondsAway)} !
              </h3>
              <p style={{ margin: '2px 0 0', fontWeight: 800, color: '#7c4b00', fontSize: '0.9rem' }}>
                Gains hors-ligne déjà crédités : +{offlineEarnings.goldEarned.toLocaleString('fr-FR')} Or
                {offlineEarnings.xpEarned > 0
                  ? ` & +${offlineEarnings.xpEarned.toLocaleString('fr-FR')} XP`
                  : ''}
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
            <X size={16} />
            Super !
          </button>
        </div>
      )}

      {/* Main Hero Grid */}
      <div className="grid-2" style={{ alignItems: 'stretch' }}>
        {/* Left: Live Phaser Hero Showcase */}
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.45rem' }}>{fighter.name}</h1>
                <span className="badge" style={{ background: '#ffe4b5' }}>
                  <Crown size={13} color="#d97706" />
                  {fighter.title}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
                « {fighter.appearance.warCry} »
              </p>
            </div>

            <div style={{ display: 'flex', gap: 5 }}>
              {ARENA_OPTIONS.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  className={`tab-btn ${homeArena === ar.id ? 'tab-btn--active' : ''}`}
                  style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={() => {
                    soundEngine.play('click');
                    setHomeArena(ar.id);
                  }}
                >
                  {ar.emoji} {ar.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stage-frame stage-frame--hero">
            <PhaserCanvas
              mode="showcase"
              arena={homeArena}
              fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
              previewAnim={previewAnim}
            />
          </div>

          {/* Interactive pose triggers + quick style button */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => triggerPose('attack')}
              >
                ⚔️ Frapper
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => triggerPose('special')}
              >
                ✨ Spécial
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => triggerPose('victory')}
              >
                🏆 Célébrer
              </button>
            </div>

            <button
              type="button"
              className="btn btn--sm btn--sky"
              onClick={() => {
                soundEngine.play('click');
                setShowCreationModal(true);
              }}
            >
              <Palette size={15} />
              Apparence
            </button>
          </div>
        </div>

        {/* Right: Power Summary + Combat Readiness */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            className="comic-card card-pad"
            style={{
              background: 'linear-gradient(135deg, #fffdf5 0%, #fff1cc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Puissance de Combat
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--accent-flame)',
                  lineHeight: 1.1,
                }}
              >
                {derivedStats.powerScore.toLocaleString('fr-FR')}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="badge" style={{ background: '#e0f2fe', marginBottom: 4 }}>
                <Trophy size={13} color="#0284c7" />
                Elo {fighter.rating}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                {fighter.progress.arenaWins}V - {fighter.progress.arenaLosses}D • Série {fighter.progress.winStreak}🔥
              </div>
            </div>
          </div>

          <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.08rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Shield size={18} color="var(--accent-sky)" />
                Résumé du Combattant
              </h3>
              {fighter.statPoints > 0 && (
                <button
                  type="button"
                  className="btn btn--sm btn--gold"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView('profile');
                  }}
                >
                  +{fighter.statPoints} pts à placer !
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              <div className="mini-stat-box">
                <span>PV Max</span>
                <strong>❤️ {derivedStats.maxHp}</strong>
              </div>
              <div className="mini-stat-box">
                <span>Dégâts</span>
                <strong>
                  ⚔️ {derivedStats.minDamage}–{derivedStats.maxDamage}
                </strong>
              </div>
              <div className="mini-stat-box">
                <span>Défense</span>
                <strong>🛡️ {derivedStats.defense}</strong>
              </div>
              <div className="mini-stat-box">
                <span>Critique / Esquive</span>
                <strong>
                  💥 {Math.round(derivedStats.critChance * 100)}% / 💨 {Math.round(derivedStats.dodgeChance * 100)}%
                </strong>
              </div>
              <div className="mini-stat-box">
                <span>Gain par clic</span>
                <strong>🪙 +{clickMetrics.goldPerClick} Or</strong>
              </div>
              <div className="mini-stat-box">
                <span>Revenu Auto</span>
                <strong>⚙️ {clickMetrics.autoGoldPerSec} Or/s</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('arena');
                }}
              >
                <Swords size={20} />
                Combattre !
              </button>
              <button
                type="button"
                className="btn btn--gold btn--lg"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('clicker');
                }}
              >
                <Hand size={20} />
                Dojo Clicker
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid-cards">
        <div
          className="comic-card card-pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fff7e6' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={19} color="#d97706" />
              Récompense Quotidienne
            </h3>
            {canClaimDaily && (
              <span className="badge" style={{ background: '#ffd152' }}>
                Disponible !
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
            {canClaimDaily
              ? `Jour ${(fighter.dailyStreak % 7) + 1} prêt à être récupéré ! Or, Gemmes et coffres bonus.`
              : `Série actuelle : ${fighter.dailyStreak} jour(s). Reviens demain pour la suite !`}
          </p>
          <button
            type="button"
            className={`btn ${canClaimDaily ? 'btn--gold' : ''}`}
            disabled={claimingDaily}
            onClick={() => void handleQuickDailyClaim()}
            style={{ marginTop: 'auto' }}
          >
            <Gift size={17} />
            {claimingDaily
              ? 'Réclamation…'
              : canClaimDaily
                ? 'Réclamer maintenant !'
                : 'Voir le calendrier'}
          </button>
        </div>

        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={19} color="var(--accent-flame)" />
              Missions & Succès
            </h3>
            {claimableMissionsCount > 0 && (
              <span className="badge" style={{ background: '#dcfce7' }}>
                {claimableMissionsCount} prête(s)
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
            Accomplis des quêtes du dojo pour gagner des gemmes, de l’or et de l’expérience bonus.
          </p>
          <button
            type="button"
            className={`btn ${claimableMissionsCount > 0 ? 'btn--jade' : ''}`}
            onClick={() => {
              soundEngine.play('click');
              setActiveView('missions');
            }}
            style={{ marginTop: 'auto' }}
          >
            <Sparkles size={17} />
            Ouvrir les Missions
          </button>
        </div>

        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={19} color="var(--accent-sky)" />
              Boutique & Coffres
            </h3>
            <span className="badge" style={{ background: '#e6f6ff' }}>
              <Zap size={12} color="#ea580c" />
              {fighter.energy}/{fighter.maxEnergy}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
            Ouvre des coffres mystères ou achète des équipements rares qui apparaissent sur ta brute !
          </p>
          <button
            type="button"
            className="btn btn--sky"
            onClick={() => {
              soundEngine.play('click');
              setActiveView('shop');
            }}
            style={{ marginTop: 'auto' }}
          >
            <ShoppingBag size={17} />
            Visiter la Boutique
          </button>
        </div>
      </div>
    </div>
  );
};
