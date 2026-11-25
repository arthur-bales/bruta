// ============================================================================
// BRUTE LEGENDS — Shared Domain Contract (Frontend, Phaser Engine & Backend)
// ============================================================================

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type EquipmentSlot =
  | 'weapon'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'accessory';

export type AnimationName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'heavy_attack'
  | 'hit'
  | 'dodge'
  | 'block'
  | 'victory'
  | 'defeat'
  | 'special';

export type ArenaTheme = 'coliseum' | 'dojo' | 'volcano';

export type HairStyle =
  | 'spiky'
  | 'bob'
  | 'ponytail'
  | 'mohawk'
  | 'twin_tails'
  | 'samurai_bun'
  | 'curly'
  | 'bald_bandana';

export type EyeStyle = 'determined' | 'cheerful' | 'fierce' | 'starry' | 'cool';

export type WeaponVisualType =
  | 'fists'
  | 'wooden_club'
  | 'broadsword'
  | 'katana'
  | 'battle_axe'
  | 'war_hammer'
  | 'dragon_spear'
  | 'crystal_blade'
  | 'mythic_scythe'
  | 'frying_pan';

export type HelmetVisualType =
  | 'none'
  | 'headband'
  | 'viking_helm'
  | 'samurai_kabuto'
  | 'knight_visor'
  | 'shadow_hood'
  | 'dragon_crown'
  | 'halo_crest';

export type ArmorVisualType =
  | 'tunic'
  | 'gi_martial'
  | 'leather_vest'
  | 'iron_plate'
  | 'samurai_do'
  | 'dragon_scale'
  | 'mythic_aegis';

export type GlovesVisualType =
  | 'none'
  | 'wraps'
  | 'leather_gloves'
  | 'iron_gauntlets'
  | 'flame_fists'
  | 'titan_claws';

export type BootsVisualType =
  | 'sandals'
  | 'leather_boots'
  | 'iron_greaves'
  | 'ninja_tabi'
  | 'wing_boots'
  | 'mythic_striders';

export type AccessoryVisualType =
  | 'none'
  | 'red_scarf'
  | 'hero_cape'
  | 'demon_wings'
  | 'spirit_aura'
  | 'golden_amulet'
  | 'fox_tail';

export interface FighterAppearance {
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
  warCry: string;
}

export interface CoreStats {
  str: number; // Force — dégâts physiques & clic
  def: number; // Défense — réduction dégâts & blocage
  agi: number; // Agilité — vitesse, esquive, double frappe
  vit: number; // Vitalité — PV max & régénération
  lck: number; // Chance — critique, butin, bonus or
}

export interface DerivedStats {
  maxHp: number;
  minDamage: number;
  maxDamage: number;
  defense: number;
  critChance: number;     // 0..0.75
  critMultiplier: number; // e.g. 1.75
  dodgeChance: number;    // 0..0.55
  blockChance: number;    // 0..0.55
  speed: number;          // initiative & attack cadence
  lifesteal: number;      // 0..0.4
  counterChance: number;  // 0..0.4
  thornsPercent: number;  // 0..0.35
  powerScore: number;     // overall combat rating
}

export type SpecialEffectType =
  | 'vampirism'
  | 'counter'
  | 'thorns'
  | 'crit_surge'
  | 'bleed'
  | 'shield_start'
  | 'gold_boost'
  | 'click_boost';

export interface EquipmentSpecialEffect {
  type: SpecialEffectType;
  value: number; // percentage or flat value
  label: string;
}

export interface EquipmentTemplate {
  templateId: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  description: string;
  visualType:
    | WeaponVisualType
    | HelmetVisualType
    | ArmorVisualType
    | GlovesVisualType
    | BootsVisualType
    | AccessoryVisualType;
  primaryColor: string;
  accentColor: string;
  baseStats: Partial<CoreStats>;
  bonusHp?: number;
  bonusAttack?: number;
  bonusDefense?: number;
  specialEffect?: EquipmentSpecialEffect;
  buyPrice: number;
  minLevel: number;
}

export interface EquipmentItem extends EquipmentTemplate {
  uid: string;
  upgradeLevel: number; // 0..10 forge upgrades
  acquiredAt: number;
}

export type EquippedGear = Record<EquipmentSlot, EquipmentItem | null>;

export type SkillCategory = 'active' | 'passive';

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  icon: string;
  color: string;
  maxLevel: number;
  unlockLevel: number;
  baseCostGold: number;
  costScale: number;
  // Active skill parameters
  rageCost?: number; // 0..100
  damageMultiplier?: number;
  healPercent?: number;
  hits?: number;
  stunTurns?: number;
  buffStat?: keyof CoreStats;
  buffAmount?: number;
  // Passive skill parameters
  passiveBonuses?: {
    str?: number;
    def?: number;
    agi?: number;
    vit?: number;
    lck?: number;
    critChance?: number;
    dodgeChance?: number;
    blockChance?: number;
    lifesteal?: number;
    clickDamagePercent?: number;
    goldPercent?: number;
  };
}

export type UpgradeCategory = 'click' | 'auto' | 'dojo';

