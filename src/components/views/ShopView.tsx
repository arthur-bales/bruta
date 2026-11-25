import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles, Check, X, Heart } from 'lucide-react';
import type { EquipmentItem, FighterGender, ShopStockItem } from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import { CHEST_OFFERS, type ChestOffer } from '@shared/progression';
import { SKINS_CATALOG, getDefaultSkinForGender } from '@shared/skinsCatalog';
import { CoinPill, MbRow, PriceButton, SectionCard, formatCompact } from '@/components/ui/BruteUI';
import { GameIcon } from '@/components/ui/GameIcon';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { resolveChestIconUrl, resolveItemIconUrl } from '@/engine/art/aiAssets';

const SKIN_FILTER_OPTIONS: { id: 'all' | FighterGender; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'male', label: 'Homme' },
  { id: 'female', label: 'Femme' },
];

export const ShopView: React.FC = () => {
  const {
    fighter,
    effectiveGold,
    applyFighterUpdate,
    equipItem,
    buySkin,
    equipSkin,
    flushClicks,
    addToast,
  } = useGame();

  const [stock, setStock] = useState<ShopStockItem[]>([]);
  const [chests, setChests] = useState<ChestOffer[]>(CHEST_OFFERS);
  const [refreshCost, setRefreshCost] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealedItem, setRevealedItem] = useState<EquipmentItem | null>(null);
  const [skinFilter, setSkinFilter] = useState<'all' | FighterGender>(() => fighter?.gender ?? 'male');

  const loadShop = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getShop();
      setStock(res.stock);
      if (res.chests?.length) setChests(res.chests);
      if (typeof res.refreshCostGold === 'number') setRefreshCost(res.refreshCostGold);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur de chargement de la boutique.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  if (!fighter) return null;

  const defaultSkinId = getDefaultSkinForGender(fighter.gender);
  const unlockedSkins = fighter.unlockedSkins ?? [defaultSkinId];
  const equippedSkinId = fighter.equippedSkinId ?? defaultSkinId;
  const visibleSkins =
    skinFilter === 'all'
      ? SKINS_CATALOG
      : SKINS_CATALOG.filter((skin) => skin.gender === skinFilter);

  const handleBuySkin = async (skinId: string) => {
    setBusyId(skinId);
    try {
      await buySkin(skinId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant pour ce skin.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleEquipSkin = async (skinId: string) => {
    setBusyId(skinId);
    try {
      await equipSkin(skinId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible d’équiper ce skin.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenChest = async (chest: ChestOffer) => {
    setBusyId(chest.id);
    try {
      await flushClicks();
      const res = await apiClient.openChest(chest.id);
      applyFighterUpdate(res.fighter);
      soundEngine.play('chest');
      setRevealedItem(res.item);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleBuyStock = async (entry: ShopStockItem) => {
    setBusyId(entry.stockId);
    try {
      await flushClicks();
      const res = await apiClient.buyShopItem(entry.stockId);
      applyFighterUpdate(res.fighter);
      setStock(res.stock);
      soundEngine.play('coin');
      setRevealedItem(res.item);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Achat impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRefreshStock = async () => {
    setBusyId('refresh');
    try {
      await flushClicks();
      const res = await apiClient.refreshShop();
      applyFighterUpdate(res.fighter);
      setStock(res.stock);
      soundEngine.play('click');
      addToast('Nouvel arrivage disponible en boutique !', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Or insuffisant pour actualiser.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickEquipRevealed = async () => {
    if (!revealedItem) return;
    try {
      await equipItem(revealedItem.uid);
      setRevealedItem(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible d’équiper.', 'error');
    }
  };

  return (
    <div className="arsenal-view">
      {/* Loot Reveal Modal */}
      {revealedItem && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Objet obtenu"
          onClick={() => setRevealedItem(null)}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: 440,
              textAlign: 'center',
              background: 'linear-gradient(180deg, #fffdf4 0%, #f6e7bf 100%)',
              borderColor: RARITY_META[revealedItem.rarity].border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setRevealedItem(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="arsenal-icon-frame"
              style={{
                width: 96,
                height: 96,
                margin: '0 auto',
                borderWidth: 3,
                borderColor: RARITY_META[revealedItem.rarity].border,
                padding: 8,
              }}
            >
              <img
                src={resolveItemIconUrl(revealedItem)}
                alt={revealedItem.name}
                width={74}
                height={74}
              />
            </div>

            <span
              className="badge"
              style={{
                background: '#fffdf3',
                color: RARITY_META[revealedItem.rarity].color,
                borderColor: RARITY_META[revealedItem.rarity].border,
                marginTop: 10,
              }}
            >
              <Sparkles size={13} />
              {RARITY_META[revealedItem.rarity].label.toUpperCase()}
            </span>

            <h2
              className="mb-section-title"
              style={{ fontSize: '1.45rem', marginTop: 8 }}
            >
              {revealedItem.name}
            </h2>
            <p className="mb-flavor" style={{ margin: '6px 0 12px', fontSize: '0.9rem' }}>
              {revealedItem.description}
            </p>

            <div className="arsenal-stat-tags" style={{ justifyContent: 'center', marginBottom: 16 }}>
              {revealedItem.bonusAttack ? (
                <span
                  className="arsenal-stat-tag"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <GameIcon name="sword" size={13} />+{revealedItem.bonusAttack} ATQ
                </span>
              ) : null}
              {revealedItem.bonusDefense ? (
                <span
                  className="arsenal-stat-tag"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <GameIcon name="iron_armor" size={13} />+{revealedItem.bonusDefense} DÉF
                </span>
              ) : null}
              {revealedItem.bonusHp ? (
                <span
                  className="arsenal-stat-tag"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Heart size={12} fill="#d0412a" color="#8b1e14" />+{revealedItem.bonusHp} PV
                </span>
              ) : null}
              {Object.entries(revealedItem.baseStats).map(([k, v]) =>
                v ? (
                  <span key={k} className="arsenal-stat-tag">
                    {k.toUpperCase()} +{v}
                  </span>
                ) : null,
              )}
              {revealedItem.specialEffect && (
                <span
                  className="arsenal-stat-tag arsenal-stat-tag--effect"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Sparkles size={12} color="#d97706" />
                  {revealedItem.specialEffect.label}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleQuickEquipRevealed()}
              >
                <Check size={17} />
                Équiper direct !
              </button>
              <button type="button" className="btn" onClick={() => setRevealedItem(null)}>
                Garder au sac
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fighter Skins Store */}
      <SectionCard
        title="Skins de Combattant"
        right={
          <>
            <span className="mb-tag mb-tag--olive">
              {unlockedSkins.length}/{SKINS_CATALOG.length} débloqués
            </span>
            <CoinPill value={formatCompact(effectiveGold)} kind="gold" />
          </>
        }
      >
        <div className="arsenal-pills" style={{ marginBottom: 12 }}>
          {SKIN_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`arsenal-pill arsenal-pill--sub ${skinFilter === opt.id ? 'arsenal-pill--active' : ''}`}
              onClick={() => {
                soundEngine.play('click');
                setSkinFilter(opt.id);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="shop-skins-grid">
          {visibleSkins.map((skin) => {
            const isUnlocked = unlockedSkins.includes(skin.id);
            const isEquipped = equippedSkinId === skin.id;
            const rarityMeta = RARITY_META[skin.rarity];
            const canAfford = effectiveGold >= skin.priceGold;
            const genderLabel = skin.gender === 'female' ? 'Femme' : 'Homme';

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
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: 5,
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        background: '#fffdf3',
                        color: rarityMeta.color,
                        borderColor: rarityMeta.border,
                        fontSize: '0.7rem',
                      }}
                    >
                      {rarityMeta.label}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: skin.gender === 'female' ? '#fff0f6' : '#eef6ff',
                        color: skin.gender === 'female' ? '#a62c65' : '#235c9c',
                        borderColor: skin.gender === 'female' ? '#d98cb1' : '#8cb3dc',
                        fontSize: '0.7rem',
                      }}
                    >
                      {genderLabel}
                    </span>
                  </div>
                </div>

                <p className="shop-skin-card__desc">{skin.description}</p>

                <div className="shop-skin-card__footer">
                  {isEquipped ? (
                    <span className="mb-tag mb-tag--olive shop-skin-card__equipped-badge">
                      ÉQUIPÉ ✓
                    </span>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--sky"
                      disabled={busyId !== null}
                      onClick={() => void handleEquipSkin(skin.id)}
                      style={{ width: '100%' }}
                    >
                      {busyId === skin.id ? '…' : 'ÉQUIPER'}
                    </button>
                  ) : (
                    <PriceButton
                      cost={busyId === skin.id ? '…' : skin.priceGold}
                      currency="gold"
                      disabled={!canAfford || busyId !== null}
                      onClick={() => void handleBuySkin(skin.id)}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Mystery Chests */}
      <SectionCard
        title="Coffres Mystères"
        right={<CoinPill value={formatCompact(effectiveGold)} kind="gold" />}
      >
        <div className="shop-chests-grid">
          {chests.map((chest) => {
            const canAfford = effectiveGold >= chest.price;
            const minMeta = RARITY_META[chest.minRarity];

            return (
              <div
                key={chest.id}
                className="shop-chest-card"
                style={{ borderColor: chest.accentColor }}
              >
                <div className="shop-chest-card__stage">
                  <img
                    src={resolveChestIconUrl(chest.id)}
                    alt={chest.name}
                    width={88}
                    height={88}
                  />
                </div>

                <div>
                  <div className="shop-chest-card__name">{chest.name}</div>
                  <span
                    className="badge"
                    style={{
                      background: '#fffdf3',
                      color: minMeta.color,
                      borderColor: minMeta.border,
                      fontSize: '0.72rem',
                      marginTop: 4,
                    }}
                  >
                    Min. {minMeta.label}
                  </span>
                </div>

                <p className="shop-chest-card__desc">{chest.description}</p>

                <PriceButton
                  cost={busyId === chest.id ? '…' : chest.price}
                  currency="gold"
                  disabled={!canAfford || busyId !== null}
                  onClick={() => void handleOpenChest(chest)}
                  style={{ marginTop: 'auto', width: '100%' }}
                />
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Daily Rotating Stock */}
      <SectionCard
        title="Étalage du Marchand"
        right={
          <button
            type="button"
            className="btn btn--sm btn--gold"
            disabled={busyId !== null || effectiveGold < refreshCost}
            onClick={() => void handleRefreshStock()}
            title={`Actualiser l’étalage pour ${refreshCost} Or`}
          >
            <RefreshCw size={14} />
            Actualiser ({formatCompact(refreshCost)})
          </button>
        }
      >
        {loading ? (
          <div className="arsenal-empty-box">
            <span className="mb-flavor">Chargement de l’étalage…</span>
          </div>
        ) : (
          <div className="shop-stock-grid">
            {stock.map((entry) => {
              const tpl = entry.item;
              const rarity = RARITY_META[tpl.rarity];
              const canAfford = effectiveGold >= entry.priceGold;

              return (
                <MbRow
                  key={entry.stockId}
                  className="shop-stock-row"
                  state={entry.sold ? 'locked' : 'default'}
                  icon={
                    <img
                      src={resolveItemIconUrl(tpl)}
                      alt={tpl.name}
                      style={{ padding: 3 }}
                    />
                  }
                  title={tpl.name}
                  level={`Niv.${tpl.minLevel}+`}
                  desc={
                    <div className="mb-stack mb-stack--sm" style={{ gap: 5, marginTop: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          className="parchment-item-card__meta"
                          style={{ color: rarity.color }}
                        >
                          {SLOT_LABELS[tpl.slot].label} • {rarity.label}
                        </span>
                      </div>
                      <span>{tpl.description}</span>
                      <div className="arsenal-stat-tags">
                        {tpl.bonusAttack ? (
                          <span
                            className="arsenal-stat-tag"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <GameIcon name="sword" size={13} />+{tpl.bonusAttack} ATQ
                          </span>
                        ) : null}
                        {tpl.bonusDefense ? (
                          <span
                            className="arsenal-stat-tag"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <GameIcon name="iron_armor" size={13} />+{tpl.bonusDefense} DÉF
                          </span>
                        ) : null}
                        {tpl.bonusHp ? (
                          <span
                            className="arsenal-stat-tag"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Heart size={12} fill="#d0412a" color="#8b1e14" />+{tpl.bonusHp} PV
                          </span>
                        ) : null}
                        {Object.entries(tpl.baseStats).map(([k, v]) =>
                          v ? (
                            <span key={k} className="arsenal-stat-tag">
                              {k.toUpperCase()} +{v}
                            </span>
                          ) : null,
                        )}
                        {tpl.specialEffect && (
                          <span
                            className="arsenal-stat-tag arsenal-stat-tag--effect"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Sparkles size={12} color="#d97706" />
                            {tpl.specialEffect.label}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                  right={
                    <div className="shop-stock-row__right">
                      {entry.sold ? (
                        <span className="mb-tag mb-tag--olive">VENDU ✓</span>
                      ) : (
                        <PriceButton
                          cost={busyId === entry.stockId ? '…' : entry.priceGold}
                          currency="gold"
                          disabled={!canAfford || busyId !== null}
                          onClick={() => void handleBuyStock(entry)}
                        />
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
