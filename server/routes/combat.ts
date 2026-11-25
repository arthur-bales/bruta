import { Router } from 'express';
import {
  fighterToCombatParticipant,
  opponentToCombatParticipant,
  simulateCombat,
  type CombatParticipant,
} from '../../shared/combatEngine';
import { MAX_INVENTORY_SIZE } from '../../shared/constants';
import { rollRandomLoot } from '../../shared/equipmentCatalog';
import {
  getOpponentById,
  OPPONENTS_CATALOG,
  SEED_RIVAL_FIGHTERS,
} from '../../shared/opponentsCatalog';
import {
  applyXpAndLevelUp,
  computeClickMetrics,
  regenerateEnergy,
} from '../../shared/progression';
import type { BattleResult, EquipmentItem } from '../../shared/types';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const MIN_RATING = 800;

// GET /api/combat/opponents — List PvE arena opponents
router.get('/opponents', (_req, res) => {
  res.status(200).json({ opponents: OPPONENTS_CATALOG });
});

// POST /api/combat/arena — Server-authoritative PvE Arena battle
router.post('/arena', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const opponentId = typeof req.body?.opponentId === 'string' ? req.body.opponentId.trim() : '';

    if (!opponentId) {
      res.status(400).json({ error: 'opponentId requis.' });
      return;
    }

    const opponent = getOpponentById(opponentId);
    if (!opponent) {
      res.status(404).json({ error: 'Adversaire introuvable.' });
      return;
    }

    const fighter = await db.getFighterByUserId(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const now = Date.now();
    regenerateEnergy(fighter, now);

    if (fighter.energy < 1) {
      res.status(400).json({
        error: 'Énergie insuffisante ! Attends la régénération ou monte de niveau.',
      });
      return;
    }

    // Consume 1 energy
    const wasAtMax = fighter.energy >= fighter.maxEnergy;
    fighter.energy -= 1;
    if (wasAtMax) {
      fighter.lastEnergyUpdate = now;
    }

    const leftParticipant = fighterToCombatParticipant(fighter);
    const rightParticipant = opponentToCombatParticipant(opponent);

    const simulation = simulateCombat({
      left: leftParticipant,
      right: rightParticipant,
      arena: opponent.arena,
    });

    const playerWon = simulation.winner === 'left';
    const metrics = computeClickMetrics(fighter);

    fighter.progress.arenaBattles += 1;

    let gold = 0;
    let xp = 0;
    let gems = 0;
    let rawRatingDelta = 0;
    let lootItem: EquipmentItem | null = null;

    if (playerWon) {
      gold = Math.max(10, Math.round(opponent.rewardGold * metrics.goldMultiplier));
      xp = Math.max(10, Math.round(opponent.rewardXp * metrics.xpMultiplier));
      gems = opponent.isBoss ? 3 : 1;

      const levelDiff = Math.max(0, Math.min(10, opponent.level - fighter.level + 3));
      rawRatingDelta = opponent.isBoss ? 25 : Math.min(25, 15 + levelDiff);

      fighter.progress.arenaWins += 1;
      if (opponent.isBoss) {
        fighter.progress.bossesDefeated += 1;
      }
      fighter.progress.winStreak += 1;
      fighter.progress.bestWinStreak = Math.max(
        fighter.progress.bestWinStreak,
        fighter.progress.winStreak,
      );

      if (
        Math.random() < opponent.lootChance &&
        fighter.inventory.length < MAX_INVENTORY_SIZE
      ) {
        lootItem = rollRandomLoot(
          Math.max(fighter.level, opponent.level),
          opponent.lootMinRarity,
        );
        fighter.inventory.push(lootItem);
      }
    } else {
      // Consolation rewards so losing still feels encouraging
      gold = Math.max(5, Math.round(opponent.rewardGold * 0.2 * metrics.goldMultiplier));
      xp = Math.max(5, Math.round(opponent.rewardXp * 0.25 * metrics.xpMultiplier));
      gems = 0;
      rawRatingDelta = -5;

      fighter.progress.arenaLosses += 1;
      fighter.progress.winStreak = 0;
    }

    const prevRating = fighter.rating;
    fighter.rating = Math.max(MIN_RATING, fighter.rating + rawRatingDelta);
    const ratingDelta = fighter.rating - prevRating;

    fighter.gold += gold;
    fighter.gems += gems;
    fighter.progress.totalGoldEarned += gold;

    const levelResult = applyXpAndLevelUp(fighter, xp);
    fighter.lastActiveAt = now;

    const battle: BattleResult = {
      ...simulation,
      rewards: {
        gold,
        xp,
        gems,
        ratingDelta,
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        lootItem,
      },
    };

    await db.recordBattle({
      id: battle.battleId,
      leftFighterId: fighter.id,
      rightFighterId: opponent.id,
      winner: battle.winner,
      arena: battle.arena,
      seed: battle.seed,
      isPvp: false,
      summary: {
        opponentName: opponent.name,
        isBoss: opponent.isBoss,
        totalTurns: battle.totalTurns,
        rewards: battle.rewards,
      },
      createdAt: now,
    });

    const savedFighter = await db.saveFighter(userId, fighter);
    res.status(200).json({ battle, fighter: savedFighter });
  } catch (err) {
    next(err);
  }
});

