import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, RefreshCw, Sparkles, Coins, Gem, Check, X } from 'lucide-react';
import type { EquipmentItem, ShopStockItem } from '@shared/types';
import { RARITY_META, SLOT_LABELS } from '@shared/constants';
import { CHEST_OFFERS, type ChestOffer } from '@shared/progression';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { resolveChestIconUrl, resolveItemIconUrl } from '@/engine/art/aiAssets';

export const ShopView: React.FC = () => {
  const {
    fighter,
    effectiveGold,
    applyFighterUpdate,
    equipItem,
    flushClicks,
    addToast,
  } = useGame();

  const [stock, setStock] = useState<ShopStockItem[]>([]);
  const [chests, setChests] = useState<ChestOffer[]>(CHEST_OFFERS);
  const [refreshCost, setRefreshCost] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealedItem, setRevealedItem] = useState<EquipmentItem | null>(null);

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

  const handleOpenChest = async (chest: ChestOffer) => {
    setBusyId(chest.id);
    try {
      await flushClicks();
      const res = await apiClient.openChest(chest.id);
      applyFighterUpdate(res.fighter);
      soundEngine.play('chest');
      setRevealedItem(res.item);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ressources insuffisantes.', 'error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <ShoppingBag size={26} color="var(--accent-flame)" />
            Boutique & Coffres Mystères
          </h1>
          <p className="view-subtitle">
            Tente ta chance aux coffres légendaires ou équipe-toi directement sur l’étalage rotatif !
          </p>
        </div>

        <button
          type="button"
          className="btn btn--gold btn--sm"
          disabled={busyId !== null || effectiveGold < refreshCost}
          onClick={() => void handleRefreshStock()}
        >
          <RefreshCw size={15} />
          Actualiser • 🪙 {refreshCost}
        </button>
      </div>

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
              background: RARITY_META[revealedItem.rarity].bg,
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
              style={{
                width: 92,
                height: 92,
                margin: '0 auto',
                borderRadius: 18,
                background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6 100%)',
                border: `3px solid ${RARITY_META[revealedItem.rarity].border}`,
                boxShadow: '0 4px 0 var(--ink-strong)',
                display: 'grid',
                placeItems: 'center',
                padding: 8,
              }}
            >
              <img
                src={resolveItemIconUrl(revealedItem)}
                alt={revealedItem.name}
                width={68}
                height={68}
                style={{
                  width: 68,
                  height: 68,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 3px 3px rgba(35, 25, 23, 0.25))',
                }}
              />
            </div>
            <span
              className="badge"
              style={{
                background: '#ffffff',
                color: RARITY_META[revealedItem.rarity].color,
                borderColor: RARITY_META[revealedItem.rarity].border,
                marginTop: 8,
              }}
            >
              <Sparkles size={13} />
              {RARITY_META[revealedItem.rarity].label.toUpperCase()}
            </span>
            <h2 style={{ fontSize: '1.5rem', marginTop: 8 }}>{revealedItem.name}</h2>
            <p style={{ margin: '6px 0 12px', fontWeight: 700, fontSize: '0.88rem' }}>
              {revealedItem.description}
            </p>

            <div className="item-card__stats" style={{ justifyContent: 'center', marginBottom: 16 }}>
              {revealedItem.bonusAttack ? (
                <span className="stat-tag">⚔️ +{revealedItem.bonusAttack} ATQ</span>
              ) : null}
              {revealedItem.bonusDefense ? (
                <span className="stat-tag">🛡️ +{revealedItem.bonusDefense} DÉF</span>
              ) : null}
              {revealedItem.bonusHp ? (
                <span className="stat-tag">❤️ +{revealedItem.bonusHp} PV</span>
              ) : null}
              {Object.entries(revealedItem.baseStats).map(([k, v]) =>
                v ? (
                  <span key={k} className="stat-tag">
                    {k.toUpperCase()} +{v}
                  </span>
                ) : null,
              )}
              {revealedItem.specialEffect && (
                <span className="stat-tag stat-tag--effect">
                  ✨ {revealedItem.specialEffect.label}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn--jade"
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

      {/* Mystery Chests */}
      <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: '1.18rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} color="#d97706" />
          Coffres Mystères
        </h2>

        <div className="grid-cards">
          {chests.map((chest) => {
            const canAfford =
              chest.currency === 'gold'
                ? effectiveGold >= chest.price
                : fighter.gems >= chest.price;

            return (
              <div
                key={chest.id}
                className="item-card"
                style={{
                  background: 'linear-gradient(180deg, #fffdf6 0%, #fff2d6 100%)',
                  borderColor: chest.accentColor,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 108,
                      borderRadius: 14,
                      background:
                        'radial-gradient(circle at 50% 55%, #ffffff 0%, #ffefc2 75%, #ffe09e 100%)',
                      border: `2.5px solid ${chest.accentColor}`,
                      boxShadow: 'inset 0 -3px 0 rgba(35, 25, 23, 0.12)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <img
                      src={resolveChestIconUrl(chest.id)}
                      alt={chest.name}
                      width={88}
                      height={88}
                      style={{
                        width: 88,
                        height: 88,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 5px rgba(35, 25, 23, 0.28))',
                      }}
                    />
                  </div>
                  <div>
                    <div className="item-card__name" style={{ fontSize: '1.05rem' }}>
                      {chest.name}
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: RARITY_META[chest.minRarity].bg,
                        color: RARITY_META[chest.minRarity].color,
                        fontSize: '0.7rem',
                        marginTop: 4,
                      }}
                    >
                      Min. {RARITY_META[chest.minRarity].label}
                    </span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-body)' }}>
                  {chest.description}
                </p>

                <button
                  type="button"
                  className={`btn ${chest.currency === 'gems' ? 'btn--sky' : 'btn--gold'}`}
                  disabled={!canAfford || busyId !== null}
                  onClick={() => void handleOpenChest(chest)}
                  style={{ marginTop: 'auto', width: '100%' }}
                >
                  {chest.currency === 'gold' ? <Coins size={17} /> : <Gem size={17} />}
                  {busyId === chest.id
                    ? 'Ouverture…'
                    : `Ouvrir • ${chest.price.toLocaleString('fr-FR')} ${
                        chest.currency === 'gold' ? 'Or' : 'Gemmes'
                      }`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rotating 6-Item Stock */}
      <div className="comic-card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: '1.18rem' }}>Étalage du Marchand (6 objets)</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, fontWeight: 800 }}>
            Chargement de l’étalage…
          </div>
        ) : (
          <div className="grid-cards">
            {stock.map((entry) => {
              const tpl = entry.item;
              const rarity = RARITY_META[tpl.rarity];
              const canAfford = effectiveGold >= entry.priceGold;

              return (
                <div
                  key={entry.stockId}
                  className="item-card"
                  style={{
                    background: entry.sold ? '#f1f5f9' : rarity.bg,
                    borderColor: entry.sold ? '#94a3b8' : rarity.border,
                    opacity: entry.sold ? 0.68 : 1,
                  }}
                >
                  <div className="item-card__header" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 14,
                          background: 'radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6 100%)',
                          border: `2.5px solid ${entry.sold ? '#94a3b8' : rarity.border}`,
                          boxShadow: '0 2px 0 var(--ink-strong)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          padding: 4,
                        }}
                      >
                        <img
                          src={resolveItemIconUrl(tpl)}
                          alt={tpl.name}
                          width={54}
                          height={54}
                          style={{
                            width: 54,
                            height: 54,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 2px rgba(35, 25, 23, 0.22))',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            color: rarity.color,
                            textTransform: 'uppercase',
                          }}
                        >
                          {SLOT_LABELS[tpl.slot].label} • {rarity.label}
                        </div>
                        <div className="item-card__name">{tpl.name}</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: '#ffffff', fontSize: '0.72rem', flexShrink: 0 }}>
                      Niv.{tpl.minLevel}+
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-body)' }}>
                    {tpl.description}
                  </p>

                  <div className="item-card__stats">
                    {tpl.bonusAttack ? <span className="stat-tag">⚔️ +{tpl.bonusAttack} ATQ</span> : null}
                    {tpl.bonusDefense ? <span className="stat-tag">🛡️ +{tpl.bonusDefense} DÉF</span> : null}
                    {tpl.bonusHp ? <span className="stat-tag">❤️ +{tpl.bonusHp} PV</span> : null}
                    {Object.entries(tpl.baseStats).map(([k, v]) =>
                      v ? (
                        <span key={k} className="stat-tag">
                          {k.toUpperCase()} +{v}
                        </span>
                      ) : null,
                    )}
                    {tpl.specialEffect && (
                      <span className="stat-tag stat-tag--effect">✨ {tpl.specialEffect.label}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`btn btn--sm ${!entry.sold && canAfford ? 'btn--primary' : ''}`}
                    disabled={entry.sold || !canAfford || busyId !== null}
                    onClick={() => void handleBuyStock(entry)}
                    style={{ marginTop: 'auto', width: '100%' }}
                  >
                    {entry.sold
                      ? 'VENDU ✓'
                      : busyId === entry.stockId
                        ? 'Achat…'
                        : `Acheter • 🪙 ${entry.priceGold.toLocaleString('fr-FR')} Or`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
