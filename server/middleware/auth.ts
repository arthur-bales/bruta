import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { db, type DbUser } from '../db/database.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '30d';

export interface AuthTokenPayload {
  sub: string;
  username: string;
  isGuest: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authUser?: DbUser;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: {
  id: string;
  username: string;
  isGuest: boolean;
}): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    username: user.username,
    isGuest: user.isGuest,
  };
  return jwt.sign(payload, CONFIG.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, CONFIG.jwtSecret);
    if (typeof decoded !== 'object' || decoded === null || typeof decoded.sub !== 'string') {
      return null;
    }
    return {
      sub: decoded.sub,
      username: typeof decoded.username === 'string' ? decoded.username : '',
      isGuest: Boolean(decoded.isGuest),
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise (token manquant).' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expirée ou token invalide.' });
    return;
  }

  try {
    const user = await db.findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'Compte introuvable.' });
      return;
    }

    req.authUserId = user.id;
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
