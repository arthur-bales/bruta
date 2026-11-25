import React from 'react';
import { UserCheck, UserPlus, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { CoinPill, formatCompact } from '@/components/ui/BruteUI';

/**
 * Status plaque shown under the banner (PC) / at the top of the screen (mobile):
 *   [ NOM  NIV. 7 ]                         [Or 1 250] [Son] [Compte]
 *   EXP. [==========-----------  120 / 300 ]
 */
export const TopHud: React.FC = () => {
  const { fighter, user, effectiveGold, setActiveView, setShowAuthModal, updateSettings } = useGame();

  if (!fighter) return null;

  const xpPercent = Math.min(
    100,
    Math.max(0, Math.round((fighter.xp / Math.max(1, fighter.xpToNext)) * 100)),
  );
  const soundOn = fighter.settings.soundEnabled;

  return (
    <header className="top-hud">
      <div className="top-hud__row">
        <button
          type="button"
          className="name-plaque"
          onClick={() => {
            soundEngine.play('click');
            setActiveView('profile');
          }}
          title="Ouvrir le profil de ton combattant"
        >
          <span className="name-plaque__name">{fighter.name}</span>
          <span className="mb-tag">NIV. {fighter.level}</span>
          {fighter.statPoints > 0 && (
            <span className="mb-tag mb-tag--orange name-plaque__pts">+{fighter.statPoints} pts</span>
          )}
        </button>

        <div className="hud-resources">
          <CoinPill value={formatCompact(effectiveGold)} title="Pièces d’or" />
          <button
            type="button"
            className="hud-square-btn"
            onClick={() => {
              void updateSettings({ soundEnabled: !soundOn });
            }}
            aria-label={soundOn ? 'Couper le son' : 'Activer le son'}
            title={soundOn ? 'Son : activé' : 'Son : coupé'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            className="hud-square-btn"
            onClick={() => {
              soundEngine.play('click');
              setShowAuthModal(true);
            }}
            title={user?.isGuest ? 'Sauvegarder mon compte invité' : `Connecté : ${user?.username}`}
            aria-label="Compte"
          >
            {user?.isGuest ? <UserPlus size={18} /> : <UserCheck size={18} color="#417220" />}
          </button>
        </div>
      </div>

      <div className="top-hud__xp">
        <span className="top-hud__xp-label">EXP.</span>
        <div className="meter top-hud__xp-bar" title={`XP : ${fighter.xp} / ${fighter.xpToNext}`}>
          <div className="meter__fill meter__fill--xp" style={{ width: `${xpPercent}%` }} />
          <span className="meter__label">
            {formatCompact(fighter.xp)} / {formatCompact(fighter.xpToNext)}
          </span>
        </div>
      </div>
    </header>
  );
};
