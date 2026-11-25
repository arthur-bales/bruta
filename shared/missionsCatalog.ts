import type {
  DailyRewardDefinition,
  FighterProfile,
  MissionDefinition,
} from './types.js';

export const MISSIONS_CATALOG: MissionDefinition[] = [
  // ==========================================================================
  // MISSIONS (8 — progression immédiate et quêtes du dojo)
  // ==========================================================================
  {
    id: 'mis_clicks_25',
    title: 'Échauffement du Dojo',
    description: 'Frappe le mannequin d’entraînement 25 fois.',
    type: 'mission',
    metric: 'totalClicks',
    target: 25,
    rewardGold: 120,
    rewardGems: 0,
    rewardXp: 60,
    icon: '👊',
  },
  {
    id: 'mis_arena_first_battle',
    title: 'Baptême de l’Arène',
    description: 'Participe à ton tout premier combat d’arène.',
    type: 'mission',
    metric: 'arenaBattles',
    target: 1,
    rewardGold: 150,
    rewardGems: 0,
    rewardXp: 80,
    icon: '⚔️',
  },
  {
    id: 'mis_arena_wins_3',
    title: 'Gladiateur Prometteur',
    description: 'Remporte 3 victoires dans l’arène.',
    type: 'mission',
    metric: 'arenaWins',
    target: 3,
    rewardGold: 260,
    rewardGems: 0,
    rewardXp: 140,
    icon: '🏆',
  },
  {
    id: 'mis_upgrades_3',
    title: 'Bricoleur du Dojo',
    description: 'Achète 3 niveaux d’améliorations du dojo.',
    type: 'mission',
    metric: 'upgradesBought',
    target: 3,
    rewardGold: 220,
    rewardGems: 0,
    rewardXp: 110,
    icon: '🛠️',
  },
  {
    id: 'mis_skills_2',
    title: 'Apprenti Technique',
    description: 'Débloque 2 compétences de combat ou passives.',
    type: 'mission',
    metric: 'skillsUnlocked',
    target: 2,
    rewardGold: 300,
    rewardGems: 0,
    rewardXp: 160,
    icon: '✨',
  },
  {
    id: 'mis_items_5',
    title: 'Collectionneur d’Équipement',
    description: 'Possède au moins 5 objets équipés ou en inventaire.',
    type: 'mission',
    metric: 'itemsOwned',
    target: 5,
    rewardGold: 320,
    rewardGems: 0,
    rewardXp: 175,
    icon: '🎒',
  },
  {
    id: 'mis_pvp_win_1',
    title: 'Premier Rival Vexé',
    description: 'Bats un rival dans le classement PvP.',
    type: 'mission',
    metric: 'pvpWins',
    target: 1,
    rewardGold: 400,
    rewardGems: 0,
    rewardXp: 220,
    icon: '🥊',
  },
  {
    id: 'mis_boss_1',
    title: 'Chasseur de Boss',
    description: 'Terrasse ton premier Boss d’arène (Grog ou plus fort).',
    type: 'mission',
    metric: 'bossesDefeated',
    target: 1,
    rewardGold: 550,
    rewardGems: 0,
    rewardXp: 320,
    icon: '👹',
  },

  // ==========================================================================
  // SUCCÈS / ACHIEVEMENTS (8 — objectifs de maîtrise et prestige)
  // ==========================================================================
  {
    id: 'ach_clicks_500',
    title: 'Poings Supersoniques',
    description: 'Cumule 500 frappes sur le mannequin du dojo.',
    type: 'achievement',
    metric: 'totalClicks',
    target: 500,
    rewardGold: 950,
    rewardGems: 0,
    rewardXp: 420,
    icon: '⚡',
  },
  {
    id: 'ach_level_10',
    title: 'Vétéran du Colisée',
    description: 'Atteins le niveau 10 avec ta brute.',
    type: 'achievement',
    metric: 'level',
    target: 10,
    rewardGold: 1400,
    rewardGems: 0,
    rewardXp: 650,
    icon: '⭐',
  },
  {
    id: 'ach_arena_wins_20',
    title: 'Terreur de l’Arène',
    description: 'Enchaîne 20 victoires en combat d’arène.',
    type: 'achievement',
    metric: 'arenaWins',
    target: 20,
    rewardGold: 1800,
    rewardGems: 0,
    rewardXp: 900,
    icon: '🔥',
  },
  {
    id: 'ach_gold_10000',
    title: 'Trésor du Dragon',
    description: 'Cumule 10 000 pièces d’or gagnées au total.',
    type: 'achievement',
    metric: 'totalGoldEarned',
    target: 10000,
    rewardGold: 2000,
    rewardGems: 0,
    rewardXp: 850,
    icon: '💰',
  },
  {
    id: 'ach_skills_8',
    title: 'Grand Maître Martial',
    description: 'Débloque 8 compétences différentes.',
    type: 'achievement',
    metric: 'skillsUnlocked',
    target: 8,
    rewardGold: 2200,
    rewardGems: 0,
    rewardXp: 1100,
    icon: '📜',
  },
  {
    id: 'ach_pvp_wins_10',
    title: 'Étoile du Classement',
    description: 'Remporte 10 duels PvP contre les rivaux.',
    type: 'achievement',
    metric: 'pvpWins',
    target: 10,
    rewardGold: 2600,
    rewardGems: 0,
    rewardXp: 1300,
    icon: '🏅',
  },
  {
    id: 'ach_bosses_5',
    title: 'Fléau des Titans',
    description: 'Triomphe de 5 combats contre des Boss.',
    type: 'achievement',
    metric: 'bossesDefeated',
    target: 5,
    rewardGold: 3200,
    rewardGems: 0,
    rewardXp: 1800,
    icon: '🐉',
  },
  {
    id: 'ach_level_25',
    title: 'Légende Immortelle',
    description: 'Atteins le niveau 25 et grave ton nom dans l’histoire !',
    type: 'achievement',
    metric: 'level',
    target: 25,
    rewardGold: 7500,
    rewardGems: 0,
    rewardXp: 3500,
    icon: '👑',
  },
];

