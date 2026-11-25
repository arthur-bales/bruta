import {
  DEFAULT_APPEARANCE,
  ENERGY_REGEN_MS,
  MAX_ENERGY,
  STAT_POINTS_PER_LEVEL,
  xpRequiredForLevel,
} from './constants.js';
import {
  EQUIPMENT_CATALOG,
  getEffectiveItemStats,
  instantiateEquipment,
} from './equipmentCatalog.js';
import { getSkillDefinition } from './skillsCatalog.js';
import type {
  CoreStats,
  DerivedStats,
  EquipmentSlot,
  EquipmentTemplate,
  EquippedGear,
  FighterProfile,
  OfflineEarningsSummary,
  Rarity,
  ShopStockItem,
} from './types.js';

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'accessory',
];

const MAX_OFFLINE_SECONDS = 8 * 60 * 60; // 8 hours cap
const MIN_OFFLINE_SECONDS = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTitleForLevel(level: number): string {
  if (level >= 30) return 'Légende Immortelle';
  if (level >= 22) return 'Seigneur de l’Arène';
  if (level >= 15) return 'Maître du Dojo';
  if (level >= 10) return 'Champion du Colisée';
  if (level >= 5) return 'Gladiateur Prometteur';
  return 'Novice du Dojo';
}

export function createInitialFighter(id: string, name = 'Brute'): FighterProfile {
  const now = Date.now();
  const starterWeapon = instantiateEquipment('wpn_wooden_club', `starter_wpn_${id}`);
  const starterArmor = instantiateEquipment('arm_tunic', `starter_arm_${id}`);

  return {
    id,
    name: name.trim() || 'Brute',
    title: 'Novice du Dojo',
    level: 1,
    xp: 0,
    xpToNext: xpRequiredForLevel(1),
    gold: 40,
    gems: 10,
    energy: MAX_ENERGY,
    maxEnergy: MAX_ENERGY,
    lastEnergyUpdate: now,
    rating: 1000,
    statPoints: 3,
    baseStats: {
      str: 6,
      def: 5,
      agi: 5,
      vit: 6,
      lck: 5,
    },
    appearance: { ...DEFAULT_APPEARANCE },
    equipped: {
      weapon: starterWeapon,
      helmet: null,
      armor: starterArmor,
      gloves: null,
      boots: null,
      accessory: null,
    },
    inventory: [],
    skills: {},
    equippedSkills: [],
    upgrades: {},
    claimedMissions: [],
    dailyStreak: 0,
    lastDailyClaimDate: null,
    progress: {
      totalClicks: 0,
      arenaBattles: 0,
      arenaWins: 0,
      arenaLosses: 0,
      pvpWins: 0,
      pvpLosses: 0,
      bossesDefeated: 0,
      totalGoldEarned: 40,
      upgradesBought: 0,
      highestCombo: 0,
      winStreak: 0,
      bestWinStreak: 0,
      defeatedOpponentIds: [],
    },
    settings: {
      soundEnabled: true,
      soundVolume: 0.7,
      battleSpeed: 1,
      reducedMotion: false,
    },
    createdAt: now,
    lastActiveAt: now,
    isCustomized: false,
  };
}

