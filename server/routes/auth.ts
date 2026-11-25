import crypto from 'crypto';
import { Router } from 'express';
import {
  applyXpAndLevelUp,
  computeOfflineEarnings,
  createInitialFighter,
  regenerateEnergy,
} from '../../shared/progression.js';
import type {
  AuthUserSummary,
  FighterProfile,
  GameSessionPayload,
  OfflineEarningsSummary,
} from '../../shared/types.js';
import { db, type DbUser } from '../db/database.js';
import {
  extractBearerToken,
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
  verifyToken,
} from '../middleware/auth.js';

const router = Router();

function toAuthUserSummary(user: DbUser): AuthUserSummary {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isGuest: user.isGuest,
  };
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function generateGuestUsername(): string {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `Brute_${code}`;
}

async function prepareSessionFighter(
  userId: string,
  fallbackName: string,
): Promise<{ fighter: FighterProfile; offlineEarnings: OfflineEarningsSummary | null }> {
  const now = Date.now();
  let fighter = await db.getFighterByUserId(userId);
  if (!fighter) {
    fighter = createInitialFighter(generateId('ftr'), fallbackName);
  }

  regenerateEnergy(fighter, now);
  const offlineEarnings = computeOfflineEarnings(fighter, now);
  if (offlineEarnings) {
    fighter.gold += offlineEarnings.goldEarned;
    fighter.progress.totalGoldEarned += offlineEarnings.goldEarned;
    applyXpAndLevelUp(fighter, offlineEarnings.xpEarned);
  }

  fighter.lastActiveAt = now;
  const saved = await db.saveFighter(userId, fighter);
  return { fighter: saved, offlineEarnings };
}

// POST /api/auth/guest — Instant-start guest session
router.post('/guest', async (_req, res, next) => {
  try {
    const now = Date.now();
    const userId = generateId('usr');
    let username = generateGuestUsername();
    // Ensure uniqueness in the rare case of collision
    while (await db.findUserByUsername(username)) {
      username = generateGuestUsername();
    }

    const user = await db.createUser({
      id: userId,
      username,
      email: null,
      passwordHash: null,
      isGuest: true,
      createdAt: now,
      updatedAt: now,
    });

    const fighter = createInitialFighter(generateId('ftr'), username);
    const savedFighter = await db.saveFighter(user.id, fighter);
    const token = signToken(user);

    const payload: GameSessionPayload = {
      token,
      user: toAuthUserSummary(user),
      fighter: savedFighter,
      offlineEarnings: null,
      storageMode: db.getStorageMode(),
    };
    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register — Create new account OR upgrade existing guest account in-place
router.post('/register', async (req, res, next) => {
  try {
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (rawUsername.length < 3 || rawUsername.length > 24) {
      res.status(400).json({ error: 'Le pseudo doit contenir entre 3 et 24 caractères.' });
      return;
    }

    if (!/^[\p{L}\p{N}_\- ]+$/u.test(rawUsername)) {
      res.status(400).json({
        error: 'Le pseudo ne doit contenir que des lettres, chiffres, espaces, - ou _.',
      });
      return;
    }

    if (rawPassword.length < 6 || rawPassword.length > 128) {
      res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 6 caractères.',
      });
      return;
    }

    const email: string | null = rawEmail.length > 0 ? rawEmail : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Adresse email invalide.' });
      return;
    }

    // Check if upgrading an existing guest session via Bearer token
    let guestUser: DbUser | null = null;
    const bearer = extractBearerToken(req);
    if (bearer) {
      const tokenPayload = verifyToken(bearer);
      if (tokenPayload) {
        const candidate = await db.findUserById(tokenPayload.sub);
        if (candidate && candidate.isGuest) {
          guestUser = candidate;
        }
      }
    }

    // Validate username uniqueness
    const existingByName = await db.findUserByUsername(rawUsername);
    if (existingByName && (!guestUser || existingByName.id !== guestUser.id)) {
      res.status(409).json({ error: 'Ce pseudo est déjà utilisé.' });
      return;
    }

    // Validate email uniqueness
    if (email) {
      const existingByEmail = await db.findUserByEmail(email);
      if (existingByEmail && (!guestUser || existingByEmail.id !== guestUser.id)) {
        res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
        return;
      }
    }

    const passwordHash = await hashPassword(rawPassword);
    const now = Date.now();

    if (guestUser) {
      const upgraded = await db.updateUser({
        ...guestUser,
        username: rawUsername,
        email,
        passwordHash,
        isGuest: false,
        updatedAt: now,
      });

      const { fighter, offlineEarnings } = await prepareSessionFighter(upgraded.id, rawUsername);
      if (!fighter.isCustomized && fighter.name.startsWith('Brute_')) {
        fighter.name = rawUsername.slice(0, 20);
        await db.saveFighter(upgraded.id, fighter);
      }

      const token = signToken(upgraded);
      const payload: GameSessionPayload = {
        token,
        user: toAuthUserSummary(upgraded),
        fighter,
        offlineEarnings,
        storageMode: db.getStorageMode(),
      };
      res.status(200).json(payload);
      return;
    }

    // Create brand-new registered account
    const user = await db.createUser({
      id: generateId('usr'),
      username: rawUsername,
      email,
      passwordHash,
      isGuest: false,
      createdAt: now,
      updatedAt: now,
    });

    const fighter = createInitialFighter(generateId('ftr'), rawUsername.slice(0, 20));
    const savedFighter = await db.saveFighter(user.id, fighter);
    const token = signToken(user);

    const payload: GameSessionPayload = {
      token,
      user: toAuthUserSummary(user),
      fighter: savedFighter,
      offlineEarnings: null,
      storageMode: db.getStorageMode(),
    };
    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — Authenticate existing user
router.post('/login', async (req, res, next) => {
  try {
    const rawIdentifier =
      typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : typeof req.body?.email === 'string'
          ? req.body.email.trim()
          : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!rawIdentifier || !rawPassword) {
      res.status(400).json({ error: 'Pseudo et mot de passe requis.' });
      return;
    }

    let user = await db.findUserByUsername(rawIdentifier);
    if (!user && rawIdentifier.includes('@')) {
      user = await db.findUserByEmail(rawIdentifier);
    }

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const ok = await verifyPassword(rawPassword, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const { fighter, offlineEarnings } = await prepareSessionFighter(user.id, user.username);
    const token = signToken(user);

    const payload: GameSessionPayload = {
      token,
      user: toAuthUserSummary(user),
      fighter,
      offlineEarnings,
      storageMode: db.getStorageMode(),
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — Restore current authenticated session + offline earnings
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = req.authUser!;
    const { fighter, offlineEarnings } = await prepareSessionFighter(user.id, user.username);

    const payload: GameSessionPayload = {
      user: toAuthUserSummary(user),
      fighter,
      offlineEarnings,
      storageMode: db.getStorageMode(),
    };
    res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