export interface UpgradeDefinition {
  id: string;
  name: string;
  category: UpgradeCategory;
  description: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effectPerLevel: number;
  effectLabel: string;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  type: 'mission' | 'achievement';
  metric:
    | 'totalClicks'
    | 'arenaWins'
    | 'arenaBattles'
    | 'pvpWins'
    | 'level'
    | 'itemsOwned'
    | 'skillsUnlocked'
    | 'upgradesBought'
    | 'totalGoldEarned'
    | 'bossesDefeated';
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardXp: number;
  icon: string;
}

export interface DailyRewardDefinition {
  day: number; // 1..7
  title: string;
  gold: number;
  gems: number;
  xp: number;
  chestRarity?: Rarity;
  icon: string;
}

export interface PlayerProgressStats {
  totalClicks: number;
  arenaBattles: number;
  arenaWins: number;
  arenaLosses: number;
  pvpWins: number;
  pvpLosses: number;
  bossesDefeated: number;
  totalGoldEarned: number;
  upgradesBought: number;
  highestCombo: number;
  winStreak: number;
  bestWinStreak: number;
  defeatedOpponentIds?: string[];
}

export interface PlayerSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0..1
  battleSpeed: 1 | 2;
  reducedMotion: boolean;
}

export interface FighterProfile {
  id: string;
  name: string;
  title: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  lastEnergyUpdate: number;
  rating: number; // Arena Elo rating
  statPoints: number;
  baseStats: CoreStats;
  appearance: FighterAppearance;
  equipped: EquippedGear;
  inventory: EquipmentItem[];
  skills: Record<string, number>; // skillId -> level
  equippedSkills: string[];       // max 3 active skill IDs
  upgrades: Record<string, number>; // upgradeId -> level
  claimedMissions: string[];
  dailyStreak: number;            // 0..7
  lastDailyClaimDate: string | null; // YYYY-MM-DD
  progress: PlayerProgressStats;
  settings: PlayerSettings;
  createdAt: number;
  lastActiveAt: number;
  isCustomized: boolean;
}

export interface OpponentDefinition {
  id: string;
  name: string;
  title: string;
  level: number;
  rating: number;
  isBoss: boolean;
  isPlayerGhost?: boolean;
  arena: ArenaTheme;
  baseStats: CoreStats;
  appearance: FighterAppearance;
  equipped: EquippedGear;
  activeSkills: { id: string; level: number }[];
  rewardGold: number;
  rewardXp: number;
  lootChance: number;
  lootMinRarity: Rarity;
  tagline: string;
}

// ============================================================================
// Combat Simulation Timeline (Shared between Server & Phaser 3 ArenaScene)
// ============================================================================

export type CombatSide = 'left' | 'right';

export type CombatEventType =
  | 'battle_start'
  | 'move_in'
  | 'attack'
  | 'heavy_attack'
  | 'special'
  | 'counter'
  | 'bleed_tick'
  | 'heal'
  | 'dodge'
  | 'block'
  | 'victory';

export interface CombatEvent {
  seq: number;
  turn: number;
  type: CombatEventType;
  actor: CombatSide;
  target: CombatSide;
  actorAnim: AnimationName;
  targetAnim: AnimationName;
  damage: number;
  heal: number;
  isCrit: boolean;
  isDodged: boolean;
  isBlocked: boolean;
  skillId?: string;
  skillName?: string;
  vfxType?: 'slash' | 'heavy_smash' | 'special_burst' | 'block_spark' | 'heal_aura' | 'bleed' | 'counter';
  leftHp: number;
  leftMaxHp: number;
  leftRage: number;
  rightHp: number;
  rightMaxHp: number;
  rightRage: number;
  logText: string;
}

export interface CombatFighterSnapshot {
  id: string;
  name: string;
  title: string;
  level: number;
  appearance: FighterAppearance;
  equipped: EquippedGear;
  derived: DerivedStats;
}

export interface BattleResult {
  battleId: string;
  seed: number;
  arena: ArenaTheme;
  winner: CombatSide;
  totalTurns: number;
  left: CombatFighterSnapshot;
  right: CombatFighterSnapshot;
  events: CombatEvent[];
  rewards: {
    gold: number;
    xp: number;
    gems: number;
    ratingDelta: number;
    leveledUp: boolean;
    newLevel: number;
    lootItem: EquipmentItem | null;
  };
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  title: string;
  level: number;
  rating: number;
  powerScore: number;
  wins: number;
  losses: number;
  isBot: boolean;
  appearance: FighterAppearance;
  equipped: EquippedGear;
}

export interface AuthUserSummary {
  id: string;
  username: string;
  email: string | null;
  isGuest: boolean;
}

export interface OfflineEarningsSummary {
  secondsAway: number;
  goldEarned: number;
  xpEarned: number;
}

export interface ShopStockItem {
  stockId: string;
  templateId: string;
  item: EquipmentTemplate;
  priceGold: number;
  sold: boolean;
}

export interface GameSessionPayload {
  token?: string;
  user: AuthUserSummary;
  fighter: FighterProfile;
  offlineEarnings: OfflineEarningsSummary | null;
  storageMode: 'postgres' | 'local';
}

export type ActiveView =
  | 'home'
  | 'profile'
  | 'arena'
  | 'clicker'
  | 'inventory'
  | 'shop'
  | 'skills'
  | 'upgrades'
  | 'leaderboard'
  | 'missions'
  | 'settings';
