import { Router } from 'express';
import {
  MAX_EQUIPPED_ACTIVE_SKILLS,
  MAX_FORGE_LEVEL,
  MAX_INVENTORY_SIZE,
} from '../../shared/constants';
import {
  getForgeUpgradeCost,
  getItemSellValue,
  instantiateEquipment,
  rollRandomLoot,
} from '../../shared/equipmentCatalog';
import {
  DAILY_REWARDS_CATALOG,
  getMissionProgress,
  MISSIONS_CATALOG,
} from '../../shared/missionsCatalog';
import {
  applyXpAndLevelUp,
  CHEST_OFFERS,
  createShopStock,
  regenerateEnergy,
} from '../../shared/progression';
import { getSkillDefinition, getSkillUpgradeCost } from '../../shared/skillsCatalog';
import type { EquipmentItem, EquipmentSlot, FighterProfile, ShopStockItem } from '../../shared/types';
import { getUpgradeCost, getUpgradeDefinition } from '../../shared/upgradesCatalog';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';

const VALID_SLOTS: ReadonlySet<EquipmentSlot> = new Set([
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'accessory',
]);

const SHOP_REFRESH_COST_GOLD = 60;

interface PlayerShopState {
  dayKey: string;
  rotation: number;
  stock: ShopStockItem[];
}

const playerShops = new Map<string, PlayerShopState>();

function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function getOrCreatePlayerShop(fighter: FighterProfile): PlayerShopState {
  const dayKey = getTodayUtc();
  const existing = playerShops.get(fighter.id);
  if (existing && existing.dayKey === dayKey) {
    return existing;
  }

  const rotation = 0;
  const seed = hashSeed(`${fighter.id}:${dayKey}:${rotation}`);
  const state: PlayerShopState = {
    dayKey,
    rotation,
    stock: createShopStock(fighter.level, seed),
  };
  playerShops.set(fighter.id, state);
  return state;
}

async function loadFighter(userId: string): Promise<FighterProfile | null> {
  const fighter = await db.getFighterByUserId(userId);
  if (!fighter) return null;
  regenerateEnergy(fighter, Date.now());
  return fighter;
}

// ============================================================================
// INVENTORY & FORGE ROUTES (/api/inventory)
// ============================================================================

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

