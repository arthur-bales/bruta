import React, { useRef, useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Database,
  FastForward,
  AlertTriangle,
} from 'lucide-react';
import type { FighterProfile } from '@shared/types';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Settings size={26} color="var(--accent-flame)" />
            Paramètres & Sauvegardes
          </h1>
          <p className="view-subtitle">
            Règle l’audio, la vitesse d’arène, ton compte cloud et tes exports de sauvegarde JSON.
          </p>
        </div>
      </div>

      <div className="grid-2-equal">
        {/* Audio & Gameplay Preferences */}
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={20} color="var(--accent-sky)" />
            Audio & Préférences de Jeu
          </h2>

          <div className="stat-row">
            <div className="stat-row__meta">
              <span className="stat-row__name">Effets sonores arcade</span>
              <span className="stat-row__desc">Frappes, critiques, pièces et fanfares</span>
            </div>
            <button
              type="button"
              className={`btn btn--sm ${fighter.settings.soundEnabled ? 'btn--jade' : ''}`}
              onClick={() => void handleToggleSound()}
            >
              {fighter.settings.soundEnabled ? (
                <>
                  <Volume2 size={15} />
                  Activé
                </>
              ) : (
                <>
                  <VolumeX size={15} />
                  Coupé
                </>
              )}
            </button>
          </div>

          <div
            style={{
              padding: '10px 12px',
              border: '2px solid var(--ink-strong)',
              borderRadius: 12,
              background: 'var(--bg-parchment)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="volume-slider" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                Volume : {Math.round(fighter.settings.soundVolume * 100)}%
              </label>
              <button
                type="button"
                className="btn btn--sm btn--gold"
                disabled={!fighter.settings.soundEnabled}
                onClick={() => soundEngine.play('victory')}
              >
                Tester le son
              </button>
            </div>
            <input
              id="volume-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(fighter.settings.soundVolume * 100)}
              onChange={(e) => void handleVolumeChange(Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--accent-flame)' }}
            />
          </div>

          <div className="stat-row">
            <div className="stat-row__meta">
              <span className="stat-row__name">
                <FastForward size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Vitesse de combat par défaut
              </span>
              <span className="stat-row__desc">Modifiable aussi pendant le combat</span>
            </div>
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
          </div>

          <div className="stat-row">
            <div className="stat-row__meta">
              <span className="stat-row__name">Mouvements réduits</span>
              <span className="stat-row__desc">Allège les secousses visuelles</span>
            </div>
            <button
              type="button"
              className={`btn btn--sm ${fighter.settings.reducedMotion ? 'btn--sky' : ''}`}
              onClick={() => void handleReducedMotion()}
            >
              {fighter.settings.reducedMotion ? 'Activé' : 'Désactivé'}
            </button>
          </div>
        </div>

        {/* Account & Database Card */}
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="var(--accent-jade)" />
            Compte & Base de Données
          </h2>

          <div className="stat-row">
            <div className="stat-row__meta">
              <span className="stat-row__name">Statut du compte</span>
              <span className="stat-row__desc">
                {user?.isGuest ? 'Session Invitée temporaire' : `Compte enregistré : ${user?.username}`}
              </span>
            </div>
            <span
              className="badge"
              style={{ background: user?.isGuest ? '#fff3d6' : '#dcfce7' }}
            >
              {user?.isGuest ? 'Invité' : 'Vérifié ✓'}
            </span>
          </div>

          <div className="stat-row">
            <div className="stat-row__meta">
              <span className="stat-row__name">Mode de persistance serveur</span>
              <span className="stat-row__desc">Stockage actif pour les sauvegardes</span>
            </div>
            <span
              className="badge"
              style={{ background: storageMode === 'postgres' ? '#dcfce7' : '#e0f2fe' }}
            >
              <Database size={12} />
              {storageMode === 'postgres' ? 'Neon PostgreSQL' : 'Local JSON'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn--sky"
            onClick={() => {
              soundEngine.play('click');
              setShowAuthModal(true);
            }}
          >
            <ShieldCheck size={18} />
            {user?.isGuest ? 'Sécuriser mon compte / Connexion' : 'Gérer mon compte'}
          </button>
        </div>
      </div>

      {/* Export & Import Save */}
      <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: '1.15rem' }}>Exporter / Importer une Sauvegarde JSON</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="btn btn--gold" onClick={handleExportJson}>
            <Download size={18} />
            Télécharger ma sauvegarde (.json)
          </button>

          <button
            type="button"
            className="btn btn--sky"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            Importer un fichier .json
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void handleFileImport(e)}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="import-json-area" style={{ fontWeight: 800, fontSize: '0.84rem' }}>
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
      </div>

      {/* Danger Zone: Reset Fighter */}
      <div
        className="comic-card card-pad"
        style={{
          background: '#fff1f2',
          borderColor: '#dc2626',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h2 style={{ fontSize: '1.12rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} color="#dc2626" />
          Zone de Réinitialisation
        </h2>
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
    </div>
  );
};
