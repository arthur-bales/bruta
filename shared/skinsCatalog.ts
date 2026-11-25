// ============================================================================
// BRUTE LEGENDS — Exclusive Male & Female Playable Skins (No Opponent Reuse)
// Every skin has its own full 11-animation 256x256 spritesheet + weapon grip!
// ============================================================================

import type { FighterGender, SkinDefinition } from './types.js';

export const DEFAULT_MALE_SKIN_ID = 'skin_male_dojo';
export const DEFAULT_FEMALE_SKIN_ID = 'skin_female_dojo';
export const DEFAULT_SKIN_ID = DEFAULT_MALE_SKIN_ID;

export const SKINS_CATALOG: SkinDefinition[] = [
  // ---- Exclusive Male Skins ----
  {
    id: 'skin_male_dojo',
    name: 'Brute du Dojo',
    title: 'Combattant Classique',
    description: 'Tenue écarlate traditionnelle du dojo et bandages de combat.',
    gender: 'male',
    rarity: 'common',
    priceGold: 0,
    previewUrl: '/assets/ai/skins/skin_male_dojo_preview.png',
    spritesheetKey: 'ai_skin_male_dojo',
    spritesheetUrl: '/assets/ai/skins/skin_male_dojo_sheet.webp',
  },
  {
    id: 'skin_male_azur',
    name: 'Chevalier d’Azur',
    title: 'Garde Royal',
    description: 'Tunique bleu cobalt, cheveux argentés et ceinture d’or impériale.',
    gender: 'male',
    rarity: 'rare',
    priceGold: 350,
    previewUrl: '/assets/ai/skins/skin_male_azur_preview.png',
    spritesheetKey: 'ai_skin_male_azur',
    spritesheetUrl: '/assets/ai/skins/skin_male_azur_sheet.webp',
  },
  {
    id: 'skin_male_jade',
    name: 'Ronin de Jade',
    title: 'Maître Émeraude',
    description: 'Tenue de combat émeraude forgée pour les duels d’élite du dojo.',
    gender: 'male',
    rarity: 'epic',
    priceGold: 1100,
    previewUrl: '/assets/ai/skins/skin_male_jade_preview.png',
    spritesheetKey: 'ai_skin_male_jade',
    spritesheetUrl: '/assets/ai/skins/skin_male_jade_sheet.webp',
  },
  {
    id: 'skin_male_viking',
    name: 'Berserker Nordique',
    title: 'Fureur du Nord',
    description: 'Casque à cornes, fourrure de loup et barbe flamboyante des guerriers du fjord.',
    gender: 'male',
    rarity: 'legendary',
    priceGold: 2200,
    previewUrl: '/assets/ai/skins/skin_male_viking_preview.png',
    spritesheetKey: 'ai_skin_male_viking',
    spritesheetUrl: '/assets/ai/skins/skin_male_viking_sheet.webp',
  },
  {
    id: 'skin_male_obsidian',
    name: 'Seigneur d’Obsidienne',
    title: 'Champion Mythique',
    description: 'Armure d’obsidienne à pointes, cape carmin déchirée et poings enflammés.',
    gender: 'male',
    rarity: 'mythic',
    priceGold: 4500,
    previewUrl: '/assets/ai/skins/skin_male_obsidian_preview.png',
    spritesheetKey: 'ai_skin_male_obsidian',
    spritesheetUrl: '/assets/ai/skins/skin_male_obsidian_sheet.webp',
  },

  // ---- Exclusive Female Skins ----
  {
    id: 'skin_female_dojo',
    name: 'Guerrière du Dojo',
    title: 'Combattante Classique',
    description: 'Tunique de combat écarlate, queue de cheval haute et ruban du dojo.',
    gender: 'female',
    rarity: 'common',
    priceGold: 0,
    previewUrl: '/assets/ai/skins/skin_female_dojo_preview.png',
    spritesheetKey: 'ai_skin_female_dojo',
    spritesheetUrl: '/assets/ai/skins/skin_female_dojo_sheet.webp',
  },
  {
    id: 'skin_female_sakura',
    name: 'Kunoichi Sakura',
    title: 'Fleur d’Acier',
    description: 'Tenue rose cerisier, ruban carmin et grâce foudroyante en arène.',
    gender: 'female',
    rarity: 'rare',
    priceGold: 350,
    previewUrl: '/assets/ai/skins/skin_female_sakura_preview.png',
    spritesheetKey: 'ai_skin_female_sakura',
    spritesheetUrl: '/assets/ai/skins/skin_female_sakura_sheet.webp',
  },
  {
    id: 'skin_female_valkyrie',
    name: 'Valkyrie Solaire',
    title: 'Héroïne Dorée',
    description: 'Armure ivoire et or solaire, chevelure dorée et écharpe azur.',
    gender: 'female',
    rarity: 'epic',
    priceGold: 1100,
    previewUrl: '/assets/ai/skins/skin_female_valkyrie_preview.png',
    spritesheetKey: 'ai_skin_female_valkyrie',
    spritesheetUrl: '/assets/ai/skins/skin_female_valkyrie_sheet.webp',
  },
  {
    id: 'skin_female_eclipse',
    name: 'Reine Éclipse',
    title: 'Légende Nocturne',
    description: 'Tunique améthyste royale, cheveux argentés et aura mythique.',
    gender: 'female',
    rarity: 'mythic',
    priceGold: 4500,
    previewUrl: '/assets/ai/skins/skin_female_eclipse_preview.png',
    spritesheetKey: 'ai_skin_female_eclipse',
    spritesheetUrl: '/assets/ai/skins/skin_female_eclipse_sheet.webp',
  },
];

const SKIN_BY_ID: Record<string, SkinDefinition> = Object.fromEntries(
  SKINS_CATALOG.map((skin) => [skin.id, skin]),
);

export function getDefaultSkinForGender(gender: FighterGender = 'male'): string {
  return gender === 'female' ? DEFAULT_FEMALE_SKIN_ID : DEFAULT_MALE_SKIN_ID;
}

export function getSkinById(id: string | undefined, gender: FighterGender = 'male'): SkinDefinition {
  if (id && SKIN_BY_ID[id]) return SKIN_BY_ID[id];
  return SKIN_BY_ID[getDefaultSkinForGender(gender)] ?? SKINS_CATALOG[0];
}
