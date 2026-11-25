import React, { useMemo, useState } from 'react';
import { Sparkles, Check, Lock, ArrowUp, X } from 'lucide-react';
import type { SkillDefinition } from '@shared/types';
import { MAX_EQUIPPED_ACTIVE_SKILLS } from '@shared/constants';
import {
  SKILLS_CATALOG,
  getSkillDefinition,
  getSkillUpgradeCost,
} from '@shared/skillsCatalog';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

function renderSkillBonusTags(skill: SkillDefinition, level: number) {
  const effectiveLvl = Math.max(1, level);
  const tags: string[] = [];

  if (skill.category === 'active') {
    if (skill.rageCost) tags.push(`🔥 ${skill.rageCost} Rage`);
    if (skill.damageMultiplier) {
      const scaled = (skill.damageMultiplier * (1 + (effectiveLvl - 1) * 0.12)).toFixed(2);
      const hitsLabel = skill.hits && skill.hits > 1 ? `${skill.hits}x ` : '';
      tags.push(`⚔️ ${hitsLabel}${scaled}x ATQ`);
    }
    if (skill.healPercent) {
      tags.push(`💚 Soin +${Math.round(skill.healPercent + (effectiveLvl - 1) * 2)}%`);
    }
    if (skill.stunTurns) tags.push(`⚡ Étourdit ${skill.stunTurns} tour`);
    if (skill.buffStat && skill.buffAmount) {
      tags.push(`📈 +${skill.buffAmount + (effectiveLvl - 1) * 2} ${skill.buffStat.toUpperCase()}`);
    }
  } else if (skill.passiveBonuses) {
    const p = skill.passiveBonuses;
    if (p.str) tags.push(`FOR +${p.str * effectiveLvl}`);
    if (p.def) tags.push(`DÉF +${p.def * effectiveLvl}`);
    if (p.agi) tags.push(`AGI +${p.agi * effectiveLvl}`);
    if (p.vit) tags.push(`VIT +${p.vit * effectiveLvl}`);
    if (p.lck) tags.push(`CHA +${p.lck * effectiveLvl}`);
    if (p.critChance) tags.push(`Crit +${(p.critChance * effectiveLvl * 100).toFixed(1)}%`);
    if (p.dodgeChance) tags.push(`Esquive +${(p.dodgeChance * effectiveLvl * 100).toFixed(1)}%`);
    if (p.blockChance) tags.push(`Blocage +${(p.blockChance * effectiveLvl * 100).toFixed(1)}%`);
    if (p.lifesteal) tags.push(`Vol de vie +${(p.lifesteal * effectiveLvl * 100).toFixed(1)}%`);
    if (p.goldPercent) tags.push(`🪙 +${p.goldPercent * effectiveLvl}% Or`);
    if (p.clickDamagePercent) tags.push(`👊 +${p.clickDamagePercent * effectiveLvl}% Clic`);
  }

  return (
    <div className="item-card__stats">
      {tags.map((t) => (
        <span key={t} className="stat-tag">
          {t}
        </span>
      ))}
    </div>
  );
}