export function computeDerivedStats(
  baseStats: CoreStats,
  level: number,
  equipped: EquippedGear,
  skills: Record<string, number> = {},
  upgrades: Record<string, number> = {},
): DerivedStats {
  const total: CoreStats = {
    str: baseStats.str,
    def: baseStats.def,
    agi: baseStats.agi,
    vit: baseStats.vit,
    lck: baseStats.lck,
  };

  let bonusHp = 0;
  let bonusAttack = 0;
  let bonusDefense = 0;
  let bonusCritChance = 0;
  let bonusDodgeChance = 0;
  let bonusBlockChance = 0;
  let bonusLifesteal = 0;
  let bonusCounterChance = 0;
  let bonusThorns = 0;

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipped[slot];
    if (!item) continue;
    const eff = getEffectiveItemStats(item);
    total.str += eff.stats.str;
    total.def += eff.stats.def;
    total.agi += eff.stats.agi;
    total.vit += eff.stats.vit;
    total.lck += eff.stats.lck;
    bonusHp += eff.bonusHp;
    bonusAttack += eff.bonusAttack;
    bonusDefense += eff.bonusDefense;

    if (eff.specialEffect) {
      const val = eff.specialEffect.value / 100;
      switch (eff.specialEffect.type) {
        case 'vampirism':
          bonusLifesteal += val;
          break;
        case 'counter':
          bonusCounterChance += val;
          break;
        case 'thorns':
          bonusThorns += val;
          break;
        case 'crit_surge':
          bonusCritChance += val;
          break;
        default:
          break;
      }
    }
  }

  // Passive skill bonuses
  for (const [skillId, skillLevel] of Object.entries(skills)) {
    if (!skillLevel || skillLevel <= 0) continue;
    const def = getSkillDefinition(skillId);
    if (!def || def.category !== 'passive' || !def.passiveBonuses) continue;
    const p = def.passiveBonuses;
    if (p.str) total.str += p.str * skillLevel;
    if (p.def) total.def += p.def * skillLevel;
    if (p.agi) total.agi += p.agi * skillLevel;
    if (p.vit) total.vit += p.vit * skillLevel;
    if (p.lck) total.lck += p.lck * skillLevel;
    if (p.critChance) bonusCritChance += p.critChance * skillLevel;
    if (p.dodgeChance) bonusDodgeChance += p.dodgeChance * skillLevel;
    if (p.blockChance) bonusBlockChance += p.blockChance * skillLevel;
    if (p.lifesteal) bonusLifesteal += p.lifesteal * skillLevel;
  }

  // Ancestral Forge permanent combat power boost
  const forgeUpgradeLevel = upgrades.dojo_ancestral_forge ?? 0;
  const forgeCombatMult = 1 + forgeUpgradeLevel * 0.04;

  const maxHp = Math.round(
    (90 + level * 18 + total.vit * 11 + bonusHp) * (1 + forgeUpgradeLevel * 0.025),
  );
  const rawAttack = (6 + level * 2.2 + total.str * 2.1 + bonusAttack) * forgeCombatMult;
  const minDamage = Math.max(4, Math.round(rawAttack * 0.85));
  const maxDamage = Math.max(minDamage + 2, Math.round(rawAttack * 1.15));
  const defense = Math.round((total.def * 1.65 + level * 1.1 + bonusDefense) * (1 + forgeUpgradeLevel * 0.02));

  const critChance = Number(
    clamp(0.06 + total.lck * 0.0055 + bonusCritChance, 0.05, 0.75).toFixed(4),
  );
  const critMultiplier = Number(
    clamp(1.75 + total.lck * 0.004, 1.75, 2.45).toFixed(2),
  );
  const dodgeChance = Number(
    clamp(0.04 + total.agi * 0.0045 + bonusDodgeChance, 0.03, 0.55).toFixed(4),
  );
  const blockChance = Number(
    clamp(0.05 + total.def * 0.0045 + bonusBlockChance, 0.04, 0.55).toFixed(4),
  );
  const speed = Math.round(10 + total.agi * 1.45 + level * 0.4);
  const lifesteal = Number(clamp(bonusLifesteal, 0, 0.4).toFixed(4));
  const counterChance = Number(
    clamp(0.04 + total.agi * 0.0015 + bonusCounterChance, 0, 0.4).toFixed(4),
  );
  const thornsPercent = Number(clamp(bonusThorns, 0, 0.35).toFixed(4));

  const avgDamage = (minDamage + maxDamage) / 2;
  const powerScore = Math.round(
    maxHp * 0.42 +
      avgDamage * 4.2 +
      defense * 2.4 +
      speed * 1.8 +
      critChance * 260 +
      dodgeChance * 220 +
      blockChance * 200 +
      lifesteal * 280 +
      counterChance * 210 +
      thornsPercent * 190,
  );

  return {
    maxHp,
    minDamage,
    maxDamage,
    defense,
    critChance,
    critMultiplier,
    dodgeChance,
    blockChance,
    speed,
    lifesteal,
    counterChance,
    thornsPercent,
    powerScore,
  };
}

