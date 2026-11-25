import React, { useMemo, useState } from 'react';
import { Backpack, Hammer, Coins, ArrowUpRight, ShieldOff, Sparkles } from 'lucide-react';
import type { AnimationName, EquipmentItem, EquipmentSlot, Rarity } from '@shared/types';
import {
  MAX_FORGE_LEVEL,
  MAX_INVENTORY_SIZE,
  RARITY_META,
  SLOT_LABELS,
} from '@shared/constants';
import {
  getEffectiveItemStats,
  getForgeUpgradeCost,
  getItemSellValue,
  RARITY_ORDER,
} from '@shared/equipmentCatalog';
import { PhaserCanvas } from '@/components/phaser/PhaserCanvas';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { resolveItemIconUrl } from '@/engine/art/aiAssets';

const SLOTS_LIST: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'accessory',
];

function computeItemScore(item: EquipmentItem | null): number {
  if (!item) return 0;
  const eff = getEffectiveItemStats(item);
  return (
    eff.stats.str * 3 +
    eff.stats.def * 2.5 +
    eff.stats.agi * 2.5 +
    eff.stats.vit * 2.5 +
    eff.stats.lck * 2 +
    eff.bonusAttack * 2.5 +
    eff.bonusDefense * 2 +
    eff.bonusHp * 0.45 +
    (eff.specialEffect ? eff.specialEffect.value * 2 : 0)
  );
}

function renderItemStatTags(item: EquipmentItem) {
  const eff = getEffectiveItemStats(item);
  const tags: string[] = [];
  if (eff.bonusAttack > 0) tags.push(`⚔️ +${eff.bonusAttack} ATQ`);
  if (eff.bonusDefense > 0) tags.push(`🛡️ +${eff.bonusDefense} DÉF`);
  if (eff.bonusHp > 0) tags.push(`❤️ +${eff.bonusHp} PV`);
  if (eff.stats.str > 0) tags.push(`FOR +${eff.stats.str}`);
  if (eff.stats.def > 0) tags.push(`DÉF +${eff.stats.def}`);
  if (eff.stats.agi > 0) tags.push(`AGI +${eff.stats.agi}`);
  if (eff.stats.vit > 0) tags.push(`VIT +${eff.stats.vit}`);
  if (eff.stats.lck > 0) tags.push(`CHA +${eff.stats.lck}`);

  return (
    <div className="item-card__stats">
      {tags.map((t) => (
        <span key={t} className="stat-tag">
          {t}
        </span>
      ))}
      {eff.specialEffect && (
        <span className="stat-tag stat-tag--effect">✨ {eff.specialEffect.label}</span>
      )}
    </div>
  );
}

