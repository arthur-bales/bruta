import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { computeDerivedStats } from '../../shared/progression';
import type { ArenaTheme, EquipmentItem, FighterProfile } from '../../shared/types';
import { CONFIG } from '../config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbUser {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string | null;
  isGuest: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DbBattleRecord {
  id: string;
  leftFighterId: string;
  rightFighterId: string;
  winner: 'left' | 'right';
  arena: ArenaTheme;
  seed: number;
  isPvp: boolean;
  summary: Record<string, unknown>;
  createdAt: number;
}

export interface DatabaseAdapter {
  init(): Promise<void>;
  getStorageMode(): 'postgres' | 'local';
  findUserById(id: string): Promise<DbUser | null>;
  findUserByUsername(username: string): Promise<DbUser | null>;
  findUserByEmail(email: string): Promise<DbUser | null>;
  createUser(user: DbUser): Promise<DbUser>;
  updateUser(user: DbUser): Promise<DbUser>;
  getFighterByUserId(userId: string): Promise<FighterProfile | null>;
  getFighterById(fighterId: string): Promise<FighterProfile | null>;
  saveFighter(userId: string, fighter: FighterProfile): Promise<FighterProfile>;
  listTopFighters(limit: number): Promise<FighterProfile[]>;
  recordBattle(record: DbBattleRecord): Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function computeFighterMetrics(fighter: FighterProfile): {
  powerScore: number;
  wins: number;
  losses: number;
} {
  const derived = computeDerivedStats(
    fighter.baseStats,
    fighter.level,
    fighter.equipped,
    fighter.skills,
    fighter.upgrades,
  );
  const wins = (fighter.progress?.arenaWins ?? 0) + (fighter.progress?.pvpWins ?? 0);
  const losses = (fighter.progress?.arenaLosses ?? 0) + (fighter.progress?.pvpLosses ?? 0);
  return {
    powerScore: derived.powerScore,
    wins,
    losses,
  };
}

// ============================================================================
// Neon / PostgreSQL Adapter
// ============================================================================

interface PgUserRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  is_guest: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapPgUser(row: PgUserRow): DbUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    passwordHash: row.password_hash ?? null,
    isGuest: Boolean(row.is_guest),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

class PostgresDatabaseAdapter implements DatabaseAdapter {
  private pool: Pool;
  private initialized = false;

