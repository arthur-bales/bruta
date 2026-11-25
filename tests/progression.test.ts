import { describe, expect, it } from 'vitest';
import {
  MAX_ENERGY,
  STAT_POINTS_PER_LEVEL,
  xpRequiredForLevel,
} from '../shared/constants';
import {
  EQUIPMENT_CATALOG,
  instantiateEquipment,
  RARITY_ORDER,
} from '../shared/equipmentCatalog';
import {
  applyXpAndLevelUp,
  computeClickMetrics,
  computeDerivedStats,
  computeOfflineEarnings,
  createInitialFighter,
} from '../shared/progression';
import type { EquipmentSlot, Rarity } from '../shared/types';

describe('Progression & Economy Math (shared/progression.ts)', () => {
  it('createInitialFighter returns a valid Lv1 fighter with starter weapon & armor', () => {
    const fighter = createInitialFighter('ftr_init_1', '  Mochi  ');

    expect(fighter.id).toBe('ftr_init_1');
    expect(fighter.name).toBe('Mochi');
    expect(fighter.level).toBe(1);
    expect(fighter.xp).toBe(0);
    expect(fighter.xpToNext).toBe(xpRequiredForLevel(1));
    expect(fighter.energy).toBe(MAX_ENERGY);
    expect(fighter.maxEnergy).toBe(MAX_ENERGY);
    expect(fighter.statPoints).toBeGreaterThan(0);
    expect(fighter.gold).toBeGreaterThan(0);
    expect(fighter.gems).toBeGreaterThan(0);
    expect(fighter.rating).toBe(1000);

    expect(fighter.equipped.weapon).not.toBeNull();
    expect(fighter.equipped.weapon?.templateId).toBe('wpn_wooden_club');
    expect(fighter.equipped.armor).not.toBeNull();
    expect(fighter.equipped.armor?.templateId).toBe('arm_tunic');
    expect(fighter.equipped.helmet).toBeNull();
    expect(fighter.equipped.gloves).toBeNull();
    expect(fighter.equipped.boots).toBeNull();
    expect(fighter.equipped.accessory).toBeNull();
  });

  it('computeDerivedStats increases with stat points, equipped items, forge upgrades, and passive skills', () => {
    const fighter = createInitialFighter('ftr_stats', 'Kenshin');
    const baseDerived = computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      fighter.equipped,
      fighter.skills,
      fighter.upgrades,
    );

    // 1. Adding core stat points increases derived metrics
    const boostedBaseStats = {
      str: fighter.baseStats.str + 10,
      def: fighter.baseStats.def + 10,
      agi: fighter.baseStats.agi + 10,
      vit: fighter.baseStats.vit + 10,
      lck: fighter.baseStats.lck + 10,
    };
    const afterStats = computeDerivedStats(
      boostedBaseStats,
      fighter.level,
      fighter.equipped,
      fighter.skills,
      fighter.upgrades,
    );
    expect(afterStats.maxHp).toBeGreaterThan(baseDerived.maxHp);
    expect(afterStats.minDamage).toBeGreaterThan(baseDerived.minDamage);
    expect(afterStats.maxDamage).toBeGreaterThan(baseDerived.maxDamage);
    expect(afterStats.defense).toBeGreaterThan(baseDerived.defense);
    expect(afterStats.speed).toBeGreaterThan(baseDerived.speed);
    expect(afterStats.critChance).toBeGreaterThan(baseDerived.critChance);
    expect(afterStats.dodgeChance).toBeGreaterThan(baseDerived.dodgeChance);
    expect(afterStats.blockChance).toBeGreaterThan(baseDerived.blockChance);
    expect(afterStats.powerScore).toBeGreaterThan(baseDerived.powerScore);

    // 2. Equipping stronger items increases stats & activates special effects
    const strongerGear = {
      ...fighter.equipped,
      weapon: instantiateEquipment('wpn_broadsword', 'test_wpn'),
      accessory: instantiateEquipment('acc_demon_wings', 'test_acc'),
    };
    const afterEquip = computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      strongerGear,
      fighter.skills,
      fighter.upgrades,
    );
    expect(afterEquip.powerScore).toBeGreaterThan(baseDerived.powerScore);
    expect(afterEquip.lifesteal).toBeGreaterThan(0);
    expect(afterEquip.counterChance).toBeGreaterThan(baseDerived.counterChance);

    // 3. Forging equipped items (+5) increases derived stats further
    const forgedWeapon = instantiateEquipment('wpn_broadsword', 'test_wpn_forged');
    forgedWeapon.upgradeLevel = 5;
    const afterForge = computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      { ...strongerGear, weapon: forgedWeapon },
      fighter.skills,
      fighter.upgrades,
    );
    expect(afterForge.maxDamage).toBeGreaterThan(afterEquip.maxDamage);
    expect(afterForge.powerScore).toBeGreaterThan(afterEquip.powerScore);

    // 4. Passive skills increase derived stats
    const afterPassives = computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      strongerGear,
      {
        steel_skin: 3,
        feline_instinct: 3,
        hawk_eye: 3,
        titan_heart: 2,
        dojo_frenzy: 2,
      },
      fighter.upgrades,
    );
    expect(afterPassives.maxHp).toBeGreaterThan(afterEquip.maxHp);
    expect(afterPassives.defense).toBeGreaterThan(afterEquip.defense);
    expect(afterPassives.dodgeChance).toBeGreaterThan(afterEquip.dodgeChance);
    expect(afterPassives.critChance).toBeGreaterThan(afterEquip.critChance);
    expect(afterPassives.lifesteal).toBeGreaterThan(afterEquip.lifesteal);
    expect(afterPassives.powerScore).toBeGreaterThan(afterEquip.powerScore);

    // 5. Dojo Ancestral Forge upgrade boosts combat stats
    const afterDojoForge = computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      strongerGear,
      fighter.skills,
      { dojo_ancestral_forge: 5 },
    );
    expect(afterDojoForge.powerScore).toBeGreaterThan(afterEquip.powerScore);
  });

  it('applyXpAndLevelUp handles multi-level-ups, awards STAT_POINTS_PER_LEVEL, and refills energy', () => {
    const fighter = createInitialFighter('ftr_lvl', 'Tornado');
    const startingStatPoints = fighter.statPoints;
    fighter.energy = 2;

    // Grant enough XP to cross levels 1 -> 2 -> 3 -> 4
    const xpFor3Levels =
      xpRequiredForLevel(1) + xpRequiredForLevel(2) + xpRequiredForLevel(3) + 25;

    const result = applyXpAndLevelUp(fighter, xpFor3Levels);

    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(3);
    expect(result.newLevel).toBe(4);
    expect(fighter.level).toBe(4);
    expect(fighter.xp).toBe(25);
    expect(fighter.xpToNext).toBe(xpRequiredForLevel(4));
    expect(fighter.statPoints).toBe(startingStatPoints + 3 * STAT_POINTS_PER_LEVEL);
    expect(fighter.energy).toBe(fighter.maxEnergy);
  });

  it('computeClickMetrics scales with click, auto, and dojo upgrades', () => {
    const fighter = createInitialFighter('ftr_click', 'PoingRapide');
    const base = computeClickMetrics(fighter);

    expect(base.goldPerClick).toBeGreaterThanOrEqual(1);
    expect(base.xpPerClick).toBeGreaterThanOrEqual(1);
    expect(base.autoGoldPerSec).toBe(0);
    expect(base.autoXpPerSec).toBe(0);

    // Click upgrades
    fighter.upgrades.click_steel_fists = 4;
    fighter.upgrades.click_strike_gloves = 3;
    fighter.upgrades.click_lightning_combo = 2;
    fighter.upgrades.click_dojo_crit = 4;
    const afterClickUps = computeClickMetrics(fighter);

    expect(afterClickUps.clickDamage).toBeGreaterThan(base.clickDamage);
    expect(afterClickUps.goldPerClick).toBeGreaterThan(base.goldPerClick);
    expect(afterClickUps.xpPerClick).toBeGreaterThan(base.xpPerClick);
    expect(afterClickUps.clickCritChance).toBeGreaterThan(base.clickCritChance);

    // Auto upgrades
    fighter.upgrades.auto_dummy = 3;
    fighter.upgrades.auto_apprentices = 2;
    const afterAutoUps = computeClickMetrics(fighter);

    expect(afterAutoUps.autoGoldPerSec).toBeGreaterThan(0);
    expect(afterAutoUps.autoXpPerSec).toBeGreaterThan(0);

    // Dojo global multipliers
    fighter.upgrades.dojo_arena_treasury = 4;
    fighter.upgrades.dojo_intensive_training = 4;
    fighter.upgrades.dojo_legend_aura = 2;
    const afterDojoUps = computeClickMetrics(fighter);

    expect(afterDojoUps.goldMultiplier).toBeGreaterThan(afterAutoUps.goldMultiplier);
    expect(afterDojoUps.xpMultiplier).toBeGreaterThan(afterAutoUps.xpMultiplier);
    expect(afterDojoUps.autoGoldPerSec).toBeGreaterThan(afterAutoUps.autoGoldPerSec);
    expect(afterDojoUps.autoXpPerSec).toBeGreaterThan(afterAutoUps.autoXpPerSec);
    expect(afterDojoUps.goldPerClick).toBeGreaterThan(afterAutoUps.goldPerClick);
    expect(afterDojoUps.xpPerClick).toBeGreaterThan(afterAutoUps.xpPerClick);
  });

  it('computeOfflineEarnings returns null under 30s and caps strictly at 8 hours', () => {
    const baseTime = 1_700_000_000_000;
    const fighter = createInitialFighter('ftr_idle', 'Dormeur');
    fighter.lastActiveAt = baseTime;
    fighter.upgrades.auto_dummy = 5; // +5 gold/s, +5 xp/s

    // Under 30 seconds -> null
    expect(computeOfflineEarnings(fighter, baseTime + 29_000)).toBeNull();

    // At 60 seconds -> positive earnings
    const atOneMin = computeOfflineEarnings(fighter, baseTime + 60_000);
    expect(atOneMin).not.toBeNull();
    expect(atOneMin?.secondsAway).toBe(60);
    expect(atOneMin?.goldEarned).toBe(300);
    expect(atOneMin?.xpEarned).toBe(300);

    // Beyond 8 hours (e.g. 24 hours) -> capped at 8 hours (28800 seconds)
    const eightHoursSec = 8 * 60 * 60;
    const atOneDay = computeOfflineEarnings(fighter, baseTime + 24 * 60 * 60 * 1000);
    expect(atOneDay).not.toBeNull();
    expect(atOneDay?.secondsAway).toBe(eightHoursSec);
    expect(atOneDay?.goldEarned).toBe(eightHoursSec * 5);
    expect(atOneDay?.xpEarned).toBe(eightHoursSec * 5);

    // Without any auto upgrades -> null even after 1 hour
    const noAuto = createInitialFighter('ftr_no_auto', 'Manuel');
    noAuto.lastActiveAt = baseTime;
    expect(computeOfflineEarnings(noAuto, baseTime + 3_600_000)).toBeNull();
  });

  it('EQUIPMENT_CATALOG covers all 6 slots and all 5 rarities with unique templateIds', () => {
    const allSlots: EquipmentSlot[] = [
      'weapon',
      'helmet',
      'armor',
      'gloves',
      'boots',
      'accessory',
    ];
    const allRarities: Rarity[] = [...RARITY_ORDER];

    const seenSlots = new Set<EquipmentSlot>();
    const seenRarities = new Set<Rarity>();
    const seenIds = new Set<string>();

    for (const item of EQUIPMENT_CATALOG) {
      expect(seenIds.has(item.templateId), `Duplicate templateId: ${item.templateId}`).toBe(false);
      seenIds.add(item.templateId);
      seenSlots.add(item.slot);
      seenRarities.add(item.rarity);
      expect(item.buyPrice).toBeGreaterThan(0);
      expect(item.minLevel).toBeGreaterThanOrEqual(1);
    }

    for (const slot of allSlots) {
      expect(seenSlots.has(slot), `Missing equipment slot: ${slot}`).toBe(true);
    }
    for (const rarity of allRarities) {
      expect(seenRarities.has(rarity), `Missing equipment rarity: ${rarity}`).toBe(true);
    }
  });
});
