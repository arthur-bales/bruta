import React, { useEffect, useState } from 'react';
import {
  Coins,
  Dices,
  Flame,
  Heart,
  Play,
  Plus,
  Save,
  Trophy,
  Wind,
  Zap,
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
import {
  HeartHp,
  SectionCard,
  SegmentedStat,
  formatCompact,
} from '@/components/ui/BruteUI';
import { GameIcon } from '@/components/ui/GameIcon';
import { soundEngine } from '@/engine/audio/soundEffects';
import { useGame } from '@/state/GameContext';

const STAT_META: { key: keyof CoreStats; label: string; desc: string }[] = [
  { key: 'str', label: 'Force', desc: 'Dégâts physiques & puissance de clic' },
  { key: 'def', label: 'Défense', desc: 'Réduction de dégâts & blocage' },
  { key: 'agi', label: 'Agilité', desc: 'Vitesse, esquive & contre-attaque' },
  { key: 'vit', label: 'Vitalité', desc: 'Points de vie max & endurance' },
  { key: 'lck', label: 'Chance', desc: 'Critiques, multiplicateur & butin' },
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

  const statScale = Math.max(
    10,
    Math.ceil(
      Math.max(
        fighter.baseStats.str,
        fighter.baseStats.def,
        fighter.baseStats.agi,
        fighter.baseStats.vit,
        fighter.baseStats.lck,
        10,
      ) / 10,
    ) * 10,
  );

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
    <div className="mb-stack">
      {/* Top Grid: Live Showcase + Animations | Heart HP + Segmented Stat Allocation */}
      <div className="prof-top-grid">
        <SectionCard
          title={fighter.name}
          right={
            <span className="mb-tag mb-tag--orange">
              Puissance {formatCompact(derivedStats.powerScore)}
            </span>
          }
        >
          <div className="mb-stack">
            <div className="cell-stage-wrap">
              <div className="cell-stage-canvas">
                <PhaserCanvas
                  mode="showcase"
                  arena={homeArena}
                  fighter={{ appearance: editAppearance, equipped: fighter.equipped }}
                  previewAnim={previewAnim}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <span className="mb-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Play size={15} color="#e2700c" />
                  Animations ({ALL_ANIMATIONS.length})
                </span>
                <span className="mb-tag">{ANIMATION_SPECS[activeAnimName].label}</span>
              </div>

              <div className="cell-pill-group">
                {ALL_ANIMATIONS.map((anim) => {
                  const spec = ANIMATION_SPECS[anim];
                  const isSelected = activeAnimName === anim;
                  return (
                    <button
                      key={anim}
                      type="button"
                      className={`cell-mini-pill ${isSelected ? 'cell-mini-pill--active' : ''}`}
                      onClick={() => handlePlayAnim(anim)}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Segmented Stats + Inline Allocation */}
        <SectionCard
          title="Caractéristiques"
          right={
            <span className={`mb-tag ${fighter.statPoints > 0 ? 'mb-tag--orange' : ''}`}>
              {fighter.statPoints} pt(s) libre(s)
            </span>
          }
        >
          <div className="cell-stats-head">
            <HeartHp hp={derivedStats.maxHp} />
            <div className="cell-rank-pill">Rang : {fighter.title}</div>
          </div>

          <div className="mb-stack mb-stack--sm">
            {STAT_META.map((s) => {
              const baseVal = fighter.baseStats[s.key];
              const bonusVal = Object.values(fighter.equipped).reduce(
                (sum, eq) => sum + (eq?.baseStats[s.key] ?? 0),
                0,
              );
              const totalVal = baseVal + bonusVal;

              return (
                <div key={s.key} className="prof-stat-item">
                  <div className="prof-stat-item__row">
                    <div className="prof-stat-item__bar">
                      <SegmentedStat
                        label={s.label}
                        value={baseVal}
                        bonus={bonusVal}
                        max={statScale}
                        display={totalVal}
                      />
                    </div>
                    {fighter.statPoints > 0 && (
                      <div className="prof-stat-item__btns">
                        <button
                          type="button"
                          className="cell-stat-plus"
                          disabled={allocating !== null}
                          onClick={() => void handleAllocate(s.key, 1)}
                          title={`Ajouter +1 en ${s.label}`}
                          aria-label={`Ajouter +1 en ${s.label}`}
                        >
                          <Plus size={15} />
                        </button>
                        {fighter.statPoints >= 5 && (
                          <button
                            type="button"
                            className="cell-stat-plus"
                            style={{ width: 38, fontSize: '0.82rem' }}
                            disabled={allocating !== null}
                            onClick={() => void handleAllocate(s.key, 5)}
                            title={`Ajouter +5 en ${s.label}`}
                          >
                            +5
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="prof-stat-item__desc">
                    {s.desc}
                    {bonusVal > 0 ? ` (base ${baseVal} + ${bonusVal} bonus)` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Derived Stats + Career Palmarès */}
      <div className="grid-2-equal">
        <SectionCard title="Statistiques de Combat">
          <div className="prof-mini-grid">
            <div className="prof-mini-box">
              <span>Points de Vie Max</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Heart size={15} fill="#d0412a" color="#8b1e14" />
                {derivedStats.maxHp} PV
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Dégâts par coup</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="sword" size={16} />
                {derivedStats.minDamage} – {derivedStats.maxDamage}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Armure / Défense</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="iron_armor" size={16} />
                {derivedStats.defense}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Vitesse / Initiative</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Wind size={15} color="#2563eb" />
                {derivedStats.speed}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Coup Critique</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="fire_rage" size={16} />
                {Math.round(derivedStats.critChance * 100)}% (x{derivedStats.critMultiplier})
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Esquive / Blocage</span>
              <strong>
                {Math.round(derivedStats.dodgeChance * 100)}% / {Math.round(derivedStats.blockChance * 100)}%
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Contre-Attaque</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Zap size={15} color="#e2700c" />
                {Math.round(derivedStats.counterChance * 100)}%
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Vol de Vie / Épines</span>
              <strong>
                {Math.round(derivedStats.lifesteal * 100)}% / {Math.round(derivedStats.thornsPercent * 100)}%
              </strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Palmarès de Carrière">
          <div className="prof-mini-grid">
            <div className="prof-mini-box">
              <span>Arène (V / D)</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="sword" size={16} />
                {fighter.progress.arenaWins} / {fighter.progress.arenaLosses}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Duels PvP (V / D)</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="fist" size={16} />
                {fighter.progress.pvpWins} / {fighter.progress.pvpLosses}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Boss Vaincus</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="boss" size={18} rounded />
                {fighter.progress.bossesDefeated}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Meilleure Série</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Flame size={15} color="#d0412a" />
                {fighter.progress.bestWinStreak}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Frappes au Dojo</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GameIcon name="dumbbell" size={16} />
                {formatCompact(fighter.progress.totalClicks)}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Record Combo</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Zap size={15} color="#e2700c" />x{fighter.progress.highestCombo}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Classement Elo</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Trophy size={15} color="#c9820a" />
                {fighter.rating}
              </strong>
            </div>
            <div className="prof-mini-box">
              <span>Or Total Cumulé</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Coins size={15} color="#c9820a" />
                {formatCompact(fighter.progress.totalGoldEarned)}
              </strong>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live Appearance Customizer */}
      <form onSubmit={handleSaveAppearance}>
        <SectionCard
          title="Atelier d’Apparence"
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--sm btn--gold" onClick={handleRandomizeAppearance}>
                <Dices size={15} />
                Aléatoire
              </button>
              <button type="submit" className="btn btn--sm btn--primary" disabled={savingAppearance}>
                <Save size={15} />
                {savingAppearance ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          }
        >
          <div className="mb-stack">
            <div className="grid-2-equal">
              <div>
                <label htmlFor="profile-name" className="prof-label">
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
                <label htmlFor="profile-warcry" className="prof-label">
                  Cri de guerre
                </label>
                <input
                  id="profile-warcry"
                  type="text"
                  className="comic-input"
                  maxLength={48}
                  value={editAppearance.warCry}
                  onChange={(e) =>
                    setEditAppearance((p) => (p ? { ...p, warCry: e.target.value } : p))
                  }
                />
              </div>
            </div>

            <div className="grid-2-equal">
              <div className="mb-stack mb-stack--sm">
                <div>
                  <div className="prof-label">Teint de peau</div>
                  <div className="swatch-row">
                    {SKIN_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Peau ${hex}`}
                        className={`swatch-btn ${editAppearance.skinColor === hex ? 'swatch-btn--active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() =>
                          setEditAppearance((p) => (p ? { ...p, skinColor: hex } : p))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="prof-label">Coiffure</div>
                  <div className="cell-pill-group">
                    {HAIR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        className={`cell-mini-pill ${editAppearance.hairStyle === style.id ? 'cell-mini-pill--active' : ''}`}
                        onClick={() =>
                          setEditAppearance((p) => (p ? { ...p, hairStyle: style.id } : p))
                        }
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="prof-label">Couleur de cheveux</div>
                  <div className="swatch-row">
                    {HAIR_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Cheveux ${hex}`}
                        className={`swatch-btn ${editAppearance.hairColor === hex ? 'swatch-btn--active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() =>
                          setEditAppearance((p) => (p ? { ...p, hairColor: hex } : p))
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-stack mb-stack--sm">
                <div>
                  <div className="prof-label">Style des yeux</div>
                  <div className="cell-pill-group">
                    {EYE_STYLES.map((eye) => (
                      <button
                        key={eye.id}
                        type="button"
                        className={`cell-mini-pill ${editAppearance.eyeStyle === eye.id ? 'cell-mini-pill--active' : ''}`}
                        onClick={() =>
                          setEditAppearance((p) => (p ? { ...p, eyeStyle: eye.id } : p))
                        }
                      >
                        {eye.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="prof-label">Couleur des yeux</div>
                  <div className="swatch-row">
                    {EYE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Yeux ${hex}`}
                        className={`swatch-btn ${editAppearance.eyeColor === hex ? 'swatch-btn--active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() =>
                          setEditAppearance((p) => (p ? { ...p, eyeColor: hex } : p))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="prof-label">Couleurs de tenue</div>
                  <div className="cell-pill-group">
                    {OUTFIT_PALETTE.map((theme) => (
                      <button
                        key={theme.label}
                        type="button"
                        className={`cell-mini-pill ${editAppearance.outfitPrimary === theme.primary ? 'cell-mini-pill--active' : ''}`}
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
                            width: 13,
                            height: 13,
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
          </div>
        </SectionCard>
      </form>
    </div>
  );
};