export const SkillsView: React.FC = () => {
  const { fighter, effectiveGold, upgradeSkill, toggleEquipSkill, addToast } = useGame();
  const [filter, setFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleSkills = useMemo(() => {
    return SKILLS_CATALOG.filter((s) => (filter === 'all' ? true : s.category === filter));
  }, [filter]);

  if (!fighter) return null;

  const handleUpgrade = async (skillId: string) => {
    setBusyId(`up_${skillId}`);
    try {
      await upgradeSkill(skillId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Amélioration impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleEquip = async (skillId: string) => {
    setBusyId(`eq_${skillId}`);
    try {
      await toggleEquipSkill(skillId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Maximum 3 compétences actives.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Sparkles size={26} color="var(--accent-flame)" />
            Compétences de Combat
          </h1>
          <p className="view-subtitle">
            Équipe jusqu’à 3 techniques actives qui se déclenchent automatiquement dès que ta jauge de Rage est pleine !
          </p>
        </div>
      </div>

      {/* Active Loadout Bar (3 slots) */}
      <div
        className="comic-card card-pad"
        style={{
          background: 'linear-gradient(135deg, #fffdf5 0%, #f5e6ff 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: '1.1rem' }}>
            Barre de Techniques Actives ({fighter.equippedSkills.length}/{MAX_EQUIPPED_ACTIVE_SKILLS})
          </h2>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
            Les passives sont toujours actives !
          </span>
        </div>

        <div className="grid-cards">
          {Array.from({ length: MAX_EQUIPPED_ACTIVE_SKILLS }).map((_, idx) => {
            const skillId = fighter.equippedSkills[idx];
            const skill = skillId ? getSkillDefinition(skillId) : undefined;
            const lvl = skillId ? fighter.skills[skillId] ?? 0 : 0;

            if (!skill) {
              return (
                <div
                  key={`empty_${idx}`}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 14,
                    border: '2px dashed var(--ink-muted)',
                    background: 'rgba(255,255,255,0.65)',
                    textAlign: 'center',
                    fontWeight: 800,
                    color: 'var(--ink-muted)',
                    fontSize: '0.86rem',
                  }}
                >
                  Emplacement Actif #{idx + 1} (Vide)
                </div>
              );
            }

            return (
              <div
                key={skill.id}
                className="item-card"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderColor: skill.color,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{skill.icon}</span>
                  <div>
                    <div className="item-card__name">{skill.name}</div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                      Niv.{lvl} • 🔥 {skill.rageCost} Rage
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={busyId !== null}
                  onClick={() => void handleToggleEquip(skill.id)}
                  aria-label={`Retirer ${skill.name}`}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div className="tabs-bar">
        {(
          [
            { id: 'all', label: `Toutes (${SKILLS_CATALOG.length})` },
            { id: 'active', label: 'Techniques Actives (6)' },
            { id: 'passive', label: 'Bonus Passifs (6)' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${filter === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => {
              soundEngine.play('click');
              setFilter(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid-cards">
        {visibleSkills.map((skill) => {
          const currentLvl = fighter.skills[skill.id] ?? 0;
          const unlocked = currentLvl > 0;
          const meetsLevel = fighter.level >= skill.unlockLevel;
          const isMax = currentLvl >= skill.maxLevel;
          const cost = getSkillUpgradeCost(skill, currentLvl);
          const canAfford = effectiveGold >= cost;
          const isEquipped = fighter.equippedSkills.includes(skill.id);

          return (
            <div
              key={skill.id}
              className="item-card"
              style={{
                borderColor: unlocked ? skill.color : 'var(--ink-strong)',
                background: isEquipped ? '#fff9e6' : '#ffffff',
                opacity: meetsLevel ? 1 : 0.78,
              }}
            >
              <div className="item-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `${skill.color}22`,
                      border: `2px solid ${skill.color}`,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.4rem',
                      flexShrink: 0,
                    }}
                  >
                    {skill.icon}
                  </div>
                  <div>
                    <div className="item-card__name">{skill.name}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                      <span
                        className="badge"
                        style={{
                          background: skill.category === 'active' ? '#ffe4e6' : '#e0f2fe',
                          fontSize: '0.68rem',
                        }}
                      >
                        {skill.category === 'active' ? 'Active' : 'Passive'}
                      </span>
                      <span className="badge" style={{ background: '#f5ebd4', fontSize: '0.68rem' }}>
                        Niv.{currentLvl}/{skill.maxLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-body)' }}>
                {skill.description}
              </p>

              {renderSkillBonusTags(skill, currentLvl)}

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                {!meetsLevel ? (
                  <button type="button" className="btn btn--sm" disabled style={{ flex: 1 }}>
                    <Lock size={14} />
                    Requis : Niveau {skill.unlockLevel}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn btn--sm ${!isMax && canAfford ? 'btn--gold' : ''}`}
                    disabled={isMax || !canAfford || busyId !== null}
                    onClick={() => void handleUpgrade(skill.id)}
                    style={{ flex: 1 }}
                  >
                    <ArrowUp size={15} />
                    {isMax
                      ? 'NIVEAU MAX'
                      : unlocked
                        ? `Améliorer • 🪙 ${cost.toLocaleString('fr-FR')}`
                        : `Débloquer • 🪙 ${cost.toLocaleString('fr-FR')}`}
                  </button>
                )}

                {skill.category === 'active' && unlocked && (
                  <button
                    type="button"
                    className={`btn btn--sm ${isEquipped ? 'btn--jade' : 'btn--sky'}`}
                    disabled={busyId !== null}
                    onClick={() => void handleToggleEquip(skill.id)}
                  >
                    {isEquipped ? (
                      <>
                        <Check size={14} />
                        Équipée
                      </>
                    ) : (
                      'Équiper'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