// POST /api/combat/pvp — Server-authoritative Async PvP battle against DB player or seed rival
router.post('/pvp', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const targetPlayerId =
      typeof req.body?.targetPlayerId === 'string' ? req.body.targetPlayerId.trim() : '';

    if (!targetPlayerId) {
      res.status(400).json({ error: 'targetPlayerId requis.' });
      return;
    }

    const fighter = await db.getFighterByUserId(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (targetPlayerId === fighter.id) {
      res.status(400).json({ error: 'Tu ne peux pas te défier toi-même !' });
      return;
    }

    const now = Date.now();
    regenerateEnergy(fighter, now);

    if (fighter.energy < 1) {
      res.status(400).json({
        error: 'Énergie insuffisante ! Attends la régénération ou monte de niveau.',
      });
      return;
    }

    let rightParticipant: CombatParticipant | null = null;
    let targetLevel = fighter.level;
    let targetBaseGold = 0;
    let targetBaseXp = 0;

    const realTarget = await db.getFighterById(targetPlayerId);
    if (realTarget) {
      rightParticipant = fighterToCombatParticipant(realTarget);
      targetLevel = realTarget.level;
      targetBaseGold = Math.round(80 + targetLevel * 40);
      targetBaseXp = Math.round(70 + targetLevel * 34);
    } else {
      const seedRival = SEED_RIVAL_FIGHTERS.find((r) => r.id === targetPlayerId);
      if (seedRival) {
        rightParticipant = opponentToCombatParticipant(seedRival);
        targetLevel = seedRival.level;
        targetBaseGold = seedRival.rewardGold;
        targetBaseXp = seedRival.rewardXp;
      }
    }

    if (!rightParticipant) {
      res.status(404).json({ error: 'Rival PvP introuvable.' });
      return;
    }

    // Consume 1 energy
    const wasAtMax = fighter.energy >= fighter.maxEnergy;
    fighter.energy -= 1;
    if (wasAtMax) {
      fighter.lastEnergyUpdate = now;
    }

    const leftParticipant = fighterToCombatParticipant(fighter);
    const simulation = simulateCombat({
      left: leftParticipant,
      right: rightParticipant,
      arena: 'coliseum',
    });

    const playerWon = simulation.winner === 'left';
    const metrics = computeClickMetrics(fighter);

    let gold = 0;
    let xp = 0;
    let gems = 0;
    let rawRatingDelta = 0;
    let lootItem: EquipmentItem | null = null;

    if (playerWon) {
      gold = Math.max(25, Math.round(targetBaseGold * metrics.goldMultiplier));
      xp = Math.max(25, Math.round(targetBaseXp * metrics.xpMultiplier));
      gems = 2;
      rawRatingDelta = 22;

      fighter.progress.pvpWins += 1;
      fighter.progress.winStreak += 1;
      fighter.progress.bestWinStreak = Math.max(
        fighter.progress.bestWinStreak,
        fighter.progress.winStreak,
      );

      if (Math.random() < 0.35 && fighter.inventory.length < MAX_INVENTORY_SIZE) {
        const minRarity = targetLevel >= 16 ? 'epic' : targetLevel >= 8 ? 'rare' : 'common';
        lootItem = rollRandomLoot(Math.max(fighter.level, targetLevel), minRarity);
        fighter.inventory.push(lootItem);
      }
    } else {
      gold = Math.max(10, Math.round(targetBaseGold * 0.2 * metrics.goldMultiplier));
      xp = Math.max(10, Math.round(targetBaseXp * 0.25 * metrics.xpMultiplier));
      gems = 0;
      rawRatingDelta = -10;

      fighter.progress.pvpLosses += 1;
      fighter.progress.winStreak = 0;
    }

    const prevRating = fighter.rating;
    fighter.rating = Math.max(MIN_RATING, fighter.rating + rawRatingDelta);
    const ratingDelta = fighter.rating - prevRating;

    fighter.gold += gold;
    fighter.gems += gems;
    fighter.progress.totalGoldEarned += gold;

    const levelResult = applyXpAndLevelUp(fighter, xp);
    fighter.lastActiveAt = now;

    const battle: BattleResult = {
      ...simulation,
      rewards: {
        gold,
        xp,
        gems,
        ratingDelta,
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        lootItem,
      },
    };

    await db.recordBattle({
      id: battle.battleId,
      leftFighterId: fighter.id,
      rightFighterId: rightParticipant.id,
      winner: battle.winner,
      arena: battle.arena,
      seed: battle.seed,
      isPvp: true,
      summary: {
        opponentName: rightParticipant.name,
        totalTurns: battle.totalTurns,
        rewards: battle.rewards,
      },
      createdAt: now,
    });

    const savedFighter = await db.saveFighter(userId, fighter);
    res.status(200).json({ battle, fighter: savedFighter });
  } catch (err) {
    next(err);
  }
});

export default router;
