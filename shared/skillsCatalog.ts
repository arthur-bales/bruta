import type { SkillDefinition } from './types.js';

export const SKILLS_CATALOG: SkillDefinition[] = [
  // ==========================================================================
  // COMPÉTENCES ACTIVES (6 — déclenchées quand Rage >= rageCost en combat)
  // ==========================================================================
  {
    id: 'meteor_strike',
    name: 'Frappe Météore',
    category: 'active',
    description:
      'Bondit dans les airs et écrase l’adversaire avec une force sismique dévastatrice.',
    icon: '☄️',
    color: '#ef4444',
    maxLevel: 10,
    unlockLevel: 1,
    baseCostGold: 120,
    costScale: 1.55,
    rageCost: 65,
    damageMultiplier: 1.95,
    hits: 1,
  },
  {
    id: 'furious_whirlwind',
    name: 'Tourbillon Furieux',
    category: 'active',
    description:
      'Tournoie telle une tornade chibi et assène 3 frappes rapides qui percent la garde.',
    icon: '🌪️',
    color: '#f97316',
    maxLevel: 10,
    unlockLevel: 2,
    baseCostGold: 180,
    costScale: 1.58,
    rageCost: 70,
    damageMultiplier: 0.72,
    hits: 3,
  },
  {
    id: 'warrior_cry',
    name: 'Cri du Guerrier',
    category: 'active',
    description:
      'Pousse un rugissement héroïque qui augmente la Force, soigne et secoue le rival !',
    icon: '📣',
    color: '#f59e0b',
    maxLevel: 10,
    unlockLevel: 3,
    baseCostGold: 220,
    costScale: 1.58,
    rageCost: 60,
    damageMultiplier: 1.15,
    healPercent: 14,
    hits: 1,
    buffStat: 'str',
    buffAmount: 6,
  },
  {
    id: 'vampiric_blade',
    name: 'Lame Vampirique',
    category: 'active',
    description:
      'Tranche l’ennemi d’une frappe pourpre qui aspire sa vitalité pour se soigner.',
    icon: '🩸',
    color: '#dc2626',
    maxLevel: 10,
    unlockLevel: 5,
    baseCostGold: 360,
    costScale: 1.62,
    rageCost: 75,
    damageMultiplier: 1.65,
    healPercent: 22,
    hits: 1,
  },
  {
    id: 'thunder_bolt',
    name: 'Éclair Foudroyant',
    category: 'active',
    description:
      'Déchaîne une décharge électrique ultra-rapide qui étourdit l’adversaire 1 tour !',
    icon: '⚡',
    color: '#eab308',
    maxLevel: 10,
    unlockLevel: 7,
    baseCostGold: 520,
    costScale: 1.65,
    rageCost: 80,
    damageMultiplier: 1.55,
    hits: 1,
    stunTurns: 1,
  },
  {
    id: 'shadow_dance',
    name: 'Danse des Ombres',
    category: 'active',
    description:
      'Se dédouble en 4 coups éclairs insaisissables et booste son Agilité pour la suite.',
    icon: '🌑',
    color: '#7c3aed',
    maxLevel: 10,
    unlockLevel: 10,
    baseCostGold: 850,
    costScale: 1.68,
    rageCost: 85,
    damageMultiplier: 0.62,
    hits: 4,
    buffStat: 'agi',
    buffAmount: 8,
  },

  // ==========================================================================
  // COMPÉTENCES PASSIVES (6 — bonus permanents en combat et au dojo)
  // ==========================================================================
  {
    id: 'steel_skin',
    name: 'Peau d’Acier',
    category: 'passive',
    description:
      'Endurcit la posture défensive : +3 Défense et +2% Blocage par niveau.',
    icon: '🛡️',
    color: '#3b82f6',
    maxLevel: 10,
    unlockLevel: 1,
    baseCostGold: 110,
    costScale: 1.52,
    passiveBonuses: {
      def: 3,
      blockChance: 0.02,
    },
  },
  {
    id: 'feline_instinct',
    name: 'Instinct Félin',
    category: 'passive',
    description:
      'Des réflexes de ninja félin : +3 Agilité et +2% Esquive par niveau.',
    icon: '🐱',
    color: '#10b981',
    maxLevel: 10,
    unlockLevel: 2,
    baseCostGold: 140,
    costScale: 1.55,
    passiveBonuses: {
      agi: 3,
      dodgeChance: 0.02,
    },
  },
  {
    id: 'hawk_eye',
    name: 'Œil de Faucon',
    category: 'passive',
    description:
      'Repère chaque faille d’armure : +3 Chance et +2.5% Coup Critique par niveau.',
    icon: '🦅',
    color: '#f59e0b',
    maxLevel: 10,
    unlockLevel: 3,
    baseCostGold: 190,
    costScale: 1.56,
    passiveBonuses: {
      lck: 3,
      critChance: 0.025,
    },
  },
  {
    id: 'titan_heart',
    name: 'Cœur de Titan',
    category: 'passive',
    description:
      'Une endurance légendaire : +4 Vitalité et +2 Force par niveau.',
    icon: '❤️‍🔥',
    color: '#e11d48',
    maxLevel: 10,
    unlockLevel: 4,
    baseCostGold: 260,
    costScale: 1.58,
    passiveBonuses: {
      vit: 4,
      str: 2,
    },
  },
  {
    id: 'golden_hand',
    name: 'Main d’Or',
    category: 'passive',
    description:
      'Attire les pièces brillantes : +2 Chance et +8% d’Or gagné par niveau.',
    icon: '🪙',
    color: '#d97706',
    maxLevel: 10,
    unlockLevel: 5,
    baseCostGold: 320,
    costScale: 1.6,
    passiveBonuses: {
      lck: 2,
      goldPercent: 8,
    },
  },
  {
    id: 'dojo_frenzy',
    name: 'Frénésie du Dojo',
    category: 'passive',
    description:
      'Maîtrise suprême du rythme : +2 Force, +1.5% Vol de Vie et +12% Dégâts de Clic par niveau.',
    icon: '🔥',
    color: '#9333ea',
    maxLevel: 10,
    unlockLevel: 8,
    baseCostGold: 540,
    costScale: 1.64,
    passiveBonuses: {
      str: 2,
      lifesteal: 0.015,
      clickDamagePercent: 12,
    },
  },
];

const SKILL_BY_ID: Record<string, SkillDefinition> = Object.fromEntries(
  SKILLS_CATALOG.map((skill) => [skill.id, skill]),
);

export function getSkillDefinition(id: string): SkillDefinition | undefined {
  return SKILL_BY_ID[id];
}

export function getSkillUpgradeCost(skill: SkillDefinition, currentLevel: number): number {
  const lvl = Math.max(0, currentLevel);
  return Math.round(skill.baseCostGold * Math.pow(skill.costScale, lvl));
}
