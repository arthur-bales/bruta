import React, { useEffect, useState } from 'react';
import {
  Coins,
  Flame,
  Heart,
  Play,
  Plus,
  Save,
  ShoppingBag,
  Trophy,
  Wind,
  Zap,
} from 'lucide-react';
import type { AnimationName, CoreStats } from '@shared/types';
import { ALL_ANIMATIONS, ANIMATION_SPECS, RARITY_META } from '@shared/constants';
import { DEFAULT_SKIN_ID, SKINS_CATALOG } from '@shared/skinsCatalog';
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

export const ProfileView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    homeArena,
    allocateStat,
    customizeFighter,
    equipSkin,
    setActiveView,
    addToast,
  } = useGame();

  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);
  const [activeAnimName, setActiveAnimName] = useState<AnimationName>('idle');
  const [allocating, setAllocating] = useState<string | null>(null);

  const [editName, setEditName] = useState<string>(fighter?.name ?? '');
  const [editWarCry, setEditWarCry] = useState<string>(fighter?.appearance.warCry ?? 'En garde !');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [equippingSkinId, setEquippingSkinId] = useState<string | null>(null);

  useEffect(() => {
    if (fighter) {
      setEditName(fighter.name);
      setEditWarCry(fighter.appearance.warCry || 'En garde !');
    }
  }, [fighter?.id, fighter?.name, fighter?.appearance.warCry]);

  if (!fighter || !derivedStats) return null;

  const unlockedSkinIds = fighter.unlockedSkins ?? [DEFAULT_SKIN_ID];
  const equippedSkinId = fighter.equippedSkinId ?? DEFAULT_SKIN_ID;
  const ownedSkins = SKINS_CATALOG.filter((s) => unlockedSkinIds.includes(s.id));

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

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (cleanName.length < 2) {
      addToast('Le nom doit faire au moins 2 caractères.', 'error');
      return;
    }
    setSavingIdentity(true);
    try {
      await customizeFighter({
        name: cleanName.slice(0, 20),
        appearance: {
          ...fighter.appearance,
          warCry: editWarCry.trim() || 'En garde !',
        },
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de sauvegarder.', 'error');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleEquipSkin = async (skinId: string) => {
    setEquippingSkinId(skinId);
    try {
      await equipSkin(skinId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible d’équiper ce skin.', 'error');
    } finally {
      setEquippingSkinId(null);
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
                  fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
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

      {/* Unlocked Skins Collection */}
      <SectionCard
        title="Mes Skins"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="mb-tag mb-tag--olive">
              {ownedSkins.length}/{SKINS_CATALOG.length} débloqués
            </span>
            <button
              type="button"
              className="btn btn--sm btn--gold"
              onClick={() => {
                soundEngine.play('click');
                setActiveView('shop');
              }}
            >
              <ShoppingBag size={15} />
              Boutique de Skins
            </button>
          </div>
        }
      >
        <div className="shop-skins-grid">
          {ownedSkins.map((skin) => {
            const isEquipped = equippedSkinId === skin.id;
            const rarityMeta = RARITY_META[skin.rarity];

            return (
              <div
                key={skin.id}
                className={`shop-skin-card ${isEquipped ? 'shop-skin-card--equipped' : ''}`}
                style={{ borderColor: isEquipped ? '#6d7a1e' : rarityMeta.border }}
              >
                <div className="shop-skin-card__stage">
                  <img src={skin.previewUrl} alt={skin.name} />
                </div>

                <div>
                  <div className="shop-skin-card__name">{skin.name}</div>
                  <div className="shop-skin-card__title">{skin.title}</div>
                  <span
                    className="badge"
                    style={{
                      background: '#fffdf3',
                      color: rarityMeta.color,
                      borderColor: rarityMeta.border,
                      fontSize: '0.7rem',
                      marginTop: 5,
                    }}
                  >
                    {rarityMeta.label}
                  </span>
                </div>

                <div className="shop-skin-card__footer">
                  {isEquipped ? (
                    <span className="mb-tag mb-tag--olive shop-skin-card__equipped-badge">
                      ÉQUIPÉ ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--sm btn--sky"
                      disabled={equippingSkinId !== null}
                      onClick={() => void handleEquipSkin(skin.id)}
                      style={{ width: '100%' }}
                    >
                      {equippingSkinId === skin.id ? '…' : 'ÉQUIPER'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Fighter Identity Rename */}
      <form onSubmit={handleSaveIdentity}>
        <SectionCard
          title="Identité du Combattant"
          right={
            <button type="submit" className="btn btn--sm btn--primary" disabled={savingIdentity}>
              <Save size={15} />
              {savingIdentity ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          }
        >
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
                value={editWarCry}
                onChange={(e) => setEditWarCry(e.target.value)}
              />
            </div>
          </div>
        </SectionCard>
      </form>
    </div>
  );
};
