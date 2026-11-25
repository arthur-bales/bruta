import type {
  AuthUserSummary,
  BattleResult,
  CoreStats,
  EquipmentItem,
  EquipmentSlot,
  FighterAppearance,
  FighterProfile,
  GameSessionPayload,
  LeaderboardEntry,
  OpponentDefinition,
  PlayerSettings,
  ShopStockItem,
} from '@shared/types';
import type { ChestOffer } from '@shared/progression';

const TOKEN_STORAGE_KEY = 'brute_legends_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      'Impossible de contacter le serveur de l’arène. Vérifie ta connexion.',
      0,
    );
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const serverMsg =
      payload && typeof payload === 'object'
        ? ((payload as { error?: string; message?: string }).error ||
          (payload as { error?: string; message?: string }).message)
        : undefined;

    if (serverMsg) {
      throw new ApiError(serverMsg, response.status);
    }
    if (response.status === 401) {
      throw new ApiError('Session expirée. Reconnexion en cours…', 401);
    }
    if (response.status === 404) {
      throw new ApiError('Ressource introuvable sur le serveur.', 404);
    }
    if (response.status >= 500) {
      throw new ApiError('Le serveur de l’arène a rencontré une erreur interne.', response.status);
    }
    throw new ApiError(`Erreur de requête (${response.status}).`, response.status);
  }

  return payload as T;
}

export interface ClickSyncResponse {
  fighter: FighterProfile;
  goldEarned: number;
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
}

export interface ShopPayload {
  stock: ShopStockItem[];
  chests: ChestOffer[];
  refreshCostGold: number;
}

export interface MissionClaimResponse {
  fighter: FighterProfile;
  reward: {
    gold: number;
    gems: number;
    xp: number;
  };
}

export interface DailyClaimResponse {
  fighter: FighterProfile;
  reward: {
    day: number;
    title: string;
    gold: number;
    gems: number;
    xp: number;
    chestRarity?: string;
    icon?: string;
  };
  bonusItem: EquipmentItem | null;
  leveledUp?: boolean;
  newLevel?: number;
}

