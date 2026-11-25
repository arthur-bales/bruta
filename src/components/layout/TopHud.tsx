import React from 'react';
import { Coins, Gem, Zap, UserCheck, UserPlus } from 'lucide-react';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString('fr-FR');
}

export const TopHud: React.FC = () => {
  const { fighter, user, effectiveGold, setActiveView, setShowAuthModal } = useGame();

  if (!fighter) return null;

  const xpPercent = Math.min(100, Math.max(0, Math.round((fighter.xp / Math.max(1, fighter.xpToNext)) * 100)));

  return (
    <header className="top-hud">
      <div
        className="hud-identity"
        role="button"
        tabIndex={0}
        onClick={() => {
          soundEngine.play('click');
          setActiveView('profile');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveView('profile');
          }
        }}
        title="Ouvrir le profil de ton combattant"
      >
        <div className="hud-level-pill" aria-label={`Niveau ${fighter.level}`}>
          <span>NIV</span>
          <strong>{fighter.level}</strong>
        </div>

        <div className="hud-name-block">
          <div className="hud-name-row">
            <span className="hud-name">{fighter.name}</span>
            {fighter.statPoints > 0 && (
              <span
                className="badge"
                style={{
                  background: '#ffd152',
                  color: 'var(--ink-strong)',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                }}
              >
                +{fighter.statPoints} pts
              </span>
            )}
          </div>
          <div
            className="meter hud-xp-bar"
            title={`XP : ${fighter.xp} / ${fighter.xpToNext} (${xpPercent}%)`}
          >
            <div className="meter__fill meter__fill--xp" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="hud-resources">
        <div className="resource-chip resource-chip--gold" title="Pièces d’Or">
          <Coins size={15} color="#d97706" />
          <span>{formatCompact(effectiveGold)}</span>
        </div>

        <div className="resource-chip resource-chip--gem" title="Gemmes">
          <Gem size={15} color="#0284c7" />
          <span>{formatCompact(fighter.gems)}</span>
        </div>

        <div
          className="resource-chip resource-chip--energy resource-chip__hide-xs"
          title="Énergie d’Arène (se régénère automatiquement)"
        >
          <Zap size={15} color="#ea580c" />
          <span>
            {fighter.energy}/{fighter.maxEnergy}
          </span>
        </div>

        <button
          type="button"
          className="btn btn--sm"
          style={{
            minHeight: 36,
            padding: '5px 10px',
            background: user?.isGuest ? '#fff5cc' : '#e8fbf0',
          }}
          onClick={() => {
            soundEngine.play('click');
            setShowAuthModal(true);
          }}
          title={user?.isGuest ? 'Sauvegarder mon compte invité' : `Connecté : ${user?.username}`}
        >
          {user?.isGuest ? <UserPlus size={15} /> : <UserCheck size={15} color="#16a34a" />}
          <span className="resource-chip__hide-xs">
            {user?.isGuest ? 'Compte' : user?.username}
          </span>
        </button>
      </div>
    </header>
  );
};
