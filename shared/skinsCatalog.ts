// ============================================================================
// BRUTE LEGENDS — Playable Fighter Skins Catalog (Purchasable with Gold)
// ============================================================================

import type { SkinDefinition } from './types.js';

export const DEFAULT_SKIN_ID = 'skin_hero_dojo';

export const SKINS_CATALOG: SkinDefinition[] = [
  {
    id: 'skin_hero_dojo',
    name: 'Brute du Dojo',
    title: 'Combattant Classique',
    description: 'La tenue traditionnelle du dojo avec bandeau écarlate et bandages de combat.',
    rarity: 'common',
    priceGold: 0,
    previewUrl: '/assets/ai/hero/idle.png',
  },
  {
    id: 'skin_caillou',
    name: 'Caillou Sauvage',
    title: 'Rookie du Sable',
    description: 'Un bagarreur nerveux des fosses de sable, toujours prêt à charger tête baissée.',
    rarity: 'common',
    priceGold: 250,
    previewUrl: '/assets/ai/rivals/caillou.png',
    rivalSpriteKey: 'ai_rival_caillou',
  },
  {
    id: 'skin_kenshi',
    name: 'Kenshi du Bambou',
    title: 'Disciple Samouraï',
    description: 'Tenue de sabreur agile du dojo céleste, lame vive et discipline de fer.',
    rarity: 'rare',
    priceGold: 600,
    previewUrl: '/assets/ai/rivals/kenshi.png',
    rivalSpriteKey: 'ai_rival_kenshi',
  },
  {
    id: 'skin_grog',
    name: 'Grog le Colosse',
    title: 'Broyeur du Colisée',
    description: 'Une montagne de muscles redoutée dans toutes les arènes du royaume.',
    rarity: 'epic',
    priceGold: 1400,
    previewUrl: '/assets/ai/rivals/grog.png',
    rivalSpriteKey: 'ai_rival_grog',
  },
  {
    id: 'skin_kitsune',
    name: 'Kitsune Écarlate',
    title: 'Shinobi des Flammes',
    description: 'Masque renard et aura enflammée : un style aussi fulgurant que redoutable.',
    rarity: 'epic',
    priceGold: 2800,
    previewUrl: '/assets/ai/rivals/kitsune.png',
    rivalSpriteKey: 'ai_rival_kitsune',
  },
  {
    id: 'skin_ignis',
    name: 'Seigneur Ignis',
    title: 'Champion du Volcan',
    description: 'Armure forgée dans la lave vive pour les vétérans des combats extrêmes.',
    rarity: 'legendary',
    priceGold: 5500,
    previewUrl: '/assets/ai/rivals/ignis.png',
    rivalSpriteKey: 'ai_rival_ignis',
  },
  {
    id: 'skin_draconis',
    name: 'Empereur Draconis',
    title: 'Légende Mythique',
    description: 'L’apparence ultime du souverain draconique de l’arène.',
    rarity: 'mythic',
    priceGold: 12000,
    previewUrl: '/assets/ai/rivals/draconis.png',
    rivalSpriteKey: 'ai_rival_draconis',
  },
];

const SKIN_BY_ID: Record<string, SkinDefinition> = Object.fromEntries(
  SKINS_CATALOG.map((skin) => [skin.id, skin]),
);

export function getSkinById(id: string | undefined): SkinDefinition {
  if (id && SKIN_BY_ID[id]) return SKIN_BY_ID[id];
  return SKINS_CATALOG[0];
}
