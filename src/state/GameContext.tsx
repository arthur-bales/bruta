import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ActiveView,
  ArenaTheme,
  AuthUserSummary,
  BattleResult,
  CoreStats,
  DerivedStats,
  EquipmentItem,
  EquipmentSlot,
  FighterAppearance,
  FighterProfile,
  GameSessionPayload,
  OfflineEarningsSummary,
  PlayerSettings,
} from '@shared/types';
import {
  computeClickMetrics,
  computeDerivedStats,
  type ClickMetrics,
} from '@shared/progression';
import { getMissionProgress, MISSIONS_CATALOG } from '@shared/missionsCatalog';
import { soundEngine } from '@/engine/audio/soundEffects';
import { apiClient, getAuthToken, setAuthToken } from './apiClient';

export type ToastKind = 'info' | 'success' | 'gold' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  kind: ToastKind;
}

interface ClickBuffer {
  clicks: number;
  feverClicks: number;
  highestCombo: number;
}

const HOME_ARENA_STORAGE_KEY = 'brute_legends_home_arena';

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStoredArena(): ArenaTheme {
  if (typeof window === 'undefined') return 'coliseum';
  try {
    const val = window.localStorage.getItem(HOME_ARENA_STORAGE_KEY);
    if (val === 'coliseum' || val === 'dojo' || val === 'volcano') return val;
  } catch {
    // ignore
  }
  return 'coliseum';
}

