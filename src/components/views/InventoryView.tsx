import React, { useMemo, useState } from 'react';
import { Hammer, Coins, ArrowUpRight, ShieldOff, Sparkles, Swords } from 'lucide-react';
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
import { PriceButton, SectionCard, formatCompact } from '@/components/ui/BruteUI';
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
    <div className="arsenal-stat-tags">
      {tags.map((t) => (
        <span key={t} className="arsenal-stat-tag">
          {t}
        </span>
      ))}
      {eff.specialEffect && (
        <span className="arsenal-stat-tag arsenal-stat-tag--effect">
          ✨ {eff.specialEffect.label}
        </span>
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
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
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

  const activeSelectedSlot: EquipmentSlot | null =
    selectedSlot && fighter.equipped[selectedSlot]
      ? selectedSlot
      : SLOTS_LIST.find((s) => Boolean(fighter.equipped[s])) ?? null;

  const selectedEquippedItem = activeSelectedSlot ? fighter.equipped[activeSelectedSlot] : null;

  const triggerShowcaseAnim = (anim: AnimationName) => {
    setPreviewAnim((prev) => ({ anim, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const handleEquip = async (uid: string, slot: EquipmentSlot) => {
    setBusyUid(uid);
    try {
      await equipItem(uid);
      setSelectedSlot(slot);
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
      if (selectedSlot === slot) setSelectedSlot(null);
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

  const handleWoodSlotClick = (slot: EquipmentSlot) => {
    const item = fighter.equipped[slot];
    if (!item) return;
    soundEngine.play('click');
    if (activeSelectedSlot === slot) {
      void handleUnequip(slot);
    } else {
      setSelectedSlot(slot);
    }
  };

  const equippedCount = SLOTS_LIST.filter((s) => Boolean(fighter.equipped[s])).length;

  return (
    <div className="arsenal-view">
      {/* Top Grid: Wooden Plank Equipment Board + Live Fighter Preview */}
      <div className="arsenal-top-grid">
        <SectionCard
          title="Armes & Équipement Équipés"
          right={
            <>
              <span className="mb-tag mb-tag--orange">
                ⚔️ Puissance {formatCompact(derivedStats.powerScore)}
              </span>
              <span className="mb-tag">{equippedCount}/6</span>
            </>
          }
        >
          <div className="wood-board arsenal-wood-board">
            {SLOTS_LIST.map((slot) => {
              const item = fighter.equipped[slot];
              const slotMeta = SLOT_LABELS[slot];

              if (!item) {
                return (
                  <div key={slot} className="wood-slot wood-slot--empty">
                    <span className="wood-slot__empty-icon" aria-hidden="true">
                      {slotMeta.icon}
                    </span>
                    <span className="wood-slot__label">{slotMeta.label}</span>
                  </div>
                );
              }

              const rarity = RARITY_META[item.rarity];
              const isSelected = activeSelectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  className={`wood-slot wood-slot--filled ${isSelected ? 'wood-slot--selected' : ''}`}
                  style={{ borderColor: rarity.border }}
                  onClick={() => handleWoodSlotClick(slot)}
                  disabled={busyUid !== null}
                  title={
                    isSelected
                      ? `${item.name} — Cliquer à nouveau pour retirer dans le sac`
                      : `${item.name} (${rarity.label}) — Cliquer pour inspecter`
                  }
                >
                  {item.upgradeLevel > 0 && (
                    <span className="wood-slot__forge">+{item.upgradeLevel}</span>
                  )}
                  <span
                    className="wood-slot__rarity-dot"
                    style={{ background: rarity.border }}
                    aria-hidden="true"
                  />
                  <img
                    src={resolveItemIconUrl(item)}
                    alt={item.name}
                    className="wood-slot__img"
                    width={56}
                    height={56}
                  />
                  <span className="wood-slot__label">{item.name}</span>
                </button>
              );
            })}
          </div>

          {selectedEquippedItem && activeSelectedSlot ? (
            (() => {
              const rarity = RARITY_META[selectedEquippedItem.rarity];
              const forgeCost = getForgeUpgradeCost(selectedEquippedItem);
              const isMax = selectedEquippedItem.upgradeLevel >= MAX_FORGE_LEVEL;
              const canForge = !isMax && effectiveGold >= forgeCost;

              return (
                <div className="equipped-inspector" style={{ borderColor: rarity.border }}>
                  <div className="equipped-inspector__top">
                    <div
                      className="arsenal-icon-frame"
                      style={{ borderColor: rarity.border, width: 52, height: 52 }}
                    >
                      <img
                        src={resolveItemIconUrl(selectedEquippedItem)}
                        alt={selectedEquippedItem.name}
                        width={42}
                        height={42}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="parchment-item-card__meta" style={{ color: rarity.color }}>
                        {SLOT_LABELS[activeSelectedSlot].label} • {rarity.label}
                      </div>
                      <div className="parchment-item-card__title">
                        {selectedEquippedItem.name}
                        {selectedEquippedItem.upgradeLevel > 0 && (
                          <span style={{ color: 'var(--accent-flame)', marginLeft: 5 }}>
                            +{selectedEquippedItem.upgradeLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={busyUid !== null}
                      onClick={() => void handleUnequip(activeSelectedSlot)}
                      title="Retirer dans le sac"
                    >
                      <ShieldOff size={14} />
                      Retirer
                    </button>
                  </div>

                  {renderItemStatTags(selectedEquippedItem)}

                  <div className="equipped-inspector__actions">
                    <span className="mb-flavor" style={{ fontSize: '0.84rem', flex: 1 }}>
                      Clique sur un emplacement du tableau pour sélectionner ou retirer.
                    </span>
                    {isMax ? (
                      <span className="mb-tag mb-tag--olive">FORGE MAX +{MAX_FORGE_LEVEL}</span>
                    ) : (
                      <PriceButton
                        cost={forgeCost}
                        disabled={!canForge || busyUid !== null}
                        onClick={() => void handleForge(selectedEquippedItem.uid)}
                        title={`Forger +1 pour ${forgeCost} Or`}
                      />
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="mb-flavor" style={{ margin: '10px 0 0', fontSize: '0.88rem' }}>
              Aucun objet équipé sur le tableau. Choisis une pièce dans ton sac ci-dessous !
            </p>
          )}
        </SectionCard>

        {/* Live Fighter Preview */}
        <SectionCard
          title="Aperçu de ta Brute"
          right={
            <button
              type="button"
              className="btn btn--sm btn--sky"
              onClick={() => {
                soundEngine.play('click');
                setActiveView('shop');
              }}
            >
              <Sparkles size={14} />
              Boutique
            </button>
          }
        >
          <div className="arsenal-stage">
            <PhaserCanvas
              mode="showcase"
              arena={homeArena}
              fighter={{ appearance: fighter.appearance, equipped: fighter.equipped }}
              previewAnim={previewAnim}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            <span className="mb-flavor" style={{ fontSize: '0.86rem' }}>
              Forge tes armes jusqu’à +{MAX_FORGE_LEVEL} !
            </span>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => {
                soundEngine.play('hit');
                triggerShowcaseAnim('attack');
              }}
            >
              <Swords size={14} />
              Tester l’arme
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Backpack Section */}
      <SectionCard
        title="Sac à Dos & Forge"
        right={
          <span className="mb-tag">
            Sac : {fighter.inventory.length}/{MAX_INVENTORY_SIZE}
          </span>
        }
      >
        <div className="mb-stack mb-stack--sm" style={{ marginBottom: 12 }}>
          {/* Slot Filter Pills */}
          <div className="arsenal-pills">
            <button
              type="button"
              className={`arsenal-pill ${slotFilter === 'all' ? 'arsenal-pill--active' : ''}`}
              onClick={() => {
                soundEngine.play('click');
                setSlotFilter('all');
              }}
            >
              Tous ({fighter.inventory.length})
            </button>
            {SLOTS_LIST.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`arsenal-pill ${slotFilter === slot ? 'arsenal-pill--active' : ''}`}
                onClick={() => {
                  soundEngine.play('click');
                  setSlotFilter(slot);
                }}
              >
                <span>{SLOT_LABELS[slot].icon}</span>
                {SLOT_LABELS[slot].label}
              </button>
            ))}
          </div>

          {/* Rarity Filter Sub-Pills */}
          <div className="arsenal-pills">
            <button
              type="button"
              className={`arsenal-pill arsenal-pill--sub ${rarityFilter === 'all' ? 'arsenal-pill--active' : ''}`}
              onClick={() => setRarityFilter('all')}
            >
              Toutes raretés
            </button>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                className={`arsenal-pill arsenal-pill--sub ${rarityFilter === r ? 'arsenal-pill--active' : ''}`}
                onClick={() => setRarityFilter(r)}
              >
                {RARITY_META[r].label}
              </button>
            ))}
          </div>
        </div>

        {filteredBackpack.length === 0 ? (
          <div className="arsenal-empty-box">
            <strong className="mb-section-title mb-section-title--sm">
              Aucun objet dans ce filtre
            </strong>
            <span className="mb-flavor" style={{ fontSize: '0.88rem' }}>
              Combats dans l’Arène ou ouvre des coffres à la Boutique pour agrandir ton arsenal !
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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
          <div className="arsenal-items-grid">
            {filteredBackpack.map((item) => {
              const rarity = RARITY_META[item.rarity];
              const equippedInSlot = fighter.equipped[item.slot];
              const diff = Math.round(computeItemScore(item) - computeItemScore(equippedInSlot));
              const forgeCost = getForgeUpgradeCost(item);
              const sellValue = getItemSellValue(item);
              const isMax = item.upgradeLevel >= MAX_FORGE_LEVEL;
              const canForge = !isMax && effectiveGold >= forgeCost;

              const diffClass = !equippedInSlot || diff > 0
                ? 'diff-pill--up'
                : diff < 0
                  ? 'diff-pill--down'
                  : 'diff-pill--same';

              return (
                <article
                  key={item.uid}
                  className="parchment-item-card"
                  style={{ borderColor: rarity.border }}
                >
                  <div className="parchment-item-card__head">
                    <div className="parchment-item-card__ident">
                      <div className="arsenal-icon-frame" style={{ borderColor: rarity.border }}>
                        <img
                          src={resolveItemIconUrl(item)}
                          alt={item.name}
                          width={48}
                          height={48}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="parchment-item-card__meta" style={{ color: rarity.color }}>
                          {SLOT_LABELS[item.slot].label} • {rarity.label}
                        </div>
                        <div className="parchment-item-card__title">
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
                      className={`diff-pill ${diffClass}`}
                      title="Comparaison avec l’objet équipé sur cet emplacement"
                    >
                      {!equippedInSlot ? 'Nouveau' : diff >= 0 ? `+${diff}` : `${diff}`}
                    </span>
                  </div>

                  <p className="parchment-item-card__desc">{item.description}</p>

                  {renderItemStatTags(item)}

                  <div className="parchment-item-card__actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      disabled={busyUid !== null}
                      onClick={() => void handleEquip(item.uid, item.slot)}
                      style={{ flex: 1 }}
                    >
                      <ArrowUpRight size={15} />
                      Équiper
                    </button>

                    {isMax ? (
                      <button type="button" className="btn btn--sm" disabled>
                        <Hammer size={13} />
                        MAX
                      </button>
                    ) : (
                      <PriceButton
                        cost={forgeCost}
                        disabled={!canForge || busyUid !== null}
                        onClick={() => void handleForge(item.uid)}
                        title={`Forger +1 pour ${forgeCost} Or`}
                        style={{ minHeight: 36, padding: '4px 10px', fontSize: '0.88rem' }}
                      />
                    )}

                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={busyUid !== null}
                      onClick={() => void handleSell(item.uid)}
                      title={`Vendre pour +${sellValue} Or`}
                    >
                      <Coins size={14} />+{formatCompact(sellValue)}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
