// ============================================================================
// BRUTE LEGENDS — Real AI-Generated Game Icons (replaces all UI emojis)
// ============================================================================

import React from 'react';

export const GAME_ICON_URLS = {
  // Skills & Dojo icons (sliced from AI sheet)
  dash_boot: '/assets/ai/icons/dash_boot.png',
  whirlwind: '/assets/ai/icons/whirlwind.png',
  warcry: '/assets/ai/icons/warcry.png',
  vampire_drop: '/assets/ai/icons/vampire_drop.png',
  iron_armor: '/assets/ai/icons/iron_armor.png',
  fire_rage: '/assets/ai/icons/fire_rage.png',
  dodge_smoke: '/assets/ai/icons/dodge_smoke.png',
  falcon_eye: '/assets/ai/icons/falcon_eye.png',
  dumbbell: '/assets/ai/icons/dumbbell.png',
  meat_leg: '/assets/ai/icons/meat_leg.png',
  training_dummy: '/assets/ai/icons/training_dummy.png',
  anvil: '/assets/ai/icons/anvil.png',
  hourglass: '/assets/ai/icons/hourglass.png',
  scroll: '/assets/ai/icons/scroll.png',
  magnet: '/assets/ai/icons/magnet.png',
  crown: '/assets/ai/icons/crown.png',

  // Real AI weapons, gear, chests & rivals reused as crisp UI icons
  sword: '/assets/ai/weapons/broadsword.png',
  club: '/assets/ai/weapons/wooden_club.png',
  katana: '/assets/ai/weapons/katana.png',
  axe: '/assets/ai/weapons/battle_axe.png',
  scythe: '/assets/ai/weapons/mythic_scythe.png',
  fist: '/assets/ai/gear/flame_fists.png',
  helm: '/assets/ai/gear/viking_helm.png',
  kabuto: '/assets/ai/gear/samurai_kabuto.png',
  headband: '/assets/ai/gear/headband.png',
  tunic: '/assets/ai/gear/armor_tunic.png',
  boots: '/assets/ai/gear/scarf_boots.png',
  chest_wood: '/assets/ai/chests/chest_wood.png',
  chest_epic: '/assets/ai/chests/chest_epic.png',
  chest_mythic: '/assets/ai/chests/chest_mythic.png',
  boss: '/assets/ai/rivals/ignis.png',
  boss_dragon: '/assets/ai/rivals/draconis.png',

  // Arena thumbnails
  arena_coliseum: '/assets/arenas/coliseum.jpg',
  arena_dojo: '/assets/arenas/dojo.jpg',
  arena_volcano: '/assets/arenas/volcano.jpg',
} as const;

export type GameIconName = keyof typeof GAME_ICON_URLS;

export const SKILL_ICON_MAP: Record<string, GameIconName> = {
  meteor_strike: 'fire_rage',
  furious_whirlwind: 'whirlwind',
  warrior_cry: 'warcry',
  vampiric_blade: 'vampire_drop',
  thunder_bolt: 'dash_boot',
  shadow_dance: 'dodge_smoke',
  steel_skin: 'iron_armor',
  feline_instinct: 'boots',
  hawk_eye: 'falcon_eye',
  titan_heart: 'meat_leg',
  golden_hand: 'magnet',
  dojo_frenzy: 'fist',
};

export const UPGRADE_ICON_MAP: Record<string, GameIconName> = {
  click_steel_fists: 'dumbbell',
  click_strike_gloves: 'fist',
  click_lightning_combo: 'dash_boot',
  click_dojo_crit: 'falcon_eye',
  auto_dummy: 'training_dummy',
  auto_apprentices: 'headband',
  auto_spring_hammer: 'anvil',
  auto_energy_sanctuary: 'hourglass',
  dojo_intensive_training: 'scroll',
  dojo_arena_treasury: 'chest_wood',
  dojo_ancestral_forge: 'anvil',
  dojo_legend_aura: 'crown',
};

export function resolveSkillIconName(skillId: string): GameIconName {
  return SKILL_ICON_MAP[skillId] ?? 'fire_rage';
}

export function resolveUpgradeIconName(upgradeId: string): GameIconName {
  return UPGRADE_ICON_MAP[upgradeId] ?? 'dumbbell';
}

export function resolveArenaIconName(arena: string): GameIconName {
  if (arena === 'dojo') return 'arena_dojo';
  if (arena === 'volcano') return 'arena_volcano';
  return 'arena_coliseum';
}

interface GameIconProps {
  name: GameIconName;
  size?: number;
  alt?: string;
  className?: string;
  rounded?: boolean;
}

export const GameIcon: React.FC<GameIconProps> = ({
  name,
  size = 22,
  alt = '',
  className = '',
  rounded = false,
}) => {
  const isArenaThumb = name.startsWith('arena_');
  return (
    <img
      src={GAME_ICON_URLS[name]}
      alt={alt}
      aria-hidden={alt === ''}
      width={size}
      height={size}
      className={`game-icon ${isArenaThumb || rounded ? 'game-icon--thumb' : ''} ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};
