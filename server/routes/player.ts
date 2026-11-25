import { Router } from 'express';
import {
  DEFAULT_APPEARANCE,
  EYE_STYLES,
  HAIR_STYLES,
  MAX_ENERGY,
  MAX_EQUIPPED_ACTIVE_SKILLS,
  MAX_INVENTORY_SIZE,
  xpRequiredForLevel,
} from '../../shared/constants.js';
import {
  applyXpAndLevelUp,
  computeClickMetrics,
  createInitialFighter,
  regenerateEnergy,
} from '../../shared/progression.js';
import type {
  CoreStats,
  EyeStyle,
  FighterAppearance,
  FighterProfile,
  HairStyle,
} from '../../shared/types.js';
import { db } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const VALID_STATS: ReadonlySet<keyof CoreStats> = new Set(['str', 'def', 'agi', 'vit', 'lck']);
const VALID_HAIR_STYLES: ReadonlySet<HairStyle> = new Set(HAIR_STYLES.map((h) => h.id));
const VALID_EYE_STYLES: ReadonlySet<EyeStyle> = new Set(EYE_STYLES.map((e) => e.id));
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const MAX_CLICKS_PER_SYNC = 60;
const MAX_PASSIVE_SYNC_SECONDS = 120;

async function getRequiredFighter(userId: string): Promise<FighterProfile | null> {
  const fighter = await db.getFighterByUserId(userId);
  if (!fighter) return null;
  regenerateEnergy(fighter, Date.now());
  return fighter;
}

// PUT /api/player/customize — Update fighter name, title, and visual appearance
router.put('/customize', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await getRequiredFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    if (req.body?.name !== undefined) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (name.length < 2 || name.length > 20) {
        res.status(400).json({ error: 'Le nom doit contenir entre 2 et 20 caractères.' });
        return;
      }
      fighter.name = name;
    }

    if (req.body?.title !== undefined && typeof req.body.title === 'string') {
      const title = req.body.title.trim().slice(0, 32);
      if (title.length > 0) {
        fighter.title = title;
      }
    }

    if (req.body?.appearance && typeof req.body.appearance === 'object') {
      const incoming = req.body.appearance as Partial<FighterAppearance>;
      const nextAppearance: FighterAppearance = { ...fighter.appearance };

      if (typeof incoming.skinColor === 'string' && HEX_COLOR_RE.test(incoming.skinColor)) {
        nextAppearance.skinColor = incoming.skinColor;
      }
      if (typeof incoming.hairColor === 'string' && HEX_COLOR_RE.test(incoming.hairColor)) {
        nextAppearance.hairColor = incoming.hairColor;
      }
      if (typeof incoming.eyeColor === 'string' && HEX_COLOR_RE.test(incoming.eyeColor)) {
        nextAppearance.eyeColor = incoming.eyeColor;
      }
      if (
        typeof incoming.outfitPrimary === 'string' &&
        HEX_COLOR_RE.test(incoming.outfitPrimary)
      ) {
        nextAppearance.outfitPrimary = incoming.outfitPrimary;
      }
      if (
        typeof incoming.outfitSecondary === 'string' &&
        HEX_COLOR_RE.test(incoming.outfitSecondary)
      ) {
        nextAppearance.outfitSecondary = incoming.outfitSecondary;
      }
      if (incoming.hairStyle && VALID_HAIR_STYLES.has(incoming.hairStyle)) {
        nextAppearance.hairStyle = incoming.hairStyle;
      }
      if (incoming.eyeStyle && VALID_EYE_STYLES.has(incoming.eyeStyle)) {
        nextAppearance.eyeStyle = incoming.eyeStyle;
      }
      if (typeof incoming.warCry === 'string') {
        const warCry = incoming.warCry.trim().slice(0, 60);
        nextAppearance.warCry = warCry || DEFAULT_APPEARANCE.warCry;
      }

      fighter.appearance = nextAppearance;
    }

    if (req.body?.gender === 'male' || req.body?.gender === 'female') {
      const nextGender = req.body.gender as 'male' | 'female';
      const defaultSkin = nextGender === 'female' ? 'skin_female_dojo' : 'skin_male_dojo';
      const unlocked = Array.isArray(fighter.unlockedSkins) ? [...fighter.unlockedSkins] : [];
      if (!unlocked.includes(defaultSkin)) {
        unlocked.unshift(defaultSkin);
      }
      fighter.gender = nextGender;
      fighter.unlockedSkins = unlocked;
      // Switch to the matching gender starter skin if still on a starter/legacy skin
      if (
        !fighter.equippedSkinId ||
        fighter.equippedSkinId === 'skin_hero_dojo' ||
        fighter.equippedSkinId === 'skin_male_dojo' ||
        fighter.equippedSkinId === 'skin_female_dojo'
      ) {
        fighter.equippedSkinId = defaultSkin;
      }
    }

    fighter.isCustomized = true;
    fighter.lastActiveAt = Date.now();
    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/player/allocate-stat — Spend stat points into STR/DEF/AGI/VIT/LCK