export interface ClickMetrics {
  goldPerClick: number;
  xpPerClick: number;
  clickDamage: number;
  clickCritChance: number;
  autoGoldPerSec: number;
  autoXpPerSec: number;
  goldMultiplier: number;
  xpMultiplier: number;
}

export function computeClickMetrics(fighter: FighterProfile): ClickMetrics {
  const upgrades = fighter.upgrades ?? {};
  const derived = computeDerivedStats(
    fighter.baseStats,
    fighter.level,
    fighter.equipped,
    fighter.skills,
    upgrades,
  );

  const steelFists = upgrades.click_steel_fists ?? 0;
  const strikeGloves = upgrades.click_strike_gloves ?? 0;
  const lightningCombo = upgrades.click_lightning_combo ?? 0;
  const dojoCrit = upgrades.click_dojo_crit ?? 0;

  const autoDummy = upgrades.auto_dummy ?? 0;
  const autoApprentices = upgrades.auto_apprentices ?? 0;
  const autoSpringHammer = upgrades.auto_spring_hammer ?? 0;
  const autoSanctuary = upgrades.auto_energy_sanctuary ?? 0;

  const intensiveTraining = upgrades.dojo_intensive_training ?? 0;
  const arenaTreasury = upgrades.dojo_arena_treasury ?? 0;
  const ancestralForge = upgrades.dojo_ancestral_forge ?? 0;
  const legendAura = upgrades.dojo_legend_aura ?? 0;

  // Equipment bonuses for click & gold
  let equipGoldBonusPct = 0;
  let equipClickBonusPct = 0;
  let equipStr = 0;
  let equipLck = 0;

  for (const slot of EQUIPMENT_SLOTS) {
    const item = fighter.equipped[slot];
    if (!item) continue;
    const eff = getEffectiveItemStats(item);
    equipStr += eff.stats.str;
    equipLck += eff.stats.lck;
    if (eff.specialEffect?.type === 'gold_boost') {
      equipGoldBonusPct += eff.specialEffect.value;
    }
    if (eff.specialEffect?.type === 'click_boost') {
      equipClickBonusPct += eff.specialEffect.value;
    }
  }

  // Passive skill bonuses for click & gold
  let skillGoldBonusPct = 0;
  let skillClickBonusPct = 0;
  for (const [skillId, lvl] of Object.entries(fighter.skills ?? {})) {
    if (!lvl || lvl <= 0) continue;
    const def = getSkillDefinition(skillId);
    if (!def?.passiveBonuses) continue;
    if (def.passiveBonuses.goldPercent) {
      skillGoldBonusPct += def.passiveBonuses.goldPercent * lvl;
    }
    if (def.passiveBonuses.clickDamagePercent) {
      skillClickBonusPct += def.passiveBonuses.clickDamagePercent * lvl;
    }
  }

  const goldMultiplier = Number(
    (
      1 +
      arenaTreasury * 0.1 +
      legendAura * 0.12 +
      (equipGoldBonusPct + skillGoldBonusPct) / 100
    ).toFixed(3),
  );

  const xpMultiplier = Number(
    (1 + intensiveTraining * 0.1 + legendAura * 0.12).toFixed(3),
  );

  const clickPowerMult =
    1 +
    strikeGloves * 0.15 +
    ancestralForge * 0.08 +
    (equipClickBonusPct + skillClickBonusPct) / 100;

  const comboRewardMult = 1 + lightningCombo * 0.12;

  const totalStr = fighter.baseStats.str + equipStr;
  const totalLck = fighter.baseStats.lck + equipLck;

  const clickDamage = Math.max(
    5,
    Math.round((8 + totalStr * 1.45 + fighter.level * 2 + steelFists * 4) * clickPowerMult),
  );

  const goldPerClick = Math.max(
    1,
    Math.round(
      (1 + fighter.level * 0.35 + steelFists * 0.85 + totalLck * 0.08) *
        comboRewardMult *
        goldMultiplier,
    ),
  );

  const xpPerClick = Math.max(
    1,
    Math.round(
      (1.5 + fighter.level * 0.35 + steelFists * 0.4) * comboRewardMult * xpMultiplier,
    ),
  );

  const clickCritChance = Number(
    clamp(derived.critChance + dojoCrit * 0.03, 0.05, 0.85).toFixed(4),
  );

  const rawAutoGold =
    autoDummy * 1 + autoApprentices * 3.5 + autoSpringHammer * 10 + autoSanctuary * 35;
  const rawAutoXp =
    autoDummy * 1 + autoApprentices * 2.5 + autoSpringHammer * 7 + autoSanctuary * 20;

  const autoGoldPerSec = Number((rawAutoGold * goldMultiplier).toFixed(1));
  const autoXpPerSec = Number((rawAutoXp * xpMultiplier).toFixed(1));

  return {
    goldPerClick,
    xpPerClick,
    clickDamage,
    clickCritChance,
    autoGoldPerSec,
    autoXpPerSec,
    goldMultiplier,
    xpMultiplier,
  };
}

