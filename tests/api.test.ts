import fs from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  BattleResult,
  EquipmentItem,
  FighterProfile,
  GameSessionPayload,
  LeaderboardEntry,
  ShopStockItem,
} from '../shared/types';

const tempDbPath = path.join(
  os.tmpdir(),
  `brute-legends-api-test-${process.pid}-${Date.now()}.json`,
);

let server: Server;
let baseUrl = '';

async function apiFetch<T>(
  route: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json()) as T;
  return { status: res.status, data };
}

describe('Backend REST API End-to-End Integration', () => {
  let token = '';
  let fighter: FighterProfile;
  let leaderboardEntries: LeaderboardEntry[] = [];
  let chestLootItem: EquipmentItem | null = null;

  beforeAll(async () => {
    // Isolate storage into a temporary local JSON DB before importing server modules
    process.env.DATABASE_URL = '';
    process.env.LOCAL_DB_PATH = tempDbPath;

    const { createApp } = await import('../server/index');
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    if (fs.existsSync(tempDbPath)) {
      fs.rmSync(tempDbPath, { force: true });
    }
  });

  it('GET /api/health returns healthy status', async () => {
    const res = await apiFetch<{ ok: boolean; status: string; storageMode: string }>('/api/health');
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.status).toBe('ok');
    expect(res.data.storageMode).toBe('local');
  });

  it('POST /api/auth/guest creates an instant Lv1 guest fighter & JWT token', async () => {
    const res = await apiFetch<GameSessionPayload>('/api/auth/guest', { method: 'POST' });
    expect(res.status).toBe(201);
    expect(res.data.token).toBeTruthy();
    expect(res.data.user.isGuest).toBe(true);
    expect(res.data.fighter.level).toBe(1);
    expect(res.data.fighter.equipped.weapon?.templateId).toBe('wpn_wooden_club');
    expect(res.data.fighter.equipped.armor?.templateId).toBe('arm_tunic');

    token = res.data.token!;
    fighter = res.data.fighter;
  });

  it('PUT /api/player/customize updates fighter name and appearance', async () => {
    const res = await apiFetch<{ fighter: FighterProfile }>('/api/player/customize', {
      method: 'PUT',
      token,
      body: {
        name: 'ChibiTesteur',
        appearance: {
          ...fighter.appearance,
          hairStyle: 'mohawk',
          hairColor: '#d9483b',
          eyeStyle: 'fierce',
          warCry: 'Victoire assurée !',
        },
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.fighter.name).toBe('ChibiTesteur');
    expect(res.data.fighter.appearance.hairStyle).toBe('mohawk');
    expect(res.data.fighter.appearance.hairColor).toBe('#d9483b');
    expect(res.data.fighter.appearance.warCry).toBe('Victoire assurée !');
    expect(res.data.fighter.isCustomized).toBe(true);
    fighter = res.data.fighter;
  });

  it('POST /api/player/allocate-stat spends starter stat points', async () => {
    const prevStr = fighter.baseStats.str;
    const prevPoints = fighter.statPoints;
    expect(prevPoints).toBeGreaterThanOrEqual(2);

    const res = await apiFetch<{ fighter: FighterProfile }>('/api/player/allocate-stat', {
      method: 'POST',
      token,
      body: { stat: 'str', amount: 2 },
    });

    expect(res.status).toBe(200);
    expect(res.data.fighter.baseStats.str).toBe(prevStr + 2);
    expect(res.data.fighter.statPoints).toBe(prevPoints - 2);
    fighter = res.data.fighter;
  });

  it('POST /api/player/click-sync awards gold & XP and increments totalClicks', async () => {
    const prevGold = fighter.gold;

    // Send 60 clicks + 60 clicks across two syncs so we also have plenty of gold for shop/forge/upgrades
    const first = await apiFetch<{
      fighter: FighterProfile;
      goldEarned: number;
      xpEarned: number;
    }>('/api/player/click-sync', {
      method: 'POST',
      token,
      body: { clicks: 60, feverClicks: 20, highestCombo: 35 },
    });

    expect(first.status).toBe(200);
    expect(first.data.goldEarned).toBeGreaterThan(0);
    expect(first.data.xpEarned).toBeGreaterThan(0);
    expect(first.data.fighter.gold).toBeGreaterThan(prevGold);
    expect(first.data.fighter.progress.totalClicks).toBe(60);
    expect(first.data.fighter.progress.highestCombo).toBe(35);

    const second = await apiFetch<{ fighter: FighterProfile }>('/api/player/click-sync', {
      method: 'POST',
      token,
      body: { clicks: 60, feverClicks: 30, highestCombo: 60 },
    });
    expect(second.status).toBe(200);
    expect(second.data.fighter.progress.totalClicks).toBe(120);
    fighter = second.data.fighter;
  });

  it('POST /api/combat/arena blocks locked opponents and awards 0 gold on defeat', async () => {
    // Next opponent (opp_kenshi_apprenti) MUST be locked before beating opp_petit_caillou
    const lockedRes = await apiFetch<{ error: string }>('/api/combat/arena', {
      method: 'POST',
      token,
      body: { opponentId: 'opp_kenshi_apprenti' },
    });
    expect(lockedRes.status).toBe(400);

    // First opponent (opp_petit_caillou) is unlocked
    const res = await apiFetch<{ battle: BattleResult; fighter: FighterProfile }>(
      '/api/combat/arena',
      {
        method: 'POST',
        token,
        body: { opponentId: 'opp_petit_caillou' },
      },
    );

    expect(res.status).toBe(200);
    expect(res.data.battle.right.id).toBe('opp_petit_caillou');
    expect(['left', 'right']).toContain(res.data.battle.winner);
    expect(res.data.battle.events.length).toBeGreaterThan(2);
    if (res.data.battle.winner === 'left') {
      expect(res.data.battle.rewards.gold).toBeGreaterThan(0);
      expect(res.data.fighter.progress.defeatedOpponentIds).toContain('opp_petit_caillou');
    } else {
      expect(res.data.battle.rewards.gold).toBe(0);
    }
    expect(res.data.battle.rewards.xp).toBeGreaterThan(0);
    expect(res.data.fighter.progress.arenaBattles).toBe(1);
    fighter = res.data.fighter;
  });

  it('GET /api/leaderboard returns ranked entries including our player and seeded rivals', async () => {
    const res = await apiFetch<{ entries: LeaderboardEntry[] }>('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.data.entries.length).toBeGreaterThan(5);

    const me = res.data.entries.find((e) => e.playerId === fighter.id);
    expect(me).toBeDefined();
    expect(me?.name).toBe('ChibiTesteur');
    expect(me?.isBot).toBe(false);

    const rivals = res.data.entries.filter((e) => e.isBot);
    expect(rivals.length).toBeGreaterThan(0);

    // Ranks are strictly 1..N
    res.data.entries.forEach((entry, idx) => {
      expect(entry.rank).toBe(idx + 1);
    });

    leaderboardEntries = res.data.entries;
  });

  it('POST /api/combat/pvp fights a rival from the leaderboard', async () => {
    const rival = leaderboardEntries.find((e) => e.playerId !== fighter.id);
    expect(rival).toBeDefined();

    const res = await apiFetch<{ battle: BattleResult; fighter: FighterProfile }>(
      '/api/combat/pvp',
      {
        method: 'POST',
        token,
        body: { targetPlayerId: rival!.playerId },
      },
    );

    expect(res.status).toBe(200);
    expect(res.data.battle.right.id).toBe(rival!.playerId);
    expect(res.data.battle.events.length).toBeGreaterThan(2);
    if (res.data.battle.winner !== 'left') {
      expect(res.data.battle.rewards.gold).toBe(0);
    }
    expect(res.data.fighter.progress.pvpWins + res.data.fighter.progress.pvpLosses).toBe(1);
    fighter = res.data.fighter;
  });

  it('GET /api/shop, POST /api/shop/open-chest, POST /api/inventory/equip & /forge work end-to-end', async () => {
    // Earn enough gold via click-sync under the tighter economy for chest + forge + skill tests
    for (let i = 0; i < 4 && fighter.gold < 500; i++) {
      const topUp = await apiFetch<{ fighter: FighterProfile }>('/api/player/click-sync', {
        method: 'POST',
        token,
        body: { clicks: 60, feverClicks: 60, highestCombo: 60 },
      });
      fighter = topUp.data.fighter;
    }

    // 1. Fetch shop
    const shopRes = await apiFetch<{
      stock: ShopStockItem[];
      chests: { id: string; price: number }[];
      refreshCostGold: number;
    }>('/api/shop', { token });
    expect(shopRes.status).toBe(200);
    expect(shopRes.data.stock).toHaveLength(6);
    expect(shopRes.data.chests.length).toBeGreaterThanOrEqual(3);

    // 2. Open gold chest (chest_dojo = 250 gold)
    expect(fighter.gold).toBeGreaterThanOrEqual(250);
    const chestRes = await apiFetch<{ fighter: FighterProfile; item: EquipmentItem }>(
      '/api/shop/open-chest',
      {
        method: 'POST',
        token,
        body: { chestId: 'chest_dojo' },
      },
    );
    expect(chestRes.status).toBe(200);
    expect(chestRes.data.item.uid).toBeTruthy();
    expect(chestRes.data.fighter.inventory.some((i) => i.uid === chestRes.data.item.uid)).toBe(
      true,
    );
    chestLootItem = chestRes.data.item;
    fighter = chestRes.data.fighter;

    // 3. Equip the looted item
    const equipRes = await apiFetch<{ fighter: FighterProfile }>('/api/inventory/equip', {
      method: 'POST',
      token,
      body: { itemUid: chestLootItem.uid },
    });
    expect(equipRes.status).toBe(200);
    expect(equipRes.data.fighter.equipped[chestLootItem.slot]?.uid).toBe(chestLootItem.uid);
    fighter = equipRes.data.fighter;

    // 4. Forge the equipped weapon (+1)
    const weaponUid = fighter.equipped.weapon?.uid ?? chestLootItem.uid;
    const prevGold = fighter.gold;
    const forgeRes = await apiFetch<{
      fighter: FighterProfile;
      item: EquipmentItem;
      cost: number;
    }>('/api/inventory/forge', {
      method: 'POST',
      token,
      body: { itemUid: weaponUid },
    });
    expect(forgeRes.status).toBe(200);
    expect(forgeRes.data.item.upgradeLevel).toBe(1);
    expect(forgeRes.data.cost).toBeGreaterThan(0);
    expect(forgeRes.data.fighter.gold).toBe(prevGold - forgeRes.data.cost);
    fighter = forgeRes.data.fighter;
  });

  it('POST /api/upgrades/buy and POST /api/skills/upgrade progress the fighter', async () => {
    const upgRes = await apiFetch<{ fighter: FighterProfile }>('/api/upgrades/buy', {
      method: 'POST',
      token,
      body: { upgradeId: 'click_steel_fists' },
    });
    expect(upgRes.status).toBe(200);
    expect(upgRes.data.fighter.upgrades.click_steel_fists).toBe(1);
    expect(upgRes.data.fighter.progress.upgradesBought).toBe(1);
    fighter = upgRes.data.fighter;

    const skillRes = await apiFetch<{ fighter: FighterProfile }>('/api/skills/upgrade', {
      method: 'POST',
      token,
      body: { skillId: 'meteor_strike' },
    });
    expect(skillRes.status).toBe(200);
    expect(skillRes.data.fighter.skills.meteor_strike).toBe(1);
    expect(skillRes.data.fighter.equippedSkills).toContain('meteor_strike');
    fighter = skillRes.data.fighter;
  });

  it('POST /api/missions/daily-claim and POST /api/missions/claim grant rewards and prevent double-claim', async () => {
    // Claim daily reward (Day 1)
    const dailyRes = await apiFetch<{
      fighter: FighterProfile;
      reward: { day: number; gold: number; gems: number; xp: number };
    }>('/api/missions/daily-claim', {
      method: 'POST',
      token,
    });
    expect(dailyRes.status).toBe(200);
    expect(dailyRes.data.fighter.dailyStreak).toBe(1);
    expect(dailyRes.data.reward.day).toBe(1);
    fighter = dailyRes.data.fighter;

    // Duplicate daily claim rejected
    const dupDaily = await apiFetch<{ error: string }>('/api/missions/daily-claim', {
      method: 'POST',
      token,
    });
    expect(dupDaily.status).toBe(400);

    // Claim completed click mission (mis_clicks_25 -> target 25, we did 120)
    const misClickRes = await apiFetch<{
      fighter: FighterProfile;
      reward: { gold: number; gems: number; xp: number };
    }>('/api/missions/claim', {
      method: 'POST',
      token,
      body: { missionId: 'mis_clicks_25' },
    });
    expect(misClickRes.status).toBe(200);
    expect(misClickRes.data.fighter.claimedMissions).toContain('mis_clicks_25');
    expect(misClickRes.data.reward.gold).toBeGreaterThan(0);

    // Claim completed first arena battle mission (mis_arena_first_battle -> target 1)
    const misArenaRes = await apiFetch<{ fighter: FighterProfile }>('/api/missions/claim', {
      method: 'POST',
      token,
      body: { missionId: 'mis_arena_first_battle' },
    });
    expect(misArenaRes.status).toBe(200);
    expect(misArenaRes.data.fighter.claimedMissions).toContain('mis_arena_first_battle');
    fighter = misArenaRes.data.fighter;

    // Duplicate mission claim rejected
    const dupMission = await apiFetch<{ error: string }>('/api/missions/claim', {
      method: 'POST',
      token,
      body: { missionId: 'mis_clicks_25' },
    });
    expect(dupMission.status).toBe(400);
  });

  it('POST /api/auth/register upgrades guest preserving progress and POST /api/auth/login restores it', async () => {
    const savedFighterId = fighter.id;
    const savedClicks = fighter.progress.totalClicks;
    const savedSkillLvl = fighter.skills.meteor_strike;

    const regRes = await apiFetch<GameSessionPayload>('/api/auth/register', {
      method: 'POST',
      token,
      body: {
        username: 'HeroQA99',
        email: 'heroqa99@example.com',
        password: 'SuperPassword123',
      },
    });

    expect(regRes.status).toBe(200);
    expect(regRes.data.user.isGuest).toBe(false);
    expect(regRes.data.user.username).toBe('HeroQA99');
    expect(regRes.data.fighter.id).toBe(savedFighterId);
    expect(regRes.data.fighter.name).toBe('ChibiTesteur');
    expect(regRes.data.fighter.progress.totalClicks).toBe(savedClicks);
    expect(regRes.data.fighter.skills.meteor_strike).toBe(savedSkillLvl);

    // Invalid password must be rejected
    const badLogin = await apiFetch<{ error: string }>('/api/auth/login', {
      method: 'POST',
      body: { username: 'HeroQA99', password: 'WrongPassword' },
    });
    expect(badLogin.status).toBe(401);

    // Valid login restores the exact same fighter & progress
    const loginRes = await apiFetch<GameSessionPayload>('/api/auth/login', {
      method: 'POST',
      body: { username: 'HeroQA99', password: 'SuperPassword123' },
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.token).toBeTruthy();
    expect(loginRes.data.user.username).toBe('HeroQA99');
    expect(loginRes.data.fighter.id).toBe(savedFighterId);
    expect(loginRes.data.fighter.progress.totalClicks).toBe(savedClicks);
    expect(loginRes.data.fighter.claimedMissions).toContain('mis_clicks_25');

    // Unauthenticated protected route must return 401
    const unauth = await apiFetch<{ error: string }>('/api/auth/me');
    expect(unauth.status).toBe(401);
  });
});
