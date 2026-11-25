import React, { useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Database,
  FastForward,
  AlertTriangle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { FighterProfile } from '@shared/types';
import { MbRow, SectionCard } from '@/components/ui/BruteUI';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const SettingsView: React.FC = () => {
  const {
    fighter,
    user,
    storageMode,
    updateSettings,
    importSave,
    resetFighter,
    setShowAuthModal,
    addToast,
  } = useGame();

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleBattleSpeed = async (speed: 1 | 2) => {
    soundEngine.play('click');
    try {
      await updateSettings({ battleSpeed: speed });
      addToast(`Vitesse de combat par défaut réglée sur ${speed}x.`, 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur de sauvegarde.', 'error');
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

  const handleExportJson = () => {
    soundEngine.play('coin');
    const dataStr = JSON.stringify(fighter, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brute-legends-${fighter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast('Sauvegarde JSON téléchargée !', 'success');
  };

  const processImportRaw = async (rawJson: string) => {
    setImporting(true);
    try {
      const parsed = JSON.parse(rawJson) as Partial<FighterProfile>;
      if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.baseStats) {
        throw new Error('Format JSON invalide : ce fichier ne contient pas un profil Brute Legends.');
      }
      await importSave(parsed as FighterProfile);
      setImportText('');
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Fichier JSON illisible ou corrompu.',
        'error',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await processImportRaw(text);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              icon={<FastForward size={22} color="var(--ink-strong)" />}
              title="Vitesse de combat"
              desc="Modifiable aussi pendant un duel"
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn btn--sm ${fighter.settings.battleSpeed === 1 ? 'btn--primary' : ''}`}
                    onClick={() => void handleBattleSpeed(1)}
                  >
                    1x
                  </button>
                  <button
                    type="button"
                    className={`btn btn--sm ${fighter.settings.battleSpeed === 2 ? 'btn--primary' : ''}`}
                    onClick={() => void handleBattleSpeed(2)}
                  >
                    2x
                  </button>
                </div>
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

      {/* Export & Import Save */}
      <SectionCard
        title="Exporter / Importer (.json)"
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--sm btn--gold" onClick={handleExportJson}>
              <Download size={15} />
              Télécharger
            </button>
            <button
              type="button"
              className="btn btn--sm btn--sky"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              Importer fichier
            </button>
          </div>
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void handleFileImport(e)}
          style={{ display: 'none' }}
        />

        <div className="mb-stack mb-stack--sm">
          <label htmlFor="import-json-area" className="mb-caption" style={{ fontSize: '0.9rem' }}>
            Ou colle ton JSON de sauvegarde ci-dessous :
          </label>
          <textarea
            id="import-json-area"
            className="comic-input"
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"id": "...", "name": "MaBrute", ...}'
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
          />
          <div>
            <button
              type="button"
              className="btn btn--sm btn--jade"
              disabled={importing || importText.trim().length < 10}
              onClick={() => void processImportRaw(importText)}
            >
              <Upload size={15} />
              {importing ? 'Importation…' : 'Restaurer ce JSON'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Danger Zone: Reset Fighter */}
      <SectionCard
        title="Zone de Réinitialisation"
        className="settings-danger-card"
        right={<AlertTriangle size={20} color="#b83a28" />}
      >
        <div className="mb-stack mb-stack--sm">
          <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#7f1d1d' }}>
            Recommencer ton aventure au Niveau 1 avec un nouveau combattant. Pense à exporter ta sauvegarde JSON avant si tu veux la conserver !
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
