import React, { useState } from 'react';
import { Dices, Sparkles, Play, Swords } from 'lucide-react';
import type { AnimationName } from '@shared/types';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const RANDOM_NAMES = [
  'Kaito',
  'Mochi',
  'Bagarrox',
  'Sakura',
  'Tornado',
  'Bambou',
  'Riku',
  'ChibiRex',
  'Flammèche',
  'Yuki',
  'Poulpy',
  'Kenshin',
];

const RANDOM_WAR_CRIES = [
  'En garde !',
  'Pour la gloire du Dojo !',
  'Personne n’arrête ma poêle !',
  'Combo x100 en approche !',
  'Chibi mais costaud !',
  'Tu vas mordre la poussière !',
];

export const CharacterCreationModal: React.FC = () => {
  const { fighter, showCreationModal, setShowCreationModal, customizeFighter, addToast } = useGame();

  const [name, setName] = useState<string>(fighter?.name || 'Brute');
  const [warCry, setWarCry] = useState<string>(fighter?.appearance.warCry || 'En garde !');
  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (showCreationModal && fighter) {
      setName(fighter.name || 'Brute');
      setWarCry(fighter.appearance.warCry || 'En garde !');
    }
  }, [showCreationModal, fighter?.id, fighter?.name, fighter?.appearance.warCry]);

  if (!showCreationModal || !fighter) return null;

  const triggerPreview = (anim: AnimationName) => {
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const handleRandomize = () => {
    soundEngine.play('click');
    const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    setName(rand(RANDOM_NAMES) + Math.floor(10 + Math.random() * 89));
    setWarCry(rand(RANDOM_WAR_CRIES));
    triggerPreview('victory');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      addToast('Choisis un nom d’au moins 2 caractères !', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await customizeFighter({
        name: cleanName.slice(0, 20),
        appearance: {
          ...fighter.appearance,
          warCry: warCry.trim() || 'En garde !',
        },
      });
      setShowCreationModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Créer ton combattant">
      <div className="modal-box" style={{ maxWidth: 680 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={22} color="var(--accent-flame)" />
              Crée ta Légende !
            </h2>
            <p className="view-subtitle">
              Baptise ton combattant avant d’entrer dans le Colisée. Débloque de nouveaux skins en Boutique !
            </p>
          </div>
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={handleRandomize}
          >
            <Dices size={16} />
            Aléatoire
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid-2" style={{ alignItems: 'center' }}>
          {/* Left: Live Phaser Showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="stage-frame stage-frame--hero">
              <PhaserCanvas
                mode="showcase"
                arena="coliseum"
                fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
                previewAnim={previewAnim}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {(
                [
                  { anim: 'idle', label: 'Repos' },
                  { anim: 'attack', label: 'Attaque' },
                  { anim: 'special', label: 'Spécial !' },
                  { anim: 'victory', label: 'Victoire' },
                ] as { anim: AnimationName; label: string }[]
              ).map((btn) => (
                <button
                  key={btn.anim}
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    soundEngine.play('click');
                    triggerPreview(btn.anim);
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Fast Identity Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                htmlFor="creator-name"
                style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}
              >
                Nom du combattant
              </label>
              <input
                id="creator-name"
                type="text"
                className="comic-input"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: KaitoFlamme"
              />
            </div>

            <div>
              <label
                htmlFor="creator-warcry"
                style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}
              >
                Cri de guerre
              </label>
              <input
                id="creator-warcry"
                type="text"
                className="comic-input"
                maxLength={48}
                value={warCry}
                onChange={(e) => setWarCry(e.target.value)}
                placeholder="En garde !"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                className="btn btn--primary btn--lg"
                disabled={submitting}
                style={{ width: '100%' }}
              >
                <Swords size={20} />
                {submitting ? 'Préparation…' : "ENTRER DANS L'ARÈNE !"}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                style={{ width: '100%' }}
                onClick={() => {
                  soundEngine.play('click');
                  setShowCreationModal(false);
                }}
              >
                <Play size={15} />
                JOUER DIRECT
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