export interface LevelUpResult {
  leveledUp: boolean;
  levelsGained: number;
  newLevel: number;
}

export function applyXpAndLevelUp(fighter: FighterProfile, xpGain: number): LevelUpResult {
  const safeGain = Math.max(0, Math.floor(xpGain));
  fighter.xp += safeGain;

  let levelsGained = 0;
  while (fighter.xp >= fighter.xpToNext) {
    fighter.xp -= fighter.xpToNext;
    fighter.level += 1;
    fighter.statPoints += STAT_POINTS_PER_LEVEL;
    fighter.xpToNext = xpRequiredForLevel(fighter.level);
    levelsGained += 1;
  }

  if (levelsGained > 0) {
    fighter.energy = fighter.maxEnergy;
    fighter.lastEnergyUpdate = Date.now();
    fighter.title = getTitleForLevel(fighter.level);
  }

  return {
    leveledUp: levelsGained > 0,
    levelsGained,
    newLevel: fighter.level,
  };
}

export interface EnergyRegenResult {
  energy: number;
  gained: number;
  nextRegenInMs: number;
}

export function regenerateEnergy(
  fighter: FighterProfile,
  now: number = Date.now(),
): EnergyRegenResult {
  if (fighter.energy >= fighter.maxEnergy) {
    fighter.energy = fighter.maxEnergy;
    fighter.lastEnergyUpdate = now;
    return { energy: fighter.energy, gained: 0, nextRegenInMs: 0 };
  }

  const elapsed = Math.max(0, now - fighter.lastEnergyUpdate);
  const potential = Math.floor(elapsed / ENERGY_REGEN_MS);
  let gained = 0;

  if (potential > 0) {
    gained = Math.min(potential, fighter.maxEnergy - fighter.energy);
    fighter.energy += gained;
    if (fighter.energy >= fighter.maxEnergy) {
      fighter.energy = fighter.maxEnergy;
      fighter.lastEnergyUpdate = now;
    } else {
      fighter.lastEnergyUpdate += gained * ENERGY_REGEN_MS;
    }
  }

  const nextRegenInMs =
    fighter.energy >= fighter.maxEnergy
      ? 0
      : Math.max(0, ENERGY_REGEN_MS - (now - fighter.lastEnergyUpdate));

  return {
    energy: fighter.energy,
    gained,
    nextRegenInMs,
  };
}

