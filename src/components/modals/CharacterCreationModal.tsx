import React, { useEffect, useState } from 'react';
import { Sparkles, Swords } from 'lucide-react';
import type { FighterGender } from '@shared/types';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const CharacterCreationModal: React.FC = () => {
  const { fighter, showCreationModal, setShowCreationModal, customizeFighter, addToast } = useGame();

  const [name, setName] = useState<string>(fighter?.name || 'Brute');
  const [gender, setGender] = useState<FighterGender>(fighter?.gender ?? 'male');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showCreationModal && fighter) {
      setName(fighter.name || 'Brute');
      setGender(fighter.gender ?? 'male');
    }
  }, [showCreationModal, fighter?.id, fighter?.name, fighter?.gender]);

  if (!showCreationModal || !fighter) return null;

  const previewSkinId = gender === 'female' ? 'skin_female_dojo' : 'skin_male_dojo';

  const handleSelectGender = (nextGender: FighterGender) => {
    if (nextGender === gender) return;
    soundEngine.play('click');
    setGender(nextGender);
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
        gender,
        appearance: fighter.appearance,
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
      <div className="modal-box" style={{ maxWidth: 660 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={22} color="var(--accent-flame)" />
            Crée ta Légende !
          </h2>
          <p className="view-subtitle">
            Choisis ton nom et ton combattant avant d’entrer dans l’Arène.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid-2" style={{ alignItems: 'center' }}>
          {/* Left: Live Phaser Showcase */}
          <div className="stage-frame stage-frame--hero">
            <PhaserCanvas
              mode="showcase"
              arena="coliseum"
              fighter={{
                appearance: fighter.appearance,
                equipped: fighter.equipped,
                equippedSkinId: previewSkinId,
              }}
            />
          </div>

          {/* Right: Name + Gender + Single Giant CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="creator-name"
                style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', marginBottom: 5 }}
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
                autoFocus
              />
            </div>

            <div>
              <span
                style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}
              >
                Sexe
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className={`btn btn--lg ${gender === 'male' ? 'btn--gold' : ''}`}
                  aria-pressed={gender === 'male'}
                  onClick={() => handleSelectGender('male')}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    fontSize: '1.05rem',
                    borderWidth: 3,
                    boxShadow:
                      gender === 'male'
                        ? '0 4px 0 #6b3f22, 0 0 0 3px rgba(240, 138, 28, 0.35)'
                        : undefined,
                  }}
                >
                  Homme
                </button>
                <button
                  type="button"
                  className={`btn btn--lg ${gender === 'female' ? 'btn--gold' : ''}`}
                  aria-pressed={gender === 'female'}
                  onClick={() => handleSelectGender('female')}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    fontSize: '1.05rem',
                    borderWidth: 3,
                    boxShadow:
                      gender === 'female'
                        ? '0 4px 0 #6b3f22, 0 0 0 3px rgba(240, 138, 28, 0.35)'
                        : undefined,
                  }}
                >
                  Femme
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={submitting}
              style={{ width: '100%', minHeight: 56, fontSize: '1.15rem', marginTop: 4 }}
            >
              <Swords size={22} />
              {submitting ? 'Préparation…' : "ENTRER DANS L'ARÈNE !"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
