import React, { useEffect, useState } from 'react';
import {
  User,
  Plus,
  Play,
  Palette,
  Dices,
  Save,
  Award,
  Activity,
} from 'lucide-react';
import type { AnimationName, CoreStats, FighterAppearance } from '@shared/types';
import {
  ALL_ANIMATIONS,
  ANIMATION_SPECS,
  EYE_STYLES,
  HAIR_PALETTE,
  HAIR_STYLES,
  OUTFIT_PALETTE,
  SKIN_PALETTE,
} from '@shared/constants';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

const STAT_META: { key: keyof CoreStats; label: string; desc: string; emoji: string }[] = [
  { key: 'str', label: 'Force', desc: 'Dégâts physiques & puissance de clic', emoji: '💪' },
  { key: 'def', label: 'Défense', desc: 'Réduction de dégâts & blocage', emoji: '🛡️' },
  { key: 'agi', label: 'Agilité', desc: 'Vitesse, esquive & contre-attaque', emoji: '💨' },
  { key: 'vit', label: 'Vitalité', desc: 'Points de vie max & endurance', emoji: '❤️' },
  { key: 'lck', label: 'Chance', desc: 'Critiques, multiplicateur & butin', emoji: '🍀' },
];

const EYE_COLORS = ['#2563eb', '#dc2626', '#10b981', '#d97706', '#7c3aed', '#1e293b'];