  constructor(connectionString: string) {
    const isLocalhost =
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    this.pool = new Pool({
      connectionString,
      ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  getStorageMode(): 'postgres' | 'local' {
    return 'postgres';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await this.pool.query(schemaSql);
    this.initialized = true;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const res = await this.pool.query<PgUserRow>(
      'SELECT id, username, email, password_hash, is_guest, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id],
    );
    return res.rows[0] ? mapPgUser(res.rows[0]) : null;
  }

  async findUserByUsername(username: string): Promise<DbUser | null> {
    const res = await this.pool.query<PgUserRow>(
      'SELECT id, username, email, password_hash, is_guest, created_at, updated_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [username.trim()],
    );
    return res.rows[0] ? mapPgUser(res.rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<DbUser | null> {
    const res = await this.pool.query<PgUserRow>(
      'SELECT id, username, email, password_hash, is_guest, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()],
    );
    return res.rows[0] ? mapPgUser(res.rows[0]) : null;
  }

  async createUser(user: DbUser): Promise<DbUser> {
    const res = await this.pool.query<PgUserRow>(
      `INSERT INTO users (id, username, email, password_hash, is_guest, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0))
       RETURNING id, username, email, password_hash, is_guest, created_at, updated_at`,
      [
        user.id,
        user.username,
        user.email,
        user.passwordHash,
        user.isGuest,
        user.createdAt,
        user.updatedAt,
      ],
    );
    return mapPgUser(res.rows[0]);
  }

  async updateUser(user: DbUser): Promise<DbUser> {
    const res = await this.pool.query<PgUserRow>(
      `UPDATE users
       SET username = $2,
           email = $3,
           password_hash = $4,
           is_guest = $5,
           updated_at = to_timestamp($6 / 1000.0)
       WHERE id = $1
       RETURNING id, username, email, password_hash, is_guest, created_at, updated_at`,
      [
        user.id,
        user.username,
        user.email,
        user.passwordHash,
        user.isGuest,
        user.updatedAt,
      ],
    );
    return mapPgUser(res.rows[0]);
  }

  async getFighterByUserId(userId: string): Promise<FighterProfile | null> {
    const res = await this.pool.query<{ profile_json: FighterProfile }>(
      'SELECT profile_json FROM fighters WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    return res.rows[0] ? clone(res.rows[0].profile_json) : null;
  }

  async getFighterById(fighterId: string): Promise<FighterProfile | null> {
    const res = await this.pool.query<{ profile_json: FighterProfile }>(
      'SELECT profile_json FROM fighters WHERE id = $1 LIMIT 1',
      [fighterId],
    );
    return res.rows[0] ? clone(res.rows[0].profile_json) : null;
  }

  async saveFighter(userId: string, fighter: FighterProfile): Promise<FighterProfile> {
    const copy = clone(fighter);
    const { powerScore, wins, losses } = computeFighterMetrics(copy);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO fighters (id, user_id, name, level, rating, power_score, wins, losses, profile_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           id = EXCLUDED.id,
           name = EXCLUDED.name,
           level = EXCLUDED.level,
           rating = EXCLUDED.rating,
           power_score = EXCLUDED.power_score,
           wins = EXCLUDED.wins,
           losses = EXCLUDED.losses,
           profile_json = EXCLUDED.profile_json,
           updated_at = NOW()`,
        [
          copy.id,
          userId,
          copy.name,
          copy.level,
          copy.rating,
          powerScore,
          wins,
          losses,
          JSON.stringify(copy),
        ],
      );

      // Keep normalized inventory_items mirror in sync for analytics & SQL queries
      await client.query('DELETE FROM inventory_items WHERE fighter_id = $1', [copy.id]);
      const allItems: Array<{ item: EquipmentItem; equipped: boolean }> = [];
      for (const equippedItem of Object.values(copy.equipped)) {
        if (equippedItem) {
          allItems.push({ item: equippedItem, equipped: true });
        }
      }
      for (const invItem of copy.inventory) {
        allItems.push({ item: invItem, equipped: false });
      }

      for (const entry of allItems) {
        await client.query(
          `INSERT INTO inventory_items (uid, fighter_id, template_id, slot, rarity, upgrade_level, is_equipped, item_json, acquired_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, to_timestamp($9 / 1000.0))
           ON CONFLICT (uid) DO UPDATE SET
             upgrade_level = EXCLUDED.upgrade_level,
             is_equipped = EXCLUDED.is_equipped,
             item_json = EXCLUDED.item_json`,
          [
            entry.item.uid,
            copy.id,
            entry.item.templateId,
            entry.item.slot,
            entry.item.rarity,
            entry.item.upgradeLevel,
            entry.equipped,
            JSON.stringify(entry.item),
            entry.item.acquiredAt || Date.now(),
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return copy;
  }

  async listTopFighters(limit: number): Promise<FighterProfile[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const res = await this.pool.query<{ profile_json: FighterProfile }>(
      'SELECT profile_json FROM fighters ORDER BY rating DESC, level DESC, power_score DESC LIMIT $1',
      [safeLimit],
    );
    return res.rows.map((r) => clone(r.profile_json));
  }

  async recordBattle(record: DbBattleRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO battle_history (id, left_fighter_id, right_fighter_id, winner, arena, seed, is_pvp, summary_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, to_timestamp($9 / 1000.0))
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.leftFighterId,
        record.rightFighterId,
        record.winner,
        record.arena,
        record.seed,
        record.isPvp,
        JSON.stringify(record.summary),
        record.createdAt,
      ],
    );
  }
}

// ============================================================================
// Atomic Persistent Local JSON Store (Zero-config dev & testing fallback)
// ============================================================================

interface LocalStoreData {
  users: Record<string, DbUser>;
  fightersByUserId: Record<string, FighterProfile>;
  battles: DbBattleRecord[];
}

const MAX_LOCAL_BATTLES = 500;

class LocalJsonDatabaseAdapter implements DatabaseAdapter {
  private readonly filePath: string;
  private initialized = false;
  private writeQueue: Promise<void> = Promise.resolve();
  private cache: LocalStoreData = {
    users: {},
    fightersByUserId: {},
    battles: [],
  };

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      (process.env.LOCAL_DB_PATH
        ? path.resolve(process.env.LOCAL_DB_PATH)
        : path.resolve(__dirname, '../data/db.json'));
  }

  getStorageMode(): 'postgres' | 'local' {
    return 'local';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
        this.cache = {
          users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
          fightersByUserId:
            parsed.fightersByUserId && typeof parsed.fightersByUserId === 'object'
              ? parsed.fightersByUserId
              : {},
          battles: Array.isArray(parsed.battles) ? parsed.battles : [],
        };
      } catch {
        this.cache = { users: {}, fightersByUserId: {}, battles: [] };
        await this.persist();
      }
    } else {
      await this.persist();
    }

    this.initialized = true;
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.cache, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random()
        .toString(36)
        .slice(2)}.tmp`;
      await fs.promises.writeFile(tmpPath, snapshot, 'utf-8');
      await fs.promises.rename(tmpPath, this.filePath);
    });
    return this.writeQueue;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const found = this.cache.users[id];
    return found ? clone(found) : null;
  }

  async findUserByUsername(username: string): Promise<DbUser | null> {
    const needle = username.trim().toLowerCase();
    for (const user of Object.values(this.cache.users)) {
      if (user.username.toLowerCase() === needle) {
        return clone(user);
      }
    }
    return null;
  }

  async findUserByEmail(email: string): Promise<DbUser | null> {
    const needle = email.trim().toLowerCase();
    for (const user of Object.values(this.cache.users)) {
      if (user.email && user.email.toLowerCase() === needle) {
        return clone(user);
      }
    }
    return null;
  }

  async createUser(user: DbUser): Promise<DbUser> {
    const copy = clone(user);
    this.cache.users[copy.id] = copy;
    await this.persist();
    return clone(copy);
  }

  async updateUser(user: DbUser): Promise<DbUser> {
    const copy = clone(user);
    this.cache.users[copy.id] = copy;
    await this.persist();
    return clone(copy);
  }

  async getFighterByUserId(userId: string): Promise<FighterProfile | null> {
    const fighter = this.cache.fightersByUserId[userId];
    return fighter ? clone(fighter) : null;
  }

  async getFighterById(fighterId: string): Promise<FighterProfile | null> {
    for (const fighter of Object.values(this.cache.fightersByUserId)) {
      if (fighter.id === fighterId) {
        return clone(fighter);
      }
    }
    return null;
  }

  async saveFighter(userId: string, fighter: FighterProfile): Promise<FighterProfile> {
    const copy = clone(fighter);
    this.cache.fightersByUserId[userId] = copy;
    await this.persist();
    return clone(copy);
  }

  async listTopFighters(limit: number): Promise<FighterProfile[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    return Object.values(this.cache.fightersByUserId)
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.level !== a.level) return b.level - a.level;
        return computeFighterMetrics(b).powerScore - computeFighterMetrics(a).powerScore;
      })
      .slice(0, safeLimit)
      .map((f) => clone(f));
  }

  async recordBattle(record: DbBattleRecord): Promise<void> {
    this.cache.battles.unshift(clone(record));
    if (this.cache.battles.length > MAX_LOCAL_BATTLES) {
      this.cache.battles.length = MAX_LOCAL_BATTLES;
    }
    await this.persist();
  }
}

export const db: DatabaseAdapter = CONFIG.isPostgres
  ? new PostgresDatabaseAdapter(CONFIG.databaseUrl)
  : new LocalJsonDatabaseAdapter();

let initPromise: Promise<void> | null = null;

export function ensureDatabaseReady(): Promise<void> {
  if (!initPromise) {
    initPromise = db.init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