export const DAILY_REWARDS_CATALOG: DailyRewardDefinition[] = [
  {
    day: 1,
    title: 'Bourse du Matin',
    gold: 99,
    gems: 0,
    xp: 60,
    icon: '🪙',
  },
  {
    day: 2,
    title: 'Élan du Dojo',
    gold: 165,
    gems: 0,
    xp: 120,
    icon: '🥋',
  },
  {
    day: 3,
    title: 'Coffre du Combattant',
    gold: 231,
    gems: 0,
    xp: 180,
    chestRarity: 'rare',
    icon: '🎁',
  },
  {
    day: 4,
    title: 'Sac de Gemmes',
    gold: 319,
    gems: 0,
    xp: 260,
    icon: '💎',
  },
  {
    day: 5,
    title: 'Prime du Colisée',
    gold: 451,
    gems: 0,
    xp: 360,
    icon: '🏆',
  },
  {
    day: 6,
    title: 'Trésor du Volcan',
    gold: 632,
    gems: 0,
    xp: 500,
    icon: '🔥',
  },
  {
    day: 7,
    title: 'Coffre Légendaire !',
    gold: 990,
    gems: 0,
    xp: 800,
    chestRarity: 'legendary',
    icon: '👑',
  },
];

export interface MissionProgressInfo {
  current: number;
  target: number;
  percent: number;
  completed: boolean;
  claimed: boolean;
}

export function getMissionProgress(
  fighter: FighterProfile,
  mission: MissionDefinition,
): MissionProgressInfo {
  let current = 0;

  switch (mission.metric) {
    case 'totalClicks':
      current = fighter.progress.totalClicks;
      break;
    case 'arenaWins':
      current = fighter.progress.arenaWins;
      break;
    case 'arenaBattles':
      current = fighter.progress.arenaBattles;
      break;
    case 'pvpWins':
      current = fighter.progress.pvpWins;
      break;
    case 'level':
      current = fighter.level;
      break;
    case 'itemsOwned': {
      const equippedCount = Object.values(fighter.equipped).filter(Boolean).length;
      current = fighter.inventory.length + equippedCount;
      break;
    }
    case 'skillsUnlocked':
      current = Object.values(fighter.skills).filter((lvl) => lvl > 0).length;
      break;
    case 'upgradesBought':
      current = fighter.progress.upgradesBought;
      break;
    case 'totalGoldEarned':
      current = fighter.progress.totalGoldEarned;
      break;
    case 'bossesDefeated':
      current = fighter.progress.bossesDefeated;
      break;
  }

  const target = Math.max(1, mission.target);
  const percent = Math.min(100, Math.floor((current / target) * 100));
  const completed = current >= target;
  const claimed = fighter.claimedMissions.includes(mission.id);

  return {
    current,
    target,
    percent,
    completed,
    claimed,
  };
}