export function computeOfflineEarnings(
  fighter: FighterProfile,
  now: number = Date.now(),
): OfflineEarningsSummary | null {
  const rawSeconds = Math.floor((now - fighter.lastActiveAt) / 1000);
  if (rawSeconds < MIN_OFFLINE_SECONDS) {
    return null;
  }

  const secondsAway = Math.min(rawSeconds, MAX_OFFLINE_SECONDS);
  const metrics = computeClickMetrics(fighter);
  const goldEarned = Math.floor(metrics.autoGoldPerSec * secondsAway);
  const xpEarned = Math.floor(metrics.autoXpPerSec * secondsAway);

  if (goldEarned <= 0 && xpEarned <= 0) {
    return null;
  }

  return {
    secondsAway,
    goldEarned,
    xpEarned,
  };
}

// ============================================================================
// BOUTIQUE & COFFRES MYSTÈRES
// ============================================================================

export interface ChestOffer {
  id: string;
  name: string;
  description: string;
  icon: string;
  currency: 'gold' | 'gems';
  price: number;
  minRarity: Rarity;
  accentColor: string;
}

export const CHEST_OFFERS: ChestOffer[] = [
  {
    id: 'chest_dojo',
    name: 'Coffre du Dojo',
    description: 'Contient un équipement aléatoire (Commun à Légendaire) adapté à ton niveau.',
    icon: '🪵',
    currency: 'gold',
    price: 250,
    minRarity: 'common',
    accentColor: '#d97706',
  },
  {
    id: 'chest_gladiator',
    name: 'Coffre du Gladiateur',
    description: 'Garantit au minimum un équipement Rare avec fortes chances d’Épique !',
    icon: '🧰',
    currency: 'gems',
    price: 20,
    minRarity: 'rare',
    accentColor: '#9b30c9',
  },
  {
    id: 'chest_mythic_dragon',
    name: 'Coffre Mythique du Dragon',
    description: 'Un trésor royal garantissant au moins Épique — et de vraies chances de Mythique !',
    icon: '🐉',
    currency: 'gems',
    price: 55,
    minRarity: 'epic',
    accentColor: '#dc2626',
  },
];

function localSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createShopStock(playerLevel: number, seed?: number): ShopStockItem[] {
  const effectiveSeed =
    seed !== undefined ? seed : Math.floor(Date.now() / (1000 * 60 * 60)) + playerLevel * 31;
  const rng = localSeededRng(effectiveSeed);

  const maxLevel = Math.max(4, playerLevel + 4);
  const stock: ShopStockItem[] = [];
  const usedIds = new Set<string>();

  // Try to pick 1 relevant item per slot for a balanced 6-item shop rotation
  for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    const slot = EQUIPMENT_SLOTS[i];
    let candidates: EquipmentTemplate[] = EQUIPMENT_CATALOG.filter(
      (item) => item.slot === slot && item.minLevel <= maxLevel && !usedIds.has(item.templateId),
    );

    if (candidates.length === 0) {
      candidates = EQUIPMENT_CATALOG.filter(
        (item) => item.slot === slot && !usedIds.has(item.templateId),
      );
    }

    // Prefer items close to playerLevel so late-game shops feel exciting
    const weighted = candidates.map((item) => {
      const dist = Math.abs(item.minLevel - playerLevel);
      const weight = Math.max(1, 12 - dist);
      return { item, weight };
    });

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = rng() * totalWeight;
    let picked = candidates[0];
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry.item;
        break;
      }
    }

    usedIds.add(picked.templateId);
    // Slight shop price variation (-5% to +8%)
    const priceJitter = 0.95 + rng() * 0.13;
    const priceGold = Math.max(30, Math.round((picked.buyPrice * priceJitter) / 5) * 5);

    stock.push({
      stockId: `shop_${effectiveSeed}_${i}_${picked.templateId}`,
      templateId: picked.templateId,
      item: picked,
      priceGold,
      sold: false,
    });
  }

  return stock;
}