export const ProfileView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    homeArena,
    allocateStat,
    customizeFighter,
    addToast,
  } = useGame();

  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [activeAnimName, setActiveAnimName] = useState<AnimationName>('idle');
  const [allocating, setAllocating] = useState<string | null>(null);

  const [editName, setEditName] = useState<string>(fighter?.name ?? '');
  const [editAppearance, setEditAppearance] = useState<FighterAppearance | null>(
    fighter?.appearance ?? null,
  );
  const [savingAppearance, setSavingAppearance] = useState(false);

  useEffect(() => {
    if (fighter) {
      setEditName(fighter.name);
      setEditAppearance(fighter.appearance);
    }
  }, [fighter?.id, fighter?.name, fighter?.appearance]);

  if (!fighter || !derivedStats || !editAppearance) return null;

  const handlePlayAnim = (anim: AnimationName) => {
    setActiveAnimName(anim);
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
    if (anim === 'attack') soundEngine.play('hit');
    else if (anim === 'heavy_attack') soundEngine.play('heavy_hit');
    else if (anim === 'special') soundEngine.play('special');
    else if (anim === 'dodge') soundEngine.play('dodge');
    else if (anim === 'block') soundEngine.play('block');
    else if (anim === 'victory') soundEngine.play('victory');
    else if (anim === 'defeat') soundEngine.play('defeat');
    else soundEngine.play('click');
  };

  const handleAllocate = async (stat: keyof CoreStats, amount: number) => {
    if (fighter.statPoints <= 0) return;
    const actualAmount = Math.min(amount, fighter.statPoints);
    setAllocating(`${stat}_${amount}`);
    try {
      await allocateStat(stat, actualAmount);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur d’allocation.', 'error');
    } finally {
      setAllocating(null);
    }
  };

  const handleRandomizeAppearance = () => {
    soundEngine.play('click');
    const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const outfit = rand(OUTFIT_PALETTE);
    setEditAppearance((prev) => ({
      ...(prev ?? fighter.appearance),
      skinColor: rand(SKIN_PALETTE),
      hairStyle: rand(HAIR_STYLES).id,
      hairColor: rand(HAIR_PALETTE),
      eyeStyle: rand(EYE_STYLES).id,
      eyeColor: rand(EYE_COLORS),
      outfitPrimary: outfit.primary,
      outfitSecondary: outfit.secondary,
    }));
    handlePlayAnim('victory');
  };

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (cleanName.length < 2) {
      addToast('Le nom doit faire au moins 2 caractères.', 'error');
      return;
    }
    setSavingAppearance(true);
    try {
      await customizeFighter({
        name: cleanName.slice(0, 20),
        appearance: {
          ...editAppearance,
          warCry: editAppearance.warCry.trim() || 'En garde !',
        },
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de sauvegarder.', 'error');
    } finally {
      setSavingAppearance(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <User size={26} color="var(--accent-flame)" />
            Profil & Caractéristiques
          </h1>
          <p className="view-subtitle">
            Teste les 11 animations de ta brute, place tes points de niveau et modifie ton style en direct !
          </p>
        </div>
        <div className="badge" style={{ background: '#ffd152', fontSize: '0.9rem', padding: '6px 14px' }}>
          Puissance : {derivedStats.powerScore.toLocaleString('fr-FR')}
        </div>
      </div>

      {/* Top Grid: Live Showcase + Animation Bar | Stat Allocation */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="stage-frame stage-frame--hero">
            <PhaserCanvas
              mode="showcase"
              arena={homeArena}
              fighter={{ appearance: editAppearance, equipped: fighter.equipped }}
              previewAnim={previewAnim}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} color="var(--accent-flame)" />
                Prévisualiseur d’Animations (11)
              </strong>
              <span className="badge" style={{ background: '#e0f2fe' }}>
                {ANIMATION_SPECS[activeAnimName].label}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_ANIMATIONS.map((anim) => {
                const spec = ANIMATION_SPECS[anim];
                const isSelected = activeAnimName === anim;
                return (
                  <button
                    key={anim}
                    type="button"
                    className={`tab-btn ${isSelected ? 'tab-btn--active' : ''}`}
                    style={{ minHeight: 36, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => handlePlayAnim(anim)}
                  >
                    {spec.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stat Allocation */}
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 style={{ fontSize: '1.15rem' }}>Points de Caractéristiques</h2>
            <span
              className="badge"
              style={{
                background: fighter.statPoints > 0 ? '#ffd152' : '#e5e7eb',
                fontSize: '0.84rem',
                padding: '4px 10px',
              }}
            >
              {fighter.statPoints} disponible(s)
            </span>
          </div>

          {STAT_META.map((s) => (
            <div key={s.key} className="stat-row">
              <div className="stat-row__meta">
                <span className="stat-row__name">
                  {s.emoji} {s.label}
                </span>
                <span className="stat-row__desc">{s.desc}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="stat-row__value">{fighter.baseStats[s.key]}</span>
                <button
                  type="button"
                  className="btn btn--sm btn--jade"
                  disabled={fighter.statPoints < 1 || allocating !== null}
                  onClick={() => void handleAllocate(s.key, 1)}
                  title={`Ajouter +1 en ${s.label}`}
                  style={{ minWidth: 44 }}
                >
                  <Plus size={14} />1
                </button>
                {fighter.statPoints >= 5 && (
                  <button
                    type="button"
                    className="btn btn--sm btn--gold"
                    disabled={allocating !== null}
                    onClick={() => void handleAllocate(s.key, 5)}
                    title={`Ajouter +5 en ${s.label}`}
                    style={{ minWidth: 44 }}
                  >
                    +5
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derived Stats + Combat Record */}
      <div className="grid-2-equal">
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: '1.12rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={19} color="var(--accent-sky)" />
            Statistiques de Combat Dérivées
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div className="mini-stat-box">
              <span>Points de Vie Max</span>
              <strong>{derivedStats.maxHp} PV</strong>
            </div>
            <div className="mini-stat-box">
              <span>Dégâts par coup</span>
              <strong>
                {derivedStats.minDamage} – {derivedStats.maxDamage}
              </strong>
            </div>
            <div className="mini-stat-box">
              <span>Armure / Défense</span>
              <strong>{derivedStats.defense}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Vitesse / Initiative</span>
              <strong>{derivedStats.speed}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Coup Critique</span>
              <strong>
                {Math.round(derivedStats.critChance * 100)}% (x{derivedStats.critMultiplier})
              </strong>
            </div>
            <div className="mini-stat-box">
              <span>Esquive / Blocage</span>
              <strong>
                {Math.round(derivedStats.dodgeChance * 100)}% / {Math.round(derivedStats.blockChance * 100)}%
              </strong>
            </div>
            <div className="mini-stat-box">
              <span>Contre-Attaque</span>
              <strong>{Math.round(derivedStats.counterChance * 100)}%</strong>
            </div>
            <div className="mini-stat-box">
              <span>Vol de Vie / Épines</span>
              <strong>
                {Math.round(derivedStats.lifesteal * 100)}% / {Math.round(derivedStats.thornsPercent * 100)}%
              </strong>
            </div>
          </div>
        </div>

        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: '1.12rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={19} color="#d97706" />
            Palmarès de Carrière
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div className="mini-stat-box">
              <span>Arène (V / D)</span>
              <strong>
                {fighter.progress.arenaWins} / {fighter.progress.arenaLosses}
              </strong>
            </div>
            <div className="mini-stat-box">
              <span>Duels PvP (V / D)</span>
              <strong>
                {fighter.progress.pvpWins} / {fighter.progress.pvpLosses}
              </strong>
            </div>
            <div className="mini-stat-box">
              <span>Boss Vaincus</span>
              <strong>👹 {fighter.progress.bossesDefeated}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Meilleure Série</span>
              <strong>🔥 {fighter.progress.bestWinStreak}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Frappes au Dojo</span>
              <strong>👊 {fighter.progress.totalClicks.toLocaleString('fr-FR')}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Record Combo</span>
              <strong>⚡ x{fighter.progress.highestCombo}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Classement Elo</span>
              <strong>🏆 {fighter.rating}</strong>
            </div>
            <div className="mini-stat-box">
              <span>Or Total Cumulé</span>
              <strong>🪙 {fighter.progress.totalGoldEarned.toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Live Appearance Customizer */}
      <form onSubmit={handleSaveAppearance} className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <h2 style={{ fontSize: '1.18rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={20} color="var(--accent-flame)" />
            Atelier d’Apparence (aperçu en direct ci-dessus)
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--sm btn--gold" onClick={handleRandomizeAppearance}>
              <Dices size={16} />
              Aléatoire
            </button>
            <button type="submit" className="btn btn--sm btn--primary" disabled={savingAppearance}>
              <Save size={16} />
              {savingAppearance ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="grid-2-equal">
          <div>
            <label htmlFor="profile-name" style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}>
              Nom du combattant
            </label>
            <input
              id="profile-name"
              type="text"
              className="comic-input"
              maxLength={20}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="profile-warcry" style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}>
              Cri de guerre
            </label>
            <input
              id="profile-warcry"
              type="text"
              className="comic-input"
              maxLength={48}
              value={editAppearance.warCry}
              onChange={(e) => setEditAppearance((p) => (p ? { ...p, warCry: e.target.value } : p))}
            />
          </div>
        </div>

        <div className="grid-2-equal">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Teint de peau</div>
              <div className="swatch-row">
                {SKIN_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Peau ${hex}`}
                    className={`swatch-btn ${editAppearance.skinColor === hex ? 'swatch-btn--active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setEditAppearance((p) => (p ? { ...p, skinColor: hex } : p))}
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
                    className={`tab-btn ${editAppearance.hairStyle === style.id ? 'tab-btn--active' : ''}`}
                    style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setEditAppearance((p) => (p ? { ...p, hairStyle: style.id } : p))}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Couleur de cheveux</div>
              <div className="swatch-row">
                {HAIR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Cheveux ${hex}`}
                    className={`swatch-btn ${editAppearance.hairColor === hex ? 'swatch-btn--active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setEditAppearance((p) => (p ? { ...p, hairColor: hex } : p))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Style des yeux</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EYE_STYLES.map((eye) => (
                  <button
                    key={eye.id}
                    type="button"
                    className={`tab-btn ${editAppearance.eyeStyle === eye.id ? 'tab-btn--active' : ''}`}
                    style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setEditAppearance((p) => (p ? { ...p, eyeStyle: eye.id } : p))}
                  >
                    {eye.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Couleur des yeux</div>
              <div className="swatch-row">
                {EYE_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Yeux ${hex}`}
                    className={`swatch-btn ${editAppearance.eyeColor === hex ? 'swatch-btn--active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setEditAppearance((p) => (p ? { ...p, eyeColor: hex } : p))}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', marginBottom: 5 }}>Couleurs de tenue</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {OUTFIT_PALETTE.map((theme) => (
                  <button
                    key={theme.label}
                    type="button"
                    className={`tab-btn ${editAppearance.outfitPrimary === theme.primary ? 'tab-btn--active' : ''}`}
                    style={{
                      minHeight: 36,
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() =>
                      setEditAppearance((p) =>
                        p
                          ? {
                              ...p,
                              outfitPrimary: theme.primary,
                              outfitSecondary: theme.secondary,
                            }
                          : p,
                      )
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
