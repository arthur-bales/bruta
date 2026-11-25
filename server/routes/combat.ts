import { Router } from 'express';
import {
  fighterToCombatParticipant,
  opponentToCombatParticipant,
  simulateCombat,
  type CombatParticipant,
} from '../../shared/combatEngine.js';
import { MAX_INVENTORY_SIZE } from '../../shared/constants.js';
import { rollRandomLoot } from '../../shared/equipmentCatalog.js';
import {
  getOpponentById,
  getRequiredPreviousOpponent,
  isOpponentUnlocked,
  OPPONENTS_CATALOG,
  SEED_RIVAL_FIGHTERS,
} from '../../shared/opponentsCatalog.js';
import {
  applyXpAndLevelUp,
  computeClickMetrics,
  regenerateEnergy,
} from '../../shared/progression.js';
import type { BattleResult, EquipmentItem } from '../../shared/types.js';
import { db } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

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

    const defeatedIds = Array.isArray(fighter.progress.defeatedOpponentIds)
      ? fighter.progress.defeatedOpponentIds
      : [];
    if (!isOpponentUnlocked(opponent.id, defeatedIds)) {
      const prevOpp = getRequiredPreviousOpponent(opponent.id);
      res.status(400).json({
        error: prevOpp
          ? `Combat verrouillé ! Tu dois d’abord vaincre ${prevOpp.name} dans l’arène.`
          : 'Combat verrouillé ! Termine le combat précédent pour débloquer cet adversaire.',
      });
      return;
    }

    const now = Date.now();

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
      gold = Math.max(8, Math.round(opponent.rewardGold * metrics.goldMultiplier));
      xp = Math.max(10, Math.round(opponent.rewardXp * metrics.xpMultiplier));
      gems = 0;

      const levelDiff = Math.max(0, Math.min(10, opponent.level - fighter.level + 3));
      rawRatingDelta = opponent.isBoss ? 25 : Math.min(25, 15 + levelDiff);

      fighter.progress.arenaWins += 1;
      if (!defeatedIds.includes(opponent.id)) {
        fighter.progress.defeatedOpponentIds = [...defeatedIds, opponent.id];
      }
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
      // No gold or gems on defeat — only minor training XP
      gold = 0;
      xp = Math.max(3, Math.round(opponent.rewardXp * 0.12 * metrics.xpMultiplier));
      gems = 0;
      rawRatingDelta = -8;

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
      gold = Math.max(18, Math.round(targetBaseGold * 0.65 * metrics.goldMultiplier));
      xp = Math.max(20, Math.round(targetBaseXp * metrics.xpMultiplier));
      gems = 0;
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
      gold = 0;
      xp = Math.max(4, Math.round(targetBaseXp * 0.12 * metrics.xpMultiplier));
      gems = 0;
      rawRatingDelta = -12;

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