export interface GameContextValue {
  user: AuthUserSummary | null;
  fighter: FighterProfile | null;
  storageMode: 'postgres' | 'local';
  loading: boolean;
  bootError: string | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  homeArena: ArenaTheme;
  setHomeArena: (arena: ArenaTheme) => void;
  toasts: ToastMessage[];
  addToast: (text: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
  offlineEarnings: OfflineEarningsSummary | null;
  dismissOfflineEarnings: () => void;
  pendingBattle: BattleResult | null;
  setPendingBattle: (battle: BattleResult | null) => void;
  showCreationModal: boolean;
  setShowCreationModal: (open: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  optimisticGold: number;
  optimisticClicks: number;
  effectiveGold: number;
  derivedStats: DerivedStats | null;
  clickMetrics: ClickMetrics | null;
  canClaimDaily: boolean;
  claimableMissionsCount: number;
  // Actions
  retryBootstrap: () => Promise<void>;
  registerAccount: (payload: {
    username: string;
    email?: string;
    password: string;
  }) => Promise<void>;
  loginAccount: (payload: { username: string; password: string }) => Promise<void>;
  logoutToGuest: () => Promise<void>;
  customizeFighter: (payload: {
    name: string;
    title?: string;
    appearance: FighterAppearance;
  }) => Promise<void>;
  allocateStat: (stat: keyof CoreStats, amount?: number) => Promise<void>;
  registerClickStrike: (payload: {
    isCrit: boolean;
    isFever: boolean;
    combo: number;
    feverProgress: number;
  }) => void;
  flushClicks: () => Promise<void>;
  updateSettings: (settings: Partial<PlayerSettings>) => Promise<void>;
  buySkin: (skinId: string) => Promise<void>;
  equipSkin: (skinId: string) => Promise<void>;
  resetFighter: () => Promise<void>;
  startArenaBattle: (opponentId: string) => Promise<BattleResult>;
  startPvpBattle: (targetPlayerId: string) => Promise<BattleResult>;
  equipItem: (itemUid: string) => Promise<void>;
  unequipItem: (slot: EquipmentSlot) => Promise<void>;
  sellItem: (itemUid: string) => Promise<void>;
  forgeItem: (itemUid: string) => Promise<void>;
  upgradeSkill: (skillId: string) => Promise<void>;
  toggleEquipSkill: (skillId: string) => Promise<void>;
  buyUpgrade: (upgradeId: string) => Promise<void>;
  claimMission: (missionId: string) => Promise<void>;
  claimDailyReward: () => Promise<EquipmentItem | null>;
  applyFighterUpdate: (nextFighter: FighterProfile) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [fighter, setFighter] = useState<FighterProfile | null>(null);
  const [storageMode, setStorageMode] = useState<'postgres' | 'local'>('local');
  const [loading, setLoading] = useState<boolean>(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [activeView, setActiveViewState] = useState<ActiveView>('home');
  const [homeArena, setHomeArenaState] = useState<ArenaTheme>(() => readStoredArena());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarningsSummary | null>(null);
  const [pendingBattle, setPendingBattle] = useState<BattleResult | null>(null);
  const [showCreationModal, setShowCreationModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [optimisticGold, setOptimisticGold] = useState<number>(0);
  const [optimisticClicks, setOptimisticClicks] = useState<number>(0);

  const clickBufferRef = useRef<ClickBuffer>({
    clicks: 0,
    feverClicks: 0,
    highestCombo: 0,
  });
  const flushingRef = useRef<boolean>(false);
  const fighterRef = useRef<FighterProfile | null>(null);
  fighterRef.current = fighter;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, kind }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    [],
  );

  const applySession = useCallback((payload: GameSessionPayload, isInitialBoot = false) => {
    if (payload.token) {
      setAuthToken(payload.token);
    }
    setUser(payload.user);
    setFighter(payload.fighter);
    setStorageMode(payload.storageMode);
    if (payload.offlineEarnings && (payload.offlineEarnings.goldEarned > 0 || payload.offlineEarnings.xpEarned > 0)) {
      setOfflineEarnings(payload.offlineEarnings);
    }
    if (isInitialBoot && !payload.fighter.isCustomized) {
      setShowCreationModal(true);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setBootError(null);
    try {
      const existingToken = getAuthToken();
      if (existingToken) {
        try {
          const me = await apiClient.getMe();
          applySession(me, true);
          setLoading(false);
          return;
        } catch {
          setAuthToken(null);
        }
      }

      const guest = await apiClient.createGuest();
      applySession(guest, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de démarrage du jeu.';
      setBootError(msg);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Sync audio configuration with fighter settings
  useEffect(() => {
    if (!fighter) return;
    soundEngine.configure(fighter.settings.soundEnabled, fighter.settings.soundVolume);
  }, [fighter?.settings.soundEnabled, fighter?.settings.soundVolume]);

  const setHomeArena = useCallback((arena: ArenaTheme) => {
    setHomeArenaState(arena);
    try {
      window.localStorage.setItem(HOME_ARENA_STORAGE_KEY, arena);
    } catch {
      // ignore
    }
  }, []);

  const flushClicks = useCallback(
    async (allowEmptyHeartbeat = false) => {
      if (flushingRef.current || !fighterRef.current) return;
      const pending = clickBufferRef.current;
      if (!allowEmptyHeartbeat && pending.clicks <= 0) return;

      const batch: ClickBuffer = {
        clicks: pending.clicks,
        feverClicks: pending.feverClicks,
        highestCombo: pending.highestCombo,
      };
      clickBufferRef.current = { clicks: 0, feverClicks: 0, highestCombo: 0 };

      flushingRef.current = true;
      try {
        const res = await apiClient.syncClicks({
          clicks: batch.clicks,
          feverClicks: batch.feverClicks,
          highestCombo: batch.highestCombo,
        });
        setFighter(res.fighter);
        setOptimisticGold(0);
        setOptimisticClicks(0);
        if (res.leveledUp) {
          soundEngine.play('level_up');
          addToast(`NIVEAU ${res.newLevel} ATTEINT ! +4 points de stats !`, 'gold');
        }
      } catch {
        // Restore unsent clicks if sync failed transiently
        clickBufferRef.current.clicks += batch.clicks;
        clickBufferRef.current.feverClicks += batch.feverClicks;
        clickBufferRef.current.highestCombo = Math.max(
          clickBufferRef.current.highestCombo,
          batch.highestCombo,
        );
      } finally {
        flushingRef.current = false;
      }
    },
    [addToast],
  );

  // Flush clicker batch every 1.5s
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (clickBufferRef.current.clicks > 0) {
        void flushClicks(false);
      }
    }, 1500);
    return () => {
      window.clearInterval(timer);
      if (clickBufferRef.current.clicks > 0) {
        void flushClicks(false);
      }
    };
  }, [flushClicks]);

  // Passive income & energy heartbeat every 10s
  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!fighterRef.current) return;
      void flushClicks(true);
    }, 10_000);
    return () => window.clearInterval(heartbeat);
  }, [flushClicks]);

  const setActiveView = useCallback(
    (nextView: ActiveView) => {
      if (clickBufferRef.current.clicks > 0) {
        void flushClicks(false);
      }
      setActiveViewState(nextView);
    },
    [flushClicks],
  );

  const derivedStats = useMemo<DerivedStats | null>(() => {
    if (!fighter) return null;
    return computeDerivedStats(
      fighter.baseStats,
      fighter.level,
      fighter.equipped,
      fighter.skills,
      fighter.upgrades,
    );
  }, [fighter]);

  const clickMetrics = useMemo<ClickMetrics | null>(() => {
    if (!fighter) return null;
    return computeClickMetrics(fighter);
  }, [fighter]);

  const registerClickStrike = useCallback(
    (payload: {
      isCrit: boolean;
      isFever: boolean;
      combo: number;
      feverProgress: number;
    }) => {
      clickBufferRef.current.clicks += 1;
      if (payload.isFever) {
        clickBufferRef.current.feverClicks += 1;
      }
      if (payload.combo > clickBufferRef.current.highestCombo) {
        clickBufferRef.current.highestCombo = payload.combo;
      }

      const baseGold = clickMetrics?.goldPerClick ?? 3;
      const estimatedGain = Math.round(
        baseGold * (payload.isFever ? 2 : 1) * (payload.isCrit ? 1.5 : 1),
      );
      setOptimisticGold((prev) => prev + estimatedGain);
      setOptimisticClicks((prev) => prev + 1);
    },
    [clickMetrics],
  );

  const canClaimDaily = useMemo(() => {
    if (!fighter) return false;
    return fighter.lastDailyClaimDate !== getTodayIsoDate();
  }, [fighter]);

  const claimableMissionsCount = useMemo(() => {
    if (!fighter) return 0;
    const missionsReady = MISSIONS_CATALOG.filter((m) => {
      const progress = getMissionProgress(fighter, m);
      return progress.completed && !progress.claimed;
    }).length;
    return missionsReady + (canClaimDaily ? 1 : 0);
  }, [fighter, canClaimDaily]);

  const applyFighterUpdate = useCallback((nextFighter: FighterProfile) => {
    setFighter(nextFighter);
    setOptimisticGold(0);
    setOptimisticClicks(0);
  }, []);

  // ---------------- Actions ----------------

  const registerAccount = useCallback(
    async (payload: { username: string; email?: string; password: string }) => {
      await flushClicks(false);
      const res = await apiClient.register(payload);
      applySession(res, false);
      setShowAuthModal(false);
      soundEngine.play('victory');
      addToast(`Compte "${res.user.username}" activé et sauvegardé !`, 'success');
    },
    [addToast, applySession, flushClicks],
  );

  const loginAccount = useCallback(
    async (payload: { username: string; password: string }) => {
      const res = await apiClient.login(payload);
      applySession(res, false);
      setShowAuthModal(false);
      setShowCreationModal(false);
      soundEngine.play('equip');
      addToast(`Bon retour dans l’arène, ${res.fighter.name} !`, 'success');
    },
    [addToast, applySession],
  );

  const logoutToGuest = useCallback(async () => {
    setAuthToken(null);
    const guest = await apiClient.createGuest();
    applySession(guest, false);
    setShowAuthModal(false);
    addToast('Déconnecté. Nouvelle session invitée prête.', 'info');
  }, [addToast, applySession]);

  const customizeFighter = useCallback(
    async (payload: { name: string; title?: string; appearance: FighterAppearance }) => {
      const res = await apiClient.customizeFighter(payload);
      setFighter(res.fighter);
      soundEngine.play('equip');
      addToast(`Combattant "${res.fighter.name}" mis à jour !`, 'success');
    },
    [addToast],
  );

  const allocateStat = useCallback(
    async (stat: keyof CoreStats, amount = 1) => {
      const res = await apiClient.allocateStat({ stat, amount });
      setFighter(res.fighter);
      soundEngine.play('click');
    },
    [],
  );

  const updateSettings = useCallback(
    async (settings: Partial<PlayerSettings>) => {
      const res = await apiClient.updateSettings(settings);
      setFighter(res.fighter);
      soundEngine.configure(res.fighter.settings.soundEnabled, res.fighter.settings.soundVolume);
    },
    [],
  );

  const buySkin = useCallback(
    async (skinId: string) => {
      const res = await apiClient.buySkin(skinId);
      setFighter(res.fighter);
      soundEngine.play('level_up');
      addToast('Nouveau skin débloqué et équipé !', 'gold');
    },
    [addToast],
  );

  const equipSkin = useCallback(
    async (skinId: string) => {
      const res = await apiClient.equipSkin(skinId);
      setFighter(res.fighter);
      soundEngine.play('equip');
      addToast('Skin équipé !', 'success');
    },
    [addToast],
  );

  const resetFighter = useCallback(async () => {
    clickBufferRef.current = { clicks: 0, feverClicks: 0, highestCombo: 0 };
    setOptimisticGold(0);
    setOptimisticClicks(0);
    const res = await apiClient.resetFighter();
    setFighter(res.fighter);
    setPendingBattle(null);
    setShowCreationModal(true);
    addToast('Combattant réinitialisé ! Crée ta nouvelle légende.', 'info');
  }, [addToast]);

  const startArenaBattle = useCallback(
    async (opponentId: string): Promise<BattleResult> => {
      await flushClicks(false);
      const res = await apiClient.fightArena(opponentId);
      setFighter(res.fighter);
      return res.battle;
    },
    [flushClicks],
  );

  const startPvpBattle = useCallback(
    async (targetPlayerId: string): Promise<BattleResult> => {
      await flushClicks(false);
      const res = await apiClient.fightPvp(targetPlayerId);
      setFighter(res.fighter);
      setPendingBattle(res.battle);
      setActiveViewState('arena');
      return res.battle;
    },
    [flushClicks],
  );

  const equipItem = useCallback(
    async (itemUid: string) => {
      const res = await apiClient.equipItem(itemUid);
      setFighter(res.fighter);
      soundEngine.play('equip');
      addToast('Équipement équipé !', 'success');
    },
    [addToast],
  );

  const unequipItem = useCallback(
    async (slot: EquipmentSlot) => {
      const res = await apiClient.unequipItem(slot);
      setFighter(res.fighter);
      soundEngine.play('click');
      addToast('Équipement rangé dans le sac.', 'info');
    },
    [addToast],
  );

  const sellItem = useCallback(
    async (itemUid: string) => {
      const res = await apiClient.sellItem(itemUid);
      setFighter(res.fighter);
      soundEngine.play('coin');
      addToast(`Objet vendu pour +${res.goldEarned} Or !`, 'gold');
    },
    [addToast],
  );

  const forgeItem = useCallback(
    async (itemUid: string) => {
      await flushClicks(false);
      const res = await apiClient.forgeItem(itemUid);
      setFighter(res.fighter);
      soundEngine.play('equip');
      addToast(`Objet forgé au niveau +${res.item.upgradeLevel} !`, 'gold');
    },
    [addToast, flushClicks],
  );

  const upgradeSkill = useCallback(
    async (skillId: string) => {
      await flushClicks(false);
      const res = await apiClient.upgradeSkill(skillId);
      setFighter(res.fighter);
      soundEngine.play('level_up');
      addToast('Compétence améliorée !', 'success');
    },
    [addToast, flushClicks],
  );

  const toggleEquipSkill = useCallback(
    async (skillId: string) => {
      const res = await apiClient.toggleEquipSkill(skillId);
      setFighter(res.fighter);
      soundEngine.play('equip');
    },
    [],
  );

  const buyUpgrade = useCallback(
    async (upgradeId: string) => {
      await flushClicks(false);
      const res = await apiClient.buyUpgrade(upgradeId);
      setFighter(res.fighter);
      soundEngine.play('coin');
      addToast('Amélioration du dojo achetée !', 'gold');
    },
    [addToast, flushClicks],
  );

  const claimMission = useCallback(
    async (missionId: string) => {
      const res = await apiClient.claimMission(missionId);
      setFighter(res.fighter);
      soundEngine.play('victory');
      addToast(
        `Récompense récupérée : +${res.reward.gold} Or, +${res.reward.gems} Gemmes, +${res.reward.xp} XP !`,
        'gold',
      );
    },
    [addToast],
  );

  const claimDailyReward = useCallback(async (): Promise<EquipmentItem | null> => {
    const res = await apiClient.claimDailyReward();
    setFighter(res.fighter);
    soundEngine.play('chest');
    const bonusItem = res.bonusItem ?? null;
    addToast(
      `Jour ${res.reward.day} réclamé ! +${res.reward.gold} Or, +${res.reward.gems} Gemmes${
        bonusItem ? ` & ${bonusItem.name} !` : ' !'
      }`,
      'gold',
    );
    return bonusItem;
  }, [addToast]);

  const effectiveGold = (fighter?.gold ?? 0) + optimisticGold;

  const value: GameContextValue = {
    user,
    fighter,
    storageMode,
    loading,
    bootError,
    activeView,
    setActiveView,
    homeArena,
    setHomeArena,
    toasts,
    addToast,
    dismissToast,
    offlineEarnings,
    dismissOfflineEarnings: () => setOfflineEarnings(null),
    pendingBattle,
    setPendingBattle,
    showCreationModal,
    setShowCreationModal,
    showAuthModal,
    setShowAuthModal,
    optimisticGold,
    optimisticClicks,
    effectiveGold,
    derivedStats,
    clickMetrics,
    canClaimDaily,
    claimableMissionsCount,
    retryBootstrap: bootstrap,
    registerAccount,
    loginAccount,
    logoutToGuest,
    customizeFighter,
    allocateStat,
    registerClickStrike,
    flushClicks: () => flushClicks(false),
    updateSettings,
    buySkin,
    equipSkin,
    resetFighter,
    startArenaBattle,
    startPvpBattle,
    equipItem,
    unequipItem,
    sellItem,
    forgeItem,
    upgradeSkill,
    toggleEquipSkill,
    buyUpgrade,
    claimMission,
    claimDailyReward,
    applyFighterUpdate,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame doit être utilisé dans un GameProvider.');
  }
  return ctx;
}
