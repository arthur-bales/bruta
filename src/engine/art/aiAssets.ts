// ============================================================================
// BRUTE LEGENDS — Real AI-Generated Asset Catalog & Resolvers
// ============================================================================

import type { EquipmentItem, EquipmentSlot, EquipmentTemplate } from '@shared/types';

export const AI_HERO_SPRITESHEET = {
  key: 'ai_hero_sheet',
  url: '/assets/spritesheets/hero_ai_spritesheet.png',
  frameWidth: 256,
  frameHeight: 256,
  cols: 4,
  rows: 11,
};

export const AI_HERO_POSES = {
  idle: '/assets/ai/hero/idle.png',
  idle_alt: '/assets/ai/hero/idle_alt.png',
  walk: '/assets/ai/hero/walk.png',
  run: '/assets/ai/hero/run.png',
  attack_windup: '/assets/ai/hero/attack_windup.png',
  attack: '/assets/ai/hero/attack.png',
  heavy_attack: '/assets/ai/hero/heavy_attack.png',
  hit: '/assets/ai/hero/hit.png',
  dodge: '/assets/ai/hero/dodge.png',
  block: '/assets/ai/hero/block.png',
  victory: '/assets/ai/hero/victory.png',
  defeat: '/assets/ai/hero/defeat.png',
  special: '/assets/ai/hero/special.png',
} as const;

export const AI_DUMMY_ASSET = {
  key: 'ai_training_dummy',
  url: '/assets/ai/dummy.png',
};

export const AI_RIVALS: Record<string, { key: string; url: string }> = {
  caillou: { key: 'ai_rival_caillou', url: '/assets/ai/rivals/caillou.png' },
  kenshi: { key: 'ai_rival_kenshi', url: '/assets/ai/rivals/kenshi.png' },
  grog: { key: 'ai_rival_grog', url: '/assets/ai/rivals/grog.png' },
  kitsune: { key: 'ai_rival_kitsune', url: '/assets/ai/rivals/kitsune.png' },
  ignis: { key: 'ai_rival_ignis', url: '/assets/ai/rivals/ignis.png' },
  draconis: { key: 'ai_rival_draconis', url: '/assets/ai/rivals/draconis.png' },
};

export const AI_WEAPONS: Record<string, { key: string; url: string }> = {
  wooden_club: { key: 'ai_w_wooden_club', url: '/assets/ai/weapons/wooden_club.png' },
  frying_pan: { key: 'ai_w_frying_pan', url: '/assets/ai/weapons/frying_pan.png' },
  broadsword: { key: 'ai_w_broadsword', url: '/assets/ai/weapons/broadsword.png' },
  katana: { key: 'ai_w_katana', url: '/assets/ai/weapons/katana.png' },
  battle_axe: { key: 'ai_w_battle_axe', url: '/assets/ai/weapons/battle_axe.png' },
  war_hammer: { key: 'ai_w_battle_axe', url: '/assets/ai/weapons/battle_axe.png' },
  dragon_spear: { key: 'ai_w_mythic_scythe', url: '/assets/ai/weapons/mythic_scythe.png' },
  crystal_blade: { key: 'ai_w_broadsword', url: '/assets/ai/weapons/broadsword.png' },
  mythic_scythe: { key: 'ai_w_mythic_scythe', url: '/assets/ai/weapons/mythic_scythe.png' },
};

export const AI_GEAR_ICONS: Record<string, string> = {
  headband: '/assets/ai/gear/headband.png',
  viking_helm: '/assets/ai/gear/viking_helm.png',
  samurai_kabuto: '/assets/ai/gear/samurai_kabuto.png',
  knight_visor: '/assets/ai/gear/viking_helm.png',
  shadow_hood: '/assets/ai/gear/headband.png',
  dragon_crown: '/assets/ai/gear/samurai_kabuto.png',
  halo_crest: '/assets/ai/gear/samurai_kabuto.png',
  armor_tunic: '/assets/ai/gear/armor_tunic.png',
  flame_fists: '/assets/ai/gear/flame_fists.png',
  scarf_boots: '/assets/ai/gear/scarf_boots.png',
};

export const AI_CHESTS: Record<string, string> = {
  chest_dojo: '/assets/ai/chests/chest_wood.png',
  chest_epic: '/assets/ai/chests/chest_epic.png',
  chest_mythic: '/assets/ai/chests/chest_mythic.png',
  wood: '/assets/ai/chests/chest_wood.png',
  epic: '/assets/ai/chests/chest_epic.png',
  mythic: '/assets/ai/chests/chest_mythic.png',
};

export function resolveRivalSprite(idOrName: string): { key: string; url: string } {
  const low = idOrName.toLowerCase();
  if (low.includes('caillou') || low.includes('bambou') || low.includes('paille')) return AI_RIVALS.caillou;
  if (low.includes('kenshi') || low.includes('samour') || low.includes('ryu') || low.includes('kaito') || low.includes('dojo')) return AI_RIVALS.kenshi;
  if (low.includes('grog') || low.includes('colosse') || low.includes('viking') || low.includes('brutus') || low.includes('titan')) return AI_RIVALS.grog;
  if (low.includes('kitsune') || low.includes('sakura') || low.includes('ombre') || low.includes('ninja') || low.includes('hana')) return AI_RIVALS.kitsune;
  if (low.includes('ignis') || low.includes('volcan') || low.includes('flamme') || low.includes('pyro')) return AI_RIVALS.ignis;
  if (low.includes('dracon') || low.includes('empereur') || low.includes('zenith') || low.includes('légende')) return AI_RIVALS.draconis;
  // Deterministic hash across the 6 AI rival sprites
  let h = 0;
  for (let i = 0; i < low.length; i++) h = (h * 31 + low.charCodeAt(i)) >>> 0;
  const list = Object.values(AI_RIVALS);
  return list[h % list.length];
}

export function resolveWeaponSprite(visualType?: string | null): { key: string; url: string } | null {
  if (!visualType || visualType === 'fists') return null;
  return AI_WEAPONS[visualType] ?? AI_WEAPONS.broadsword;
}

export function resolveItemIconUrl(item: Pick<EquipmentItem | EquipmentTemplate, 'slot' | 'visualType'>): string {
  const slot: EquipmentSlot = item.slot;
  if (slot === 'weapon') {
    return resolveWeaponSprite(item.visualType)?.url ?? AI_WEAPONS.wooden_club.url;
  }
  if (slot === 'helmet') {
    return AI_GEAR_ICONS[item.visualType] ?? AI_GEAR_ICONS.headband;
  }
  if (slot === 'armor') {
    return AI_GEAR_ICONS.armor_tunic;
  }
  if (slot === 'gloves') {
    return AI_GEAR_ICONS.flame_fists;
  }
  return AI_GEAR_ICONS.scarf_boots;
}

export function resolveChestIconUrl(chestIdOrRarity: string): string {
  const low = chestIdOrRarity.toLowerCase();
  if (low.includes('myth') || low.includes('legend')) return AI_CHESTS.mythic;
  if (low.includes('epic') || low.includes('rare') || low.includes('argent')) return AI_CHESTS.epic;
  return AI_CHESTS.wood;
}