export const InventoryView: React.FC = () => {
  const {
    fighter,
    derivedStats,
    effectiveGold,
    homeArena,
    equipItem,
    unequipItem,
    forgeItem,
    sellItem,
    addToast,
    setActiveView,
  } = useGame();

  const [slotFilter, setSlotFilter] = useState<'all' | EquipmentSlot>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | Rarity>('all');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [previewAnim, setPreviewAnim] = useState<{ anim: AnimationName; nonce: number } | null>(null);

  const filteredBackpack = useMemo(() => {
    if (!fighter) return [];
    return fighter.inventory
      .filter((item) => (slotFilter === 'all' ? true : item.slot === slotFilter))
      .filter((item) => (rarityFilter === 'all' ? true : item.rarity === rarityFilter))
      .sort((a, b) => computeItemScore(b) - computeItemScore(a));
  }, [fighter, slotFilter, rarityFilter]);

  if (!fighter || !derivedStats) return null;

  const triggerShowcaseAnim = (anim: AnimationName) => {
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const handleEquip = async (uid: string) => {
    setBusyUid(uid);
    try {
      await equipItem(uid);
      triggerShowcaseAnim('victory');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible d’équiper cet objet.', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleUnequip = async (slot: EquipmentSlot) => {
    setBusyUid(`unequip_${slot}`);
    try {
      await unequipItem(slot);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Sac plein ou erreur.', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleForge = async (uid: string) => {
    setBusyUid(`forge_${uid}`);
    try {
      await forgeItem(uid);
      triggerShowcaseAnim('special');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant pour forger.', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleSell = async (uid: string) => {
    setBusyUid(`sell_${uid}`);
    try {
      await sellItem(uid);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de vendre.', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Backpack size={26} color="var(--accent-flame)" />
            Équipement & Forge
          </h1>
          <p className="view-subtitle">
            Chaque objet équipé apparaît directement sur ta brute ! Forge tes pièces jusqu’à +10 pour décupler ta puissance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: '#ffd152', fontSize: '0.86rem', padding: '6px 12px' }}>
            Puissance : {derivedStats.powerScore}
          </span>
          <span className="badge" style={{ background: '#e0f2fe', fontSize: '0.86rem', padding: '6px 12px' }}>
            Sac : {fighter.inventory.length}/{MAX_INVENTORY_SIZE}
          </span>
        </div>
      </div>

      {/* Top Grid: Live Fighter Showcase | 6 Equipped Slots */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="stage-frame stage-frame--hero">
            <PhaserCanvas
              mode="showcase"
              arena={homeArena}
              fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
              previewAnim={previewAnim}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
              Aperçu visuel en temps réel
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  soundEngine.play('hit');
                  triggerShowcaseAnim('attack');
                }}
              >
                ⚔️ Tester l’arme
              </button>
              <button
                type="button"
                className="btn btn--sm btn--sky"
                onClick={() => {
                  soundEngine.play('click');
                  setActiveView('shop');
                }}
              >
                <Sparkles size={15} />
                Boutique
              </button>
            </div>
          </div>
        </div>

        <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: '1.14rem' }}>Emplacements Équipés (6)</h2>
          <div className="equip-slots-grid">
            {SLOTS_LIST.map((slot) => {
              const item = fighter.equipped[slot];
              const slotMeta = SLOT_LABELS[slot];

              if (!item) {
                return (
                  <div
                    key={slot}
                    className="item-card"
                    style={{
                      background: 'var(--bg-parchment)',
                      borderStyle: 'dashed',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      minHeight: 132,
                    }}
                  >
                    <div style={{ fontSize: '1.5rem' }}>{slotMeta.icon}</div>
                    <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>
                      {slotMeta.label}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
                      Vide
                    </span>
                  </div>
                );
              }

              const rarity = RARITY_META[item.rarity];
              const forgeCost = getForgeUpgradeCost(item);
              const canForge = item.upgradeLevel < MAX_FORGE_LEVEL && effectiveGold >= forgeCost;

              return (
                <div
                  key={slot}
                  className="item-card"
                  style={{ background: rarity.bg, borderColor: rarity.border }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6 100%)',
                        border: `2px solid ${rarity.border}`,
                        boxShadow: '0 2px 0 var(--ink-strong)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        padding: 2,
                      }}
                    >
                      <img
                        src={resolveItemIconUrl(item)}
                        alt={item.name}
                        width={52}
                        height={52}
                        style={{
                          width: 52,
                          height: 52,
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 2px 2px rgba(35, 25, 23, 0.22))',
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: rarity.color,
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                        }}
                      >
                        {slotMeta.label}
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: '#ffffff',
                          color: rarity.color,
                          borderColor: rarity.border,
                          fontSize: '0.64rem',
                          padding: '1px 6px',
                          marginTop: 3,
                        }}
                      >
                        {rarity.label}
                      </span>
                    </div>
                  </div>

                  <div className="item-card__name">
                    {item.name}
                    {item.upgradeLevel > 0 && (
                      <span style={{ color: 'var(--accent-flame)', marginLeft: 4 }}>
                        +{item.upgradeLevel}
                      </span>
                    )}
                  </div>

                  {renderItemStatTags(item)}

                  <div style={{ display: 'flex', gap: 5, marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn--sm ${canForge ? 'btn--gold' : ''}`}
                      disabled={item.upgradeLevel >= MAX_FORGE_LEVEL || !canForge || busyUid !== null}
                      onClick={() => void handleForge(item.uid)}
                      style={{ flex: 1, fontSize: '0.76rem', padding: '5px 8px' }}
                      title={`Forger +1 (${forgeCost} Or)`}
                    >
                      <Hammer size={13} />
                      {item.upgradeLevel >= MAX_FORGE_LEVEL ? 'MAX' : `+1 (${forgeCost})`}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={busyUid !== null}
                      onClick={() => void handleUnequip(slot)}
                      style={{ padding: '5px 8px' }}
                      title="Retirer dans le sac"
                    >
                      <ShieldOff size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backpack Section */}
      <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h2 style={{ fontSize: '1.16rem' }}>
            Sac à Dos ({filteredBackpack.length} affiché(s) / {fighter.inventory.length})
          </h2>
        </div>

        {/* Slot Filter */}
        <div className="tabs-bar" style={{ marginBottom: 4 }}>
          <button
            type="button"
            className={`tab-btn ${slotFilter === 'all' ? 'tab-btn--active' : ''}`}
            style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={() => setSlotFilter('all')}
          >
            Tous les types
          </button>
          {SLOTS_LIST.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`tab-btn ${slotFilter === slot ? 'tab-btn--active' : ''}`}
              style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => setSlotFilter(slot)}
            >
              {SLOT_LABELS[slot].icon} {SLOT_LABELS[slot].label}
            </button>
          ))}
        </div>

        {/* Rarity Filter */}
        <div className="tabs-bar" style={{ marginBottom: 4 }}>
          <button
            type="button"
            className={`tab-btn ${rarityFilter === 'all' ? 'tab-btn--active' : ''}`}
            style={{ minHeight: 32, padding: '3px 10px', fontSize: '0.76rem' }}
            onClick={() => setRarityFilter('all')}
          >
            Toutes raretés
          </button>
          {RARITY_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              className={`tab-btn ${rarityFilter === r ? 'tab-btn--active' : ''}`}
              style={{ minHeight: 32, padding: '3px 10px', fontSize: '0.76rem' }}
              onClick={() => setRarityFilter(r)}
            >
              {RARITY_META[r].label}
            </button>
          ))}
        </div>

        {filteredBackpack.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '28px 14px',
              borderRadius: 14,
              background: 'var(--bg-parchment)',
              border: '2px dashed var(--ink-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
              Aucun objet ne correspond à ce filtre.
            </strong>
            <span style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
              Gagne des combats dans l’Arène ou ouvre des coffres à la Boutique pour remplir ton sac !
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() => setActiveView('arena')}
              >
                Aller en Arène
              </button>
              <button
                type="button"
                className="btn btn--sm btn--gold"
                onClick={() => setActiveView('shop')}
              >
                Ouvrir la Boutique
              </button>
            </div>
          </div>
        ) : (
          <div className="grid-cards">
            {filteredBackpack.map((item) => {
              const rarity = RARITY_META[item.rarity];
              const equippedInSlot = fighter.equipped[item.slot];
              const diff = Math.round(computeItemScore(item) - computeItemScore(equippedInSlot));
              const forgeCost = getForgeUpgradeCost(item);
              const sellValue = getItemSellValue(item);
              const canForge = item.upgradeLevel < MAX_FORGE_LEVEL && effectiveGold >= forgeCost;

              return (
                <div
                  key={item.uid}
                  className="item-card"
                  style={{ background: rarity.bg, borderColor: rarity.border }}
                >
                  <div className="item-card__header" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 13,
                          background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6 100%)',
                          border: `2.5px solid ${rarity.border}`,
                          boxShadow: '0 2px 0 var(--ink-strong)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          padding: 3,
                        }}
                      >
                        <img
                          src={resolveItemIconUrl(item)}
                          alt={item.name}
                          width={52}
                          height={52}
                          style={{
                            width: 52,
                            height: 52,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 2px rgba(35, 25, 23, 0.22))',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: rarity.color, textTransform: 'uppercase' }}>
                          {SLOT_LABELS[item.slot].label} • {rarity.label}
                        </div>
                        <div className="item-card__name">
                          {item.name}
                          {item.upgradeLevel > 0 && (
                            <span style={{ color: 'var(--accent-flame)', marginLeft: 4 }}>
                              +{item.upgradeLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        background: diff > 0 ? '#dcfce7' : diff < 0 ? '#fee2e2' : '#f1f5f9',
                        color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#475569',
                        fontSize: '0.72rem',
                        flexShrink: 0,
                      }}
                      title="Comparaison avec l’objet actuellement équipé sur cet emplacement"
                    >
                      {!equippedInSlot ? 'Nouveau' : diff >= 0 ? `+${diff} pts` : `${diff} pts`}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--ink-body)', fontWeight: 700 }}>
                    {item.description}
                  </p>

                  {renderItemStatTags(item)}

                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--jade"
                      disabled={busyUid !== null}
                      onClick={() => void handleEquip(item.uid)}
                      style={{ flex: 1 }}
                    >
                      <ArrowUpRight size={15} />
                      Équiper
                    </button>

                    <button
                      type="button"
                      className={`btn btn--sm ${canForge ? 'btn--gold' : ''}`}
                      disabled={item.upgradeLevel >= MAX_FORGE_LEVEL || !canForge || busyUid !== null}
                      onClick={() => void handleForge(item.uid)}
                      title={`Forger +1 pour ${forgeCost} Or`}
                    >
                      <Hammer size={14} />
                      {item.upgradeLevel >= MAX_FORGE_LEVEL ? 'MAX' : forgeCost}
                    </button>

                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={busyUid !== null}
                      onClick={() => void handleSell(item.uid)}
                      title={`Vendre pour +${sellValue} Or`}
                    >
                      <Coins size={14} />+{sellValue}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