router.post('/allocate-stat', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await getRequiredFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const stat = req.body?.stat as keyof CoreStats | undefined;
    const rawAmount = req.body?.amount === undefined ? 1 : Number(req.body.amount);
    const amount = Math.floor(rawAmount);

    if (!stat || !VALID_STATS.has(stat)) {
      res.status(400).json({ error: 'Statistique invalide.' });
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }

    if (fighter.statPoints < amount) {
      res.status(400).json({ error: 'Pas assez de points de statistique disponibles.' });
      return;
    }

    fighter.statPoints -= amount;
    fighter.baseStats[stat] += amount;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/player/click-sync — Server-authoritative clicker + passive idle earnings sync
router.post('/click-sync', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await getRequiredFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const now = Date.now();
    const rawClicks = Number(req.body?.clicks ?? 0);
    const clicks = Number.isFinite(rawClicks)
      ? Math.max(0, Math.min(MAX_CLICKS_PER_SYNC, Math.floor(rawClicks)))
      : 0;

    const rawFever = Number(req.body?.feverClicks ?? 0);
    const feverClicks = Number.isFinite(rawFever)
      ? Math.max(0, Math.min(clicks, Math.floor(rawFever)))
      : 0;

    const rawHighestCombo = Number(req.body?.highestCombo ?? 0);
    if (Number.isFinite(rawHighestCombo) && rawHighestCombo > 0) {
      const safeCombo = Math.min(10_000, Math.floor(rawHighestCombo));
      fighter.progress.highestCombo = Math.max(fighter.progress.highestCombo, safeCombo);
    }

    const metrics = computeClickMetrics(fighter);

    // Click rewards (fever clicks grant 2x gold & XP)
    const normalClicks = clicks - feverClicks;
    const effectiveClicks = normalClicks + feverClicks * 2;
    const clickGold = Math.round(effectiveClicks * metrics.goldPerClick);
    const clickXp = Math.round(effectiveClicks * metrics.xpPerClick);

    // Passive auto-training income since lastActiveAt (capped per sync)
    const elapsedSeconds = Math.min(
      MAX_PASSIVE_SYNC_SECONDS,
      Math.max(0, (now - fighter.lastActiveAt) / 1000),
    );
    const passiveGold =
      metrics.autoGoldPerSec > 0 && elapsedSeconds >= 0.5
        ? Math.floor(metrics.autoGoldPerSec * elapsedSeconds)
        : 0;
    const passiveXp =
      metrics.autoXpPerSec > 0 && elapsedSeconds >= 0.5
        ? Math.floor(metrics.autoXpPerSec * elapsedSeconds)
        : 0;

    const goldEarned = clickGold + passiveGold;
    const xpEarned = clickXp + passiveXp;

    fighter.gold += goldEarned;
    fighter.progress.totalClicks += clicks;
    fighter.progress.totalGoldEarned += goldEarned;

    const levelResult = applyXpAndLevelUp(fighter, xpEarned);
    regenerateEnergy(fighter, now);
    fighter.lastActiveAt = now;

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({
      fighter: saved,
      goldEarned,
      xpEarned,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/player/settings — Persist audio / battle speed / accessibility settings
router.put('/settings', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const fighter = await getRequiredFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const incoming = (req.body?.settings && typeof req.body.settings === 'object')
      ? req.body.settings
      : (req.body ?? {});
    if (typeof incoming.soundEnabled === 'boolean') {
      fighter.settings.soundEnabled = incoming.soundEnabled;
    }
    if (typeof incoming.soundVolume === 'number' && Number.isFinite(incoming.soundVolume)) {
      fighter.settings.soundVolume = Math.max(0, Math.min(1, incoming.soundVolume));
    }
    fighter.settings.battleSpeed = 1;
    if (typeof incoming.reducedMotion === 'boolean') {
      fighter.settings.reducedMotion = incoming.reducedMotion;
    }

    fighter.lastActiveAt = Date.now();
    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/player/equip-skin — Equip an unlocked fighter skin
router.post('/equip-skin', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const skinId = typeof req.body?.skinId === 'string' ? req.body.skinId.trim() : '';
    if (!skinId) {
      res.status(400).json({ error: 'skinId requis.' });
      return;
    }

    const fighter = await getRequiredFighter(userId);
    if (!fighter) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const defaultSkin = fighter.gender === 'female' ? 'skin_female_dojo' : 'skin_male_dojo';
    const unlocked = Array.isArray(fighter.unlockedSkins)
      ? [...fighter.unlockedSkins]
      : [defaultSkin];
    if (!unlocked.includes(defaultSkin)) {
      unlocked.unshift(defaultSkin);
    }

    if (!unlocked.includes(skinId)) {
      res.status(400).json({ error: 'Tu dois d’abord acheter ce skin dans la boutique.' });
      return;
    }

    fighter.unlockedSkins = unlocked;
    fighter.equippedSkinId = skinId;
    fighter.lastActiveAt = Date.now();

    const saved = await db.saveFighter(userId, fighter);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/player/import-save — Disabled to prevent client-side JSON save tampering
router.post('/import-save', (_req, res) => {
  res.status(403).json({
    error: 'L’import de sauvegarde JSON est désactivé pour garantir l’équité du jeu.',
  });
});

// POST /api/player/reset — Reset fighter back to Lv1 while preserving server ID
router.post('/reset', async (req, res, next) => {
  try {
    const userId = req.authUserId!;
    const existing = await db.getFighterByUserId(userId);
    if (!existing) {
      res.status(404).json({ error: 'Combattant introuvable.' });
      return;
    }

    const fresh = createInitialFighter(existing.id, existing.name);
    const saved = await db.saveFighter(userId, fresh);
    res.status(200).json({ fighter: saved });
  } catch (err) {
    next(err);
  }
});

export default router;
