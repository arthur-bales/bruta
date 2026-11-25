import React, { useMemo, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import type { SkillDefinition } from '@shared/types';
import { MAX_EQUIPPED_ACTIVE_SKILLS } from '@shared/constants';
import {
  SKILLS_CATALOG,
  getSkillDefinition,
  getSkillUpgradeCost,
} from '@shared/skillsCatalog';
import { MbRow, PriceButton, SectionCard } from '@/components/ui/BruteUI';
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
    <div className="arsenal-stat-tags" style={{ marginTop: 4 }}>
      {tags.map((t) => (
        <span key={t} className="arsenal-stat-tag">
          {t}
        </span>
      ))}
    </div>
  );
}

export const SkillsView: React.FC = () => {
  const { fighter, effectiveGold, upgradeSkill, toggleEquipSkill, addToast } = useGame();
  const [filter, setFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleSkills = useMemo(() => {
    return SKILLS_CATALOG.filter((s) => (filter === 'all' ? true : s.category === filter));
  }, [filter]);

  if (!fighter) return null;

  const unlockedCount = SKILLS_CATALOG.filter((s) => (fighter.skills[s.id] ?? 0) > 0).length;

  const handleTileClick = (skill: SkillDefinition) => {
    soundEngine.play('click');
    setSelectedSkillId(skill.id);
    if (filter !== 'all' && skill.category !== filter) {
      setFilter('all');
    }
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`skill-row-${skill.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

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
    <div className="arsenal-view">
      {/* Top SectionCard: Iconic My Brute Square Skill Grid + Active Loadout */}
      <SectionCard
        title="Compétences de Combat"
        right={
          <span className="mb-tag mb-tag--olive">
            {unlockedCount}/{SKILLS_CATALOG.length} acquises
          </span>
        }
      >
        <div className="skill-grid skills-mosaic" role="list" aria-label="Grille des compétences">
          {SKILLS_CATALOG.map((skill) => {
            const currentLvl = fighter.skills[skill.id] ?? 0;
            const acquired = currentLvl > 0;
            const isEquipped = fighter.equippedSkills.includes(skill.id);
            const isSelected = selectedSkillId === skill.id;

            return (
              <button
                key={skill.id}
                type="button"
                className={`skill-tile ${acquired ? 'skill-tile--on' : ''} ${
                  isSelected ? 'skill-tile--selected' : ''
                }`}
                onClick={() => handleTileClick(skill)}
                title={`${skill.name} — ${
                  acquired ? `Niv. ${currentLvl}/${skill.maxLevel}` : `Verrouillée (Niv. ${skill.unlockLevel})`
                }`}
              >
                <span aria-hidden="true">{skill.icon}</span>
                {acquired && <span className="skill-tile__lvl">{currentLvl}</span>}
                {isEquipped && (
                  <span
                    className="skill-tile__equipped-dot"
                    title="Technique active équipée"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Loadout Strip (3 slots) */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <span className="mb-caption">
              Techniques Actives Équipées ({fighter.equippedSkills.length}/{MAX_EQUIPPED_ACTIVE_SKILLS})
            </span>
            <span className="mb-flavor" style={{ fontSize: '0.82rem' }}>
              Les passives sont toujours actives !
            </span>
          </div>

          <div className="skills-loadout-grid">
            {Array.from({ length: MAX_EQUIPPED_ACTIVE_SKILLS }).map((_, idx) => {
              const skillId = fighter.equippedSkills[idx];
              const skill = skillId ? getSkillDefinition(skillId) : undefined;
              const lvl = skillId ? fighter.skills[skillId] ?? 0 : 0;

              if (!skill) {
                return (
                  <div key={`empty_${idx}`} className="skills-loadout-slot skills-loadout-slot--empty">
                    Emplacement #{idx + 1} (Vide)
                  </div>
                );
              }

              return (
                <div key={skill.id} className="skills-loadout-slot">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: '1.35rem' }}>{skill.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="mb-row__title" style={{ fontSize: '0.92rem' }}>
                        {skill.name}
                        <em>Niv.{lvl}</em>
                      </div>
                      <div className="mb-row__desc" style={{ fontSize: '0.74rem' }}>
                        🔥 {skill.rageCost} Rage
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={busyId !== null}
                    onClick={() => void handleToggleEquip(skill.id)}
                    aria-label={`Retirer ${skill.name}`}
                    style={{ minHeight: 32, padding: '4px 8px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Skills Detail List (MbRow 2-col on PC) */}
      <SectionCard
        title="Grimoire & Améliorations"
        right={
          <div className="arsenal-pills">
            {(
              [
                { id: 'all', label: `Toutes (${SKILLS_CATALOG.length})` },
                { id: 'active', label: 'Actives' },
                { id: 'passive', label: 'Passives' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`arsenal-pill arsenal-pill--sub ${
                  filter === tab.id ? 'arsenal-pill--active' : ''
                }`}
                onClick={() => {
                  soundEngine.play('click');
                  setFilter(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="skills-rows-grid">
          {visibleSkills.map((skill) => {
            const currentLvl = fighter.skills[skill.id] ?? 0;
            const unlocked = currentLvl > 0;
            const meetsLevel = fighter.level >= skill.unlockLevel;
            const isMax = currentLvl >= skill.maxLevel;
            const cost = getSkillUpgradeCost(skill, currentLvl);
            const canAfford = effectiveGold >= cost;
            const isEquipped = fighter.equippedSkills.includes(skill.id);
            const isSelected = selectedSkillId === skill.id;

            const rowState = isSelected ? 'active' : !meetsLevel ? 'locked' : 'default';

            return (
              <div key={skill.id} id={`skill-row-${skill.id}`}>
                <MbRow
                  state={rowState}
                  onClick={() => setSelectedSkillId(skill.id)}
                  icon={
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: '100%',
                        height: '100%',
                        background: unlocked
                          ? 'linear-gradient(180deg, #f3e46a 0%, #d4be28 100%)'
                          : '#f6ecc6',
                      }}
                    >
                      {skill.icon}
                    </span>
                  }
                  title={skill.name}
                  level={`Niv. ${currentLvl}/${skill.maxLevel}`}
                  desc={
                    <div style={{ marginTop: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span
                          className={`mb-tag ${
                            skill.category === 'active' ? 'mb-tag--orange' : 'mb-tag--olive'
                          }`}
                          style={{ fontSize: '0.66rem', padding: '1px 6px' }}
                        >
                          {skill.category === 'active' ? 'Active' : 'Passive'}
                        </span>
                        {isEquipped && (
                          <span className="mb-tag" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                            Équipée
                          </span>
                        )}
                      </div>
                      <span>{skill.description}</span>
                      {renderSkillBonusTags(skill, currentLvl)}
                    </div>
                  }
                  right={
                    <div
                      className="skill-row-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!meetsLevel ? (
                        <span className="mb-tag" title={`Niveau ${skill.unlockLevel} requis`}>
                          <Lock size={11} style={{ marginRight: 3 }} />
                          Niv.{skill.unlockLevel}
                        </span>
                      ) : isMax ? (
                        <span className="mb-tag mb-tag--olive">MAX</span>
                      ) : (
                        <PriceButton
                          cost={cost}
                          currency="gold"
                          disabled={!canAfford || busyId !== null}
                          onClick={() => void handleUpgrade(skill.id)}
                          title={unlocked ? `Améliorer (${cost} Or)` : `Débloquer (${cost} Or)`}
                        />
                      )}

                      {skill.category === 'active' && unlocked && (
                        <button
                          type="button"
                          className={`btn btn--sm ${isEquipped ? 'btn--jade' : 'btn--primary'}`}
                          disabled={busyId !== null}
                          onClick={() => void handleToggleEquip(skill.id)}
                          style={{ minHeight: 32, padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          {isEquipped ? (
                            <>
                              <Check size={13} />
                              Équipée
                            </>
                          ) : (
                            'Équiper'
                          )}
                        </button>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};