// POST /api/inventory/equip
inventoryRouter.post('/equip', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const itemUid = typeof req.body?.itemUid === 'string' ? req.body.itemUid.trim() : '';
    if (!itemUid) {
      res.status(400).json({ error: 'itemUid requis.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const idx = fighter.inventory.findIndex((i) => i.uid === itemUid);
    if (idx === -1) {
      res.status(404).json({ error: 'Objet introuvable dans l’inventaire.' });
      return;
    }

    const [item] = fighter.inventory.splice(idx, 1);
    const previouslyEquipped = fighter.equipped[item.slot];
    fighter.equipped[item.slot] = item;
    if (previouslyEquipped) {
      fighter.inventory.push(previouslyEquipped);
    }

    fighter.lastActiveAt = Date.now();
    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/unequip
inventoryRouter.post('/unequip', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const slot = req.body?.slot as EquipmentSlot | undefined;
    if (!slot || !VALID_SLOTS.has(slot)) {
      res.status(400).json({ error: 'Emplacement d’équipement invalide.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const item = fighter.equipped[slot];
    if (!item) {
      res.status(400).json({ error: 'Aucun objet équipé dans cet emplacement.' });
      return;
    }

    if (fighter.inventory.length >= MAX_INVENTORY_SIZE) {
      res.status(400).json({ error: 'Inventaire plein ! Vends un objet avant de déséquiper.' });
      return;
    }

    fighter.equipped[slot] = null;
    fighter.inventory.push(item);
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/sell
inventoryRouter.post('/sell', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const itemUid = typeof req.body?.itemUid === 'string' ? req.body.itemUid.trim() : '';
    if (!itemUid) {
      res.status(400).json({ error: 'itemUid requis.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const idx = fighter.inventory.findIndex((i) => i.uid === itemUid);
    if (idx === -1) {
      res.status(404).json({ error: 'Objet introuvable dans l’inventaire.' });
      return;
    }

    const [item] = fighter.inventory.splice(idx, 1);
    const goldEarned = getItemSellValue(item);
    fighter.gold += goldEarned;
    fighter.progress.totalGoldEarned += goldEarned;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved, goldEarned });
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/forge
inventoryRouter.post('/forge', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const itemUid = typeof req.body?.itemUid === 'string' ? req.body.itemUid.trim() : '';
    if (!itemUid) {
      res.status(400).json({ error: 'itemUid requis.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    let targetItem: EquipmentItem | null = null;
    for (const slot of VALID_SLOTS) {
      const eq = fighter.equipped[slot];
      if (eq && eq.uid === itemUid) {
        targetItem = eq;
        break;
      }
    }
    if (!targetItem) {
      targetItem = fighter.inventory.find((i) => i.uid === itemUid) ?? null;
    }

    if (!targetItem) {
      res.status(404).json({ error: 'Objet introuvable pour la forge.' });
      return;
    }

    if (targetItem.upgradeLevel >= MAX_FORGE_LEVEL) {
      res.status(400).json({ error: `Cet objet est déjà forgé au niveau max (+${MAX_FORGE_LEVEL}).` });
      return;
    }

    const cost = getForgeUpgradeCost(targetItem);
    if (fighter.gold < cost) {
      res.status(400).json({ error: `Or insuffisant (requis : ${cost} or).` });
      return;
    }

    fighter.gold -= cost;
    targetItem.upgradeLevel += 1;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved, item: targetItem, cost });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SHOP & MYSTERY CHEST ROUTES (/api/shop)
// ============================================================================

export const shopRouter = Router();
shopRouter.use(requireAuth);

// GET /api/shop
shopRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const state = getOrCreatePlayerShop(fighter);
    res.status(200).json({
      stock: state.stock,
      chests: CHEST_OFFERS,
      refreshCostGold: SHOP_REFRESH_COST_GOLD,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/shop/buy
shopRouter.post('/buy', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const stockId = typeof req.body?.stockId === 'string' ? req.body.stockId.trim() : '';
    if (!stockId) {
      res.status(400).json({ error: 'stockId requis.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const state = getOrCreatePlayerShop(fighter);
    const entry = state.stock.find((s) => s.stockId === stockId);
    if (!entry) {
      res.status(404).json({ error: 'Article introuvable dans la boutique actuelle.' });
      return;
    }

    if (entry.sold) {
      res.status(400).json({ error: 'Cet article a déjà été acheté.' });
      return;
    }

    if (fighter.inventory.length >= MAX_INVENTORY_SIZE) {
      res.status(400).json({ error: 'Inventaire plein ! Libère de la place d’abord.' });
      return;
    }

    if (fighter.gold < entry.priceGold) {
      res.status(400).json({ error: `Or insuffisant (requis : ${entry.priceGold} or).` });
      return;
    }

    fighter.gold -= entry.priceGold;
    const item = instantiateEquipment(entry.templateId);
    fighter.inventory.push(item);
    entry.sold = true;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved, item, stock: state.stock });
  } catch (err) {
    next(err);
  }
});

// POST /api/shop/refresh
shopRouter.post('/refresh', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (fighter.gold < SHOP_REFRESH_COST_GOLD) {
      res.status(400).json({
        error: `Or insuffisant pour rafraîchir la boutique (${SHOP_REFRESH_COST_GOLD} or).`,
      });
      return;
    }

    fighter.gold -= SHOP_REFRESH_COST_GOLD;
    const prev = getOrCreatePlayerShop(fighter);
    const nextRotation = prev.rotation + 1;
    const dayKey = getTodayUtc();
    const nextSeed = hashSeed(`${fighter.id}:${dayKey}:${nextRotation}`);

    const nextState: PlayerShopState = {
      dayKey,
      rotation: nextRotation,
      stock: createShopStock(fighter.level, nextSeed),
    };
    playerShops.set(fighter.id, nextState);
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved, stock: nextState.stock });
  } catch (err) {
    next(err);
  }
});

// POST /api/shop/open-chest
shopRouter.post('/open-chest', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const chestId = typeof req.body?.chestId === 'string' ? req.body.chestId.trim() : '';
    if (!chestId) {
      res.status(400).json({ error: 'chestId requis.' });
      return;
    }

    const chest = CHEST_OFFERS.find((c) => c.id === chestId);
    if (!chest) {
      res.status(404).json({ error: 'Coffre introuvable.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (fighter.inventory.length >= MAX_INVENTORY_SIZE) {
      res.status(400).json({ error: 'Inventaire plein ! Vends un objet avant d’ouvrir un coffre.' });
      return;
    }

    if (chest.currency === 'gold') {
      if (fighter.gold < chest.price) {
        res.status(400).json({ error: `Or insuffisant (requis : ${chest.price} or).` });
        return;
      }
      fighter.gold -= chest.price;
    } else {
      if (fighter.gems < chest.price) {
        res.status(400).json({ error: `Gemmes insuffisantes (requis : ${chest.price} gemmes).` });
        return;
      }
      fighter.gems -= chest.price;
    }

    const item = rollRandomLoot(fighter.level, chest.minRarity);
    fighter.inventory.push(item);
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved, item });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SKILLS ROUTES (/api/skills)
// ============================================================================

export const skillsRouter = Router();
skillsRouter.use(requireAuth);

// POST /api/skills/upgrade
skillsRouter.post('/upgrade', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const skillId = typeof req.body?.skillId === 'string' ? req.body.skillId.trim() : '';
    if (!skillId) {
      res.status(400).json({ error: 'skillId requis.' });
      return;
    }

    const skill = getSkillDefinition(skillId);
    if (!skill) {
      res.status(404).json({ error: 'Compétence introuvable.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (fighter.level < skill.unlockLevel) {
      res.status(400).json({
        error: `Niveau ${skill.unlockLevel} requis pour débloquer ${skill.name}.`,
      });
      return;
    }

    const currentLevel = fighter.skills[skillId] ?? 0;
    if (currentLevel >= skill.maxLevel) {
      res.status(400).json({ error: `${skill.name} est déjà au niveau maximum.` });
      return;
    }

    const cost = getSkillUpgradeCost(skill, currentLevel);
    if (fighter.gold < cost) {
      res.status(400).json({ error: `Or insuffisant (requis : ${cost} or).` });
      return;
    }

    fighter.gold -= cost;
    fighter.skills[skillId] = currentLevel + 1;

    // Auto-equip active skill if fewer than 3 active skills are equipped
    if (
      skill.category === 'active' &&
      !fighter.equippedSkills.includes(skillId) &&
      fighter.equippedSkills.length < MAX_EQUIPPED_ACTIVE_SKILLS
    ) {
      fighter.equippedSkills.push(skillId);
    }

    fighter.lastActiveAt = Date.now();
    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/skills/toggle-equip
skillsRouter.post('/toggle-equip', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const skillId = typeof req.body?.skillId === 'string' ? req.body.skillId.trim() : '';
    if (!skillId) {
      res.status(400).json({ error: 'skillId requis.' });
      return;
    }

    const skill = getSkillDefinition(skillId);
    if (!skill) {
      res.status(404).json({ error: 'Compétence introuvable.' });
      return;
    }

    if (skill.category !== 'active') {
      res.status(400).json({ error: 'Les compétences passives sont toujours actives automatiquement.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if ((fighter.skills[skillId] ?? 0) <= 0) {
      res.status(400).json({ error: 'Tu dois d’abord débloquer cette compétence.' });
      return;
    }

    const existingIdx = fighter.equippedSkills.indexOf(skillId);
    if (existingIdx !== -1) {
      fighter.equippedSkills.splice(existingIdx, 1);
    } else {
      if (fighter.equippedSkills.length >= MAX_EQUIPPED_ACTIVE_SKILLS) {
        res.status(400).json({
          error: `Maximum ${MAX_EQUIPPED_ACTIVE_SKILLS} compétences actives équipées simultanément.`,
        });
        return;
      }
      fighter.equippedSkills.push(skillId);
    }

    fighter.lastActiveAt = Date.now();
    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// DOJO UPGRADES ROUTES (/api/upgrades)
// ============================================================================

export const upgradesRouter = Router();
upgradesRouter.use(requireAuth);

// POST /api/upgrades/buy
upgradesRouter.post('/buy', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const upgradeId = typeof req.body?.upgradeId === 'string' ? req.body.upgradeId.trim() : '';
    if (!upgradeId) {
      res.status(400).json({ error: 'upgradeId requis.' });
      return;
    }

    const upgrade = getUpgradeDefinition(upgradeId);
    if (!upgrade) {
      res.status(404).json({ error: 'Amélioration introuvable.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const currentLevel = fighter.upgrades[upgradeId] ?? 0;
    if (currentLevel >= upgrade.maxLevel) {
      res.status(400).json({ error: `${upgrade.name} est déjà au niveau maximum.` });
      return;
    }

    const cost = getUpgradeCost(upgrade, currentLevel);
    if (fighter.gold < cost) {
      res.status(400).json({ error: `Or insuffisant (requis : ${cost} or).` });
      return;
    }

    fighter.gold -= cost;
    fighter.upgrades[upgradeId] = currentLevel + 1;
    fighter.progress.upgradesBought += 1;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// MISSIONS & DAILY REWARD ROUTES (/api/missions)
// ============================================================================

export const missionsRouter = Router();
missionsRouter.use(requireAuth);

// POST /api/missions/claim
missionsRouter.post('/claim', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const missionId = typeof req.body?.missionId === 'string' ? req.body.missionId.trim() : '';
    if (!missionId) {
      res.status(400).json({ error: 'missionId requis.' });
      return;
    }

    const mission = MISSIONS_CATALOG.find((m) => m.id === missionId);
    if (!mission) {
      res.status(404).json({ error: 'Mission introuvable.' });
      return;
    }

    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (fighter.claimedMissions.includes(missionId)) {
      res.status(400).json({ error: 'Récompense déjà réclamée.' });
      return;
    }

    const progress = getMissionProgress(fighter, mission);
    if (!progress.completed) {
      res.status(400).json({
        error: `Objectif non atteint (${progress.current}/${progress.target}).`,
      });
      return;
    }

    fighter.claimedMissions.push(missionId);
    fighter.gold += mission.rewardGold;
    fighter.gems += mission.rewardGems;
    fighter.progress.totalGoldEarned += mission.rewardGold;

    const levelResult = applyXpAndLevelUp(fighter, mission.rewardXp);
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({
      fighter: saved,
      reward: {
        gold: mission.rewardGold,
        gems: mission.rewardGems,
        xp: mission.rewardXp,
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/missions/daily-claim
missionsRouter.post('/daily-claim', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await loadFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const today = getTodayUtc();
    if (fighter.lastDailyClaimDate === today) {
      res.status(400).json({ error: 'Récompense quotidienne déjà récupérée aujourd’hui !' });
      return;
    }

    const nextDay = (fighter.dailyStreak % 7) + 1;
    const rewardDef = DAILY_REWARDS_CATALOG[nextDay - 1] ?? DAILY_REWARDS_CATALOG[0];

    fighter.dailyStreak = nextDay;
    fighter.lastDailyClaimDate = today;
    fighter.gold += rewardDef.gold;
    fighter.gems += rewardDef.gems;
    fighter.progress.totalGoldEarned += rewardDef.gold;

    let bonusItem: EquipmentItem | null = null;
    if (rewardDef.chestRarity && fighter.inventory.length < MAX_INVENTORY_SIZE) {
      bonusItem = rollRandomLoot(fighter.level, rewardDef.chestRarity);
      fighter.inventory.push(bonusItem);
    }

    const levelResult = applyXpAndLevelUp(fighter, rewardDef.xp);
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({
      fighter: saved,
      reward: rewardDef,
      bonusItem,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
    });
  } catch (err) {
    next(err);
  }
});