export const apiClient = {
  // ---------------- Auth ----------------
  createGuest(): Promise<GameSessionPayload> {
    return apiRequest<GameSessionPayload>('/api/auth/guest', { method: 'POST' });
  },

  register(body: {
    username: string;
    email?: string;
    password: string;
  }): Promise<GameSessionPayload> {
    return apiRequest<GameSessionPayload>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  login(body: { username: string; password: string }): Promise<GameSessionPayload> {
    return apiRequest<GameSessionPayload>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getMe(): Promise<GameSessionPayload> {
    return apiRequest<GameSessionPayload>('/api/auth/me', { method: 'GET' });
  },

  // ---------------- Player ----------------
  customizeFighter(body: {
    name: string;
    title?: string;
    appearance: FighterAppearance;
  }): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/player/customize', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  allocateStat(body: {
    stat: keyof CoreStats;
    amount?: number;
  }): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/player/allocate-stat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  syncClicks(body: {
    clicks: number;
    feverClicks?: number;
    highestCombo?: number;
  }): Promise<ClickSyncResponse> {
    return apiRequest<ClickSyncResponse>('/api/player/click-sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateSettings(settings: Partial<PlayerSettings>): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/player/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  importSave(fighter: FighterProfile): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/player/import-save', {
      method: 'POST',
      body: JSON.stringify({ fighter }),
    });
  },

  resetFighter(): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/player/reset', {
      method: 'POST',
    });
  },

  // ---------------- Combat ----------------
  getOpponents(): Promise<{ opponents: OpponentDefinition[] }> {
    return apiRequest<{ opponents: OpponentDefinition[] }>('/api/combat/opponents', {
      method: 'GET',
    });
  },

  fightArena(opponentId: string): Promise<{ battle: BattleResult; fighter: FighterProfile }> {
    return apiRequest<{ battle: BattleResult; fighter: FighterProfile }>('/api/combat/arena', {
      method: 'POST',
      body: JSON.stringify({ opponentId }),
    });
  },

  fightPvp(targetPlayerId: string): Promise<{ battle: BattleResult; fighter: FighterProfile }> {
    return apiRequest<{ battle: BattleResult; fighter: FighterProfile }>('/api/combat/pvp', {
      method: 'POST',
      body: JSON.stringify({ targetPlayerId }),
    });
  },

  // ---------------- Inventory ----------------
  equipItem(itemUid: string): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/inventory/equip', {
      method: 'POST',
      body: JSON.stringify({ itemUid }),
    });
  },

  unequipItem(slot: EquipmentSlot): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/inventory/unequip', {
      method: 'POST',
      body: JSON.stringify({ slot }),
    });
  },

  sellItem(itemUid: string): Promise<{ fighter: FighterProfile; goldEarned: number }> {
    return apiRequest<{ fighter: FighterProfile; goldEarned: number }>('/api/inventory/sell', {
      method: 'POST',
      body: JSON.stringify({ itemUid }),
    });
  },

  forgeItem(
    itemUid: string,
  ): Promise<{ fighter: FighterProfile; item: EquipmentItem; cost: number }> {
    return apiRequest<{ fighter: FighterProfile; item: EquipmentItem; cost: number }>(
      '/api/inventory/forge',
      {
        method: 'POST',
        body: JSON.stringify({ itemUid }),
      },
    );
  },

  // ---------------- Shop ----------------
  getShop(): Promise<ShopPayload> {
    return apiRequest<ShopPayload>('/api/shop', { method: 'GET' });
  },

  buyShopItem(
    stockId: string,
  ): Promise<{ fighter: FighterProfile; item: EquipmentItem; stock: ShopStockItem[] }> {
    return apiRequest<{ fighter: FighterProfile; item: EquipmentItem; stock: ShopStockItem[] }>(
      '/api/shop/buy',
      {
        method: 'POST',
        body: JSON.stringify({ stockId }),
      },
    );
  },

  refreshShop(): Promise<{ fighter: FighterProfile; stock: ShopStockItem[] }> {
    return apiRequest<{ fighter: FighterProfile; stock: ShopStockItem[] }>('/api/shop/refresh', {
      method: 'POST',
    });
  },

  openChest(chestId: string): Promise<{ fighter: FighterProfile; item: EquipmentItem }> {
    return apiRequest<{ fighter: FighterProfile; item: EquipmentItem }>('/api/shop/open-chest', {
      method: 'POST',
      body: JSON.stringify({ chestId }),
    });
  },

  // ---------------- Skills & Upgrades ----------------
  upgradeSkill(skillId: string): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/skills/upgrade', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    });
  },

  toggleEquipSkill(skillId: string): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/skills/toggle-equip', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    });
  },

  buyUpgrade(upgradeId: string): Promise<{ fighter: FighterProfile }> {
    return apiRequest<{ fighter: FighterProfile }>('/api/upgrades/buy', {
      method: 'POST',
      body: JSON.stringify({ upgradeId }),
    });
  },

  // ---------------- Missions & Leaderboard ----------------
  claimMission(missionId: string): Promise<MissionClaimResponse> {
    return apiRequest<MissionClaimResponse>('/api/missions/claim', {
      method: 'POST',
      body: JSON.stringify({ missionId }),
    });
  },

  claimDailyReward(): Promise<DailyClaimResponse> {
    return apiRequest<DailyClaimResponse>('/api/missions/daily-claim', {
      method: 'POST',
    });
  },

  getLeaderboard(): Promise<{ entries: LeaderboardEntry[] }> {
    return apiRequest<{ entries: LeaderboardEntry[] }>('/api/leaderboard', {
      method: 'GET',
    });
  },
};

export type { AuthUserSummary };
