import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  ShieldCheck,
  Database,
  AlertTriangle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { MbRow, SectionCard } from '@/components/ui/BruteUI';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const SettingsView: React.FC = () => {
  const {
    fighter,
    user,
    storageMode,
    updateSettings,
    resetFighter,
    setShowAuthModal,
    addToast,
  } = useGame();

  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!fighter) return null;

  const handleToggleSound = async () => {
    const next = !fighter.settings.soundEnabled;
    try {
      await updateSettings({ soundEnabled: next });
      if (next) soundEngine.play('click');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur audio.', 'error');
    }
  };

  const handleVolumeChange = async (val: number) => {
    try {
      await updateSettings({ soundVolume: val });
    } catch {
      // ignore transient slider error
    }
  };

  const handleReducedMotion = async () => {
    soundEngine.play('click');
    try {
      await updateSettings({ reducedMotion: !fighter.settings.reducedMotion });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur de sauvegarde.', 'error');
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await resetFighter();
      setConfirmReset(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de réinitialiser.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const volumePercent = Math.round(fighter.settings.soundVolume * 100);

  return (
    <div className="arsenal-view">
      <div className="settings-top-grid">
        {/* Audio & Gameplay Preferences */}
        <SectionCard title="Audio & Préférences">
          <div className="mb-stack mb-stack--sm">
            <MbRow
              icon={
                fighter.settings.soundEnabled ? (
                  <Volume2 size={22} color="var(--ink-strong)" />
                ) : (
                  <VolumeX size={22} color="var(--ink-muted)" />
                )
              }
              title="Effets sonores"
              desc="Frappes, critiques, pièces et fanfares"
              right={
                <button
                  type="button"
                  className={`btn btn--sm ${fighter.settings.soundEnabled ? 'btn--jade' : ''}`}
                  onClick={() => void handleToggleSound()}
                >
                  {fighter.settings.soundEnabled ? 'Activé' : 'Coupé'}
                </button>
              }
            />

            <MbRow
              icon={<Volume2 size={22} color="var(--accent-flame-dark)" />}
              title="Volume sonore"
              level={`${volumePercent}%`}
              desc={
                <div className="settings-volume-bar">
                  <input
                    id="volume-slider"
                    aria-label="Volume sonore"
                    type="range"
                    min={0}
                    max={100}
                    value={volumePercent}
                    onChange={(e) => void handleVolumeChange(Number(e.target.value) / 100)}
                    className="settings-slider"
                  />
                </div>
              }
              right={
                <button
                  type="button"
                  className="btn btn--sm btn--gold"
                  disabled={!fighter.settings.soundEnabled}
                  onClick={() => soundEngine.play('victory')}
                >
                  Tester
                </button>
              }
            />

            <MbRow
              icon={<Sparkles size={22} color="var(--ink-strong)" />}
              title="Mouvements réduits"
              desc="Allège les secousses et animations"
              right={
                <button
                  type="button"
                  className={`btn btn--sm ${fighter.settings.reducedMotion ? 'btn--sky' : ''}`}
                  onClick={() => void handleReducedMotion()}
                >
                  {fighter.settings.reducedMotion ? 'Activé' : 'Désactivé'}
                </button>
              }
            />
          </div>
        </SectionCard>

        {/* Account & Persistence */}
        <SectionCard title="Compte & Sauvegarde Cloud">
          <div className="mb-stack mb-stack--sm">
            <MbRow
              icon={<UserCheck size={22} color="var(--accent-jade-dark)" />}
              title="Statut du compte"
              desc={
                user?.isGuest
                  ? 'Session Invitée temporaire'
                  : `Compte enregistré : ${user?.username}`
              }
              right={
                <span className={`mb-tag ${user?.isGuest ? 'mb-tag--orange' : 'mb-tag--olive'}`}>
                  {user?.isGuest ? 'Invité' : 'Vérifié ✓'}
                </span>
              }
            />

            <MbRow
              icon={<Database size={22} color="var(--accent-sky-dark)" />}
              title="Persistance serveur"
              desc="Stockage actif de tes combattants"
              right={
                <span className="mb-tag">
                  {storageMode === 'postgres' ? 'PostgreSQL' : 'Local JSON'}
                </span>
              }
            />

            <button
              type="button"
              className="btn btn--sky"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => {
                soundEngine.play('click');
                setShowAuthModal(true);
              }}
            >
              <ShieldCheck size={18} />
              {user?.isGuest ? 'Sécuriser mon compte / Connexion' : 'Gérer mon compte'}
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Danger Zone: Reset Fighter */}
      <SectionCard
        title="Zone de Réinitialisation"
        className="settings-danger-card"
        right={<AlertTriangle size={20} color="#b83a28" />}
      >
        <div className="mb-stack mb-stack--sm">
          <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#7f1d1d' }}>
            Recommencer ton aventure au Niveau 1 avec un nouveau combattant. Cette action est irréversible !
          </p>

          {!confirmReset ? (
            <div>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => {
                  soundEngine.play('click');
                  setConfirmReset(true);
                }}
              >
                <RotateCcw size={15} />
                Réinitialiser mon combattant
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <strong style={{ color: '#991b1b', fontSize: '0.9rem' }}>
                Es-tu absolument sûr(e) ?
              </strong>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={resetting}
                onClick={() => void handleConfirmReset()}
              >
                {resetting ? 'Réinitialisation…' : 'Oui, tout recommencer'}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={resetting}
                onClick={() => setConfirmReset(false)}
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
