import { Router } from 'express';
import { SEED_RIVAL_FIGHTERS } from '../../shared/opponentsCatalog';
import { computeDerivedStats } from '../../shared/progression';
import type { LeaderboardEntry } from '../../shared/types';
import { db } from '../db/database';

const router = Router();

// GET /api/leaderboard — Merge live DB fighters with seeded PvP rivals sorted by rating & level
router.get('/', async (_req, res, next) => {
  try {
    const realFighters = await db.listTopFighters(50);
    const byId = new Map<string, Omit<LeaderboardEntry, 'rank'>>();

    for (const fighter of realFighters) {
      const derived = computeDerivedStats(
        fighter.baseStats,
        fighter.level,
        fighter.equipped,
        fighter.skills,
        fighter.upgrades,
      );
      byId.set(fighter.id, {
        playerId: fighter.id,
        name: fighter.name,
        title: fighter.title,
        level: fighter.level,
        rating: fighter.rating,
        powerScore: derived.powerScore,
        wins: (fighter.progress?.arenaWins ?? 0) + (fighter.progress?.pvpWins ?? 0),
        losses: (fighter.progress?.arenaLosses ?? 0) + (fighter.progress?.pvpLosses ?? 0),
        isBot: false,
        appearance: fighter.appearance,
        equipped: fighter.equipped,
      });
    }

    for (const rival of SEED_RIVAL_FIGHTERS) {
      if (byId.has(rival.id)) continue;
      const derived = computeDerivedStats(rival.baseStats, rival.level, rival.equipped);
      byId.set(rival.id, {
        playerId: rival.id,
        name: rival.name,
        title: rival.title,
        level: rival.level,
        rating: rival.rating,
        powerScore: derived.powerScore,
        wins: rival.wins,
        losses: rival.losses,
        isBot: true,
        appearance: rival.appearance,
        equipped: rival.equipped,
      });
    }

    const sorted = Array.from(byId.values()).sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.level !== a.level) return b.level - a.level;
      return b.powerScore - a.powerScore;
    });

    const entries: LeaderboardEntry[] = sorted.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
});

export default router;
