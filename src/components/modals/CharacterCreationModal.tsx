import React, { useState } from 'react';
import { Dices, Sparkles, Play, Check } from 'lucide-react';
import type { AnimationName, FighterAppearance } from '@shared/types';
import {
  EYE_STYLES,
  HAIR_PALETTE,
  HAIR_STYLES,
  OUTFIT_PALETTE,
  SKIN_PALETTE,
} from '@shared/constants';
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

const EYE_COLORS = ['#2563eb', '#dc2626', '#10b981', '#d97706', '#7c3aed', '#1e293b'];

export const CharacterCreationModal: React.FC = () => {
  const { fighter, showCreationModal, setShowCreationModal, customizeFighter, addToast } = useGame();

  const [name, setName] = useState<string>(fighter?.name || 'Brute');
  const [appearance, setAppearance] = useState<FighterAppearance>(
    fighter?.appearance ?? {
      skinColor: SKIN_PALETTE[1],
      hairStyle: 'spiky',
      hairColor: HAIR_PALETTE[0],
      eyeStyle: 'determined',
      eyeColor: EYE_COLORS[0],
      outfitPrimary: OUTFIT_PALETTE[0].primary,
      outfitSecondary: OUTFIT_PALETTE[0].secondary,
      warCry: 'En garde !',
    },
  );
  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (showCreationModal && fighter) {
      setName(fighter.name || 'Brute');
      setAppearance({ ...fighter.appearance });
    }
  }, [showCreationModal, fighter?.id, fighter?.name]);

  if (!showCreationModal || !fighter) return null;

  const triggerPreview = (anim: AnimationName) => {
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const handleRandomize = () => {
    soundEngine.play('click');
    const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const outfit = rand(OUTFIT_PALETTE);
    setName(rand(RANDOM_NAMES) + Math.floor(10 + Math.random() * 89));
    setAppearance({
      skinColor: rand(SKIN_PALETTE),
      hairStyle: rand(HAIR_STYLES).id,
      hairColor: rand(HAIR_PALETTE),
      eyeStyle: rand(EYE_STYLES).id,
      eyeColor: rand(EYE_COLORS),
      outfitPrimary: outfit.primary,
      outfitSecondary: outfit.secondary,
      warCry: rand(RANDOM_WAR_CRIES),
    });
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
          ...appearance,
          warCry: appearance.warCry.trim() || 'En garde !',
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
      <div className="modal-box" style={{ maxWidth: 860 }}>
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
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={22} color="var(--accent-flame)" />
              Crée ta Légende Chibi !
            </h2>
            <p className="view-subtitle">
              Personnalise ton héros avant d’entrer dans le Colisée. Tu pourras tout modifier plus tard !
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={handleRandomize}
            >
              <Dices size={16} />
              Aléatoire !
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                soundEngine.play('click');
                setShowCreationModal(false);
              }}
            >
              <Play size={15} />
              Jouer direct
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Live Phaser Chibi Stage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="stage-frame stage-frame--hero">
              <PhaserCanvas
                mode="showcase"
                arena="coliseum"
                fighter={{ appearance, equipped: fighter.equipped }}
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

          {/* Right: Customization Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                value={appearance.warCry}
                onChange={(e) => setAppearance((p) => ({ ...p, warCry: e.target.value }))}
                placeholder="En garde !"
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Teint de peau</div>
              <div className="swatch-row">
                {SKIN_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Peau ${hex}`}
                    className={`swatch-btn ${appearance.skinColor === hex ? 'swatch-btn--active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setAppearance((p) => ({ ...p, skinColor: hex }))}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Coiffure</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {HAIR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={`tab-btn ${appearance.hairStyle === style.id ? 'tab-btn--active' : ''}`}
                    style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setAppearance((p) => ({ ...p, hairStyle: style.id }))}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>
                Couleur de cheveux
              </div>
              <div className="swatch-row">
                {HAIR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Cheveux ${hex}`}
                    className={`swatch-btn ${appearance.hairColor === hex ? 'swatch-btn--active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setAppearance((p) => ({ ...p, hairColor: hex }))}
                  />
                ))}
              </div>
            </div>

            <div className="grid-2-equal" style={{ gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Regard</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {EYE_STYLES.map((eye) => (
                    <button
                      key={eye.id}
                      type="button"
                      className={`tab-btn ${appearance.eyeStyle === eye.id ? 'tab-btn--active' : ''}`}
                      style={{ minHeight: 32, padding: '3px 9px', fontSize: '0.76rem' }}
                      onClick={() => setAppearance((p) => ({ ...p, eyeStyle: eye.id }))}
                    >
                      {eye.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>
                  Couleur des yeux
                </div>
                <div className="swatch-row">
                  {EYE_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Yeux ${hex}`}
                      className={`swatch-btn ${appearance.eyeColor === hex ? 'swatch-btn--active' : ''}`}
                      style={{ backgroundColor: hex, width: 30, height: 30 }}
                      onClick={() => setAppearance((p) => ({ ...p, eyeColor: hex }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>
                Couleurs de tenue
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {OUTFIT_PALETTE.map((theme) => {
                  const active = appearance.outfitPrimary === theme.primary;
                  return (
                    <button
                      key={theme.label}
                      type="button"
                      className={`tab-btn ${active ? 'tab-btn--active' : ''}`}
                      style={{
                        minHeight: 36,
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={() =>
                        setAppearance((p) => ({
                          ...p,
                          outfitPrimary: theme.primary,
                          outfitSecondary: theme.secondary,
                        }))
                      }
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.primary} 55%, ${theme.secondary} 55%)`,
                          border: '1.5px solid var(--ink-strong)',
                          display: 'inline-block',
                        }}
                      />
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={submitting}
              style={{ marginTop: 4, width: '100%' }}
            >
              <Check size={20} />
              {submitting ? 'Création en cours…' : 'Créer mon Combattant !'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
