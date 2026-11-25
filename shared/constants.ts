import type {
  AnimationName,
  EquipmentSlot,
  EyeStyle,
  FighterAppearance,
  HairStyle,
  Rarity,
} from './types';

export const GAME_TITLE = 'Brute Legends';

export const MAX_EQUIPPED_ACTIVE_SKILLS = 3;
export const MAX_INVENTORY_SIZE = 60;
export const MAX_FORGE_LEVEL = 10;
export const MAX_ENERGY = 20;
export const ENERGY_REGEN_MS = 120_000; // 1 energy every 2 minutes
export const STAT_POINTS_PER_LEVEL = 4;

export const ALL_ANIMATIONS: AnimationName[] = [
  'idle',
  'walk',
  'run',
  'attack',
  'heavy_attack',
  'hit',
  'dodge',
  'block',
  'victory',
  'defeat',
  'special',
];

export interface AnimationFrameSpec {
  name: AnimationName;
  row: number;
  frames: number;
  frameRate: number;
  repeat: number; // -1 for loop, 0 for play once
  label: string;
}

export const SPRITE_FRAME_SIZE = 160; // crisp 160x160 grid cells for chibi + oversized weapons
export const SPRITE_MAX_COLS = 8;

export const ANIMATION_SPECS: Record<AnimationName, AnimationFrameSpec> = {
  idle:         { name: 'idle',         row: 0,  frames: 6, frameRate: 8,  repeat: -1, label: 'Repos (Idle)' },
  walk:         { name: 'walk',         row: 1,  frames: 6, frameRate: 10, repeat: -1, label: 'Marche (Walk)' },
  run:          { name: 'run',          row: 2,  frames: 6, frameRate: 14, repeat: -1, label: 'Course (Run)' },
  attack:       { name: 'attack',       row: 3,  frames: 6, frameRate: 15, repeat: 0,  label: 'Attaque' },
  heavy_attack: { name: 'heavy_attack', row: 4,  frames: 8, frameRate: 14, repeat: 0,  label: 'Attaque Lourde' },
  hit:          { name: 'hit',          row: 5,  frames: 4, frameRate: 12, repeat: 0,  label: 'Coup Reçu' },
  dodge:        { name: 'dodge',        row: 6,  frames: 6, frameRate: 16, repeat: 0,  label: 'Esquive' },
  block:        { name: 'block',        row: 7,  frames: 4, frameRate: 12, repeat: 0,  label: 'Blocage' },
  victory:      { name: 'victory',      row: 8,  frames: 6, frameRate: 10, repeat: -1, label: 'Victoire' },
  defeat:       { name: 'defeat',       row: 9,  frames: 6, frameRate: 8,  repeat: 0,  label: 'Défaite' },
  special:      { name: 'special',      row: 10, frames: 8, frameRate: 14, repeat: 0,  label: 'Spécial !' },
};

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; bg: string; border: string; statMult: number; sellMult: number; weight: number }
> = {
  common: {
    label: 'Commun',
    color: '#5a6370',
    bg: '#f0efe9',
    border: '#b8b4a8',
    statMult: 1.0,
    sellMult: 0.35,
    weight: 50,
  },
  rare: {
    label: 'Rare',
    color: '#1d72c9',
    bg: '#e5f2ff',
    border: '#4fa3f7',
    statMult: 1.35,
    sellMult: 0.4,
    weight: 28,
  },
  epic: {
    label: 'Épique',
    color: '#9b30c9',
    bg: '#f7e9ff',
    border: '#c76cf2',
    statMult: 1.8,
    sellMult: 0.45,
    weight: 14,
  },
  legendary: {
    label: 'Légendaire',
    color: '#d97706',
    bg: '#fff3d6',
    border: '#f59e0b',
    statMult: 2.45,
    sellMult: 0.5,
    weight: 6.5,
  },
  mythic: {
    label: 'Mythique',
    color: '#dc2626',
    bg: '#ffe4e6',
    border: '#f43f5e',
    statMult: 3.3,
    sellMult: 0.55,
    weight: 1.5,
  },
};

export const SLOT_LABELS: Record<EquipmentSlot, { label: string; icon: string }> = {
  weapon: { label: 'Arme', icon: '⚔️' },
  helmet: { label: 'Casque', icon: '🪖' },
  armor: { label: 'Armure', icon: '🛡️' },
  gloves: { label: 'Gants', icon: '🥊' },
  boots: { label: 'Bottes', icon: '👢' },
  accessory: { label: 'Accessoire', icon: '🧣' },
};

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'spiky', label: 'Pointes Shonen' },
  { id: 'bob', label: 'Carré Dynamique' },
  { id: 'ponytail', label: 'Queue Haute' },
  { id: 'mohawk', label: 'Crête Rebelle' },
  { id: 'twin_tails', label: 'Couettes Turbo' },
  { id: 'samurai_bun', label: 'Chignon Samouraï' },
  { id: 'curly', label: 'Boucles Touffues' },
  { id: 'bald_bandana', label: 'Bandana Dojo' },
];

export const EYE_STYLES: { id: EyeStyle; label: string }[] = [
  { id: 'determined', label: 'Déterminé' },
  { id: 'cheerful', label: 'Souriant' },
  { id: 'fierce', label: 'Féroce' },
  { id: 'starry', label: 'Étoilé' },
  { id: 'cool', label: 'Zen / Cool' },
];

export const SKIN_PALETTE = [
  '#ffe1c6',
  '#f8c8a0',
  '#e5a578',
  '#c68052',
  '#8d5534',
  '#633924',
];

export const HAIR_PALETTE = [
  '#2c221e',
  '#d9483b',
  '#f59e0b',
  '#2563eb',
  '#10b981',
  '#ec4899',
  '#f8fafc',
  '#7c3aed',
];

export const OUTFIT_PALETTE = [
  { primary: '#e85d3f', secondary: '#ffd166', label: 'Flamme' },
  { primary: '#2b7de9', secondary: '#f8fafc', label: 'Azur' },
  { primary: '#22a06b', secondary: '#fef08a', label: 'Jade' },
  { primary: '#d97706', secondary: '#451a03', label: 'Tigre' },
  { primary: '#db2777', secondary: '#fce7f3', label: 'Sakura' },
  { primary: '#374151', secondary: '#ef4444', label: 'Ombre' },
];

export const DEFAULT_APPEARANCE: FighterAppearance = {
  skinColor: '#f8c8a0',
  hairStyle: 'spiky',
  hairColor: '#2c221e',
  eyeStyle: 'determined',
  eyeColor: '#2563eb',
  outfitPrimary: '#e85d3f',
  outfitSecondary: '#ffd166',
  warCry: 'En garde !',
};

export function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.48) + 40 * (level - 1));
}
