import type { UpgradeDefinition } from './types.js';

export const UPGRADES_CATALOG: UpgradeDefinition[] = [
  // ==========================================================================
  // CATÉGORIE : CLICK (Puissance et récompenses par clic)
  // ==========================================================================
  {
    id: 'click_steel_fists',
    name: 'Poings d’Acier',
    category: 'click',
    description: 'Renforce tes phalanges pour frapper le mannequin beaucoup plus fort.',
    icon: '👊',
    baseCost: 35,
    costMultiplier: 1.42,
    maxLevel: 25,
    effectPerLevel: 2,
    effectLabel: '+2 Or & +4 Dégâts / clic',
  },
  {
    id: 'click_strike_gloves',
    name: 'Gants de Frappe',
    category: 'click',
    description: 'Des gants lestés qui multiplient l’impact de chaque clic au dojo.',
    icon: '🥊',
    baseCost: 110,
    costMultiplier: 1.48,
    maxLevel: 20,
    effectPerLevel: 15,
    effectLabel: '+15% Puissance de Clic',
  },
  {
    id: 'click_lightning_combo',
    name: 'Combo Éclair',
    category: 'click',
    description: 'Amplifie les gains d’or et d’XP lorsque tu enchaînes les frappes !',
    icon: '⚡',
    baseCost: 240,
    costMultiplier: 1.52,
    maxLevel: 15,
    effectPerLevel: 12,
    effectLabel: '+12% Or & XP / clic',
  },
  {
    id: 'click_dojo_crit',
    name: 'Frappe Critique Dojo',
    category: 'click',
    description: 'Augmente les chances de déclencher un SUPER CRITIQUE explosif au clic.',
    icon: '💥',
    baseCost: 320,
    costMultiplier: 1.55,
    maxLevel: 15,
    effectPerLevel: 3,
    effectLabel: '+3% Critique au Clic',
  },

  // ==========================================================================
  // CATÉGORIE : AUTO (Revenus passifs & gains hors-ligne !)
  // ==========================================================================
  {
    id: 'auto_dummy',
    name: 'Mannequin Automatique',
    category: 'auto',
    description: 'Un mannequin à ressort qui s’auto-tabasse pendant que tu te reposes !',
    icon: '🪵',
    baseCost: 60,
    costMultiplier: 1.4,
    maxLevel: 25,
    effectPerLevel: 2,
    effectLabel: '+2 Or/s & +1 XP/s',
  },
  {
    id: 'auto_apprentices',
    name: 'Apprentis du Dojo',
    category: 'auto',
    description: 'Recrute des petits disciples chibi qui s’entraînent jour et nuit pour toi.',
    icon: '🥋',
    baseCost: 260,
    costMultiplier: 1.46,
    maxLevel: 20,
    effectPerLevel: 7,
    effectLabel: '+7 Or/s & +3 XP/s',
  },
  {
    id: 'auto_spring_hammer',
    name: 'Marteau à Ressort',
    category: 'auto',
    description: 'Une invention farfelue qui martèle la cible en continu avec un grand BOING !',
    icon: '🔨',
    baseCost: 950,
    costMultiplier: 1.52,
    maxLevel: 15,
    effectPerLevel: 22,
    effectLabel: '+22 Or/s & +8 XP/s',
  },
  {
    id: 'auto_energy_sanctuary',
    name: 'Sanctuaire d’Énergie',
    category: 'auto',
    description: 'Un autel mystique qui génère un flot massif d’or et d’expérience hors-ligne.',
    icon: '⛩️',
    baseCost: 3400,
    costMultiplier: 1.58,
    maxLevel: 12,
    effectPerLevel: 75,
    effectLabel: '+75 Or/s & +24 XP/s',
  },

  // ==========================================================================
  // CATÉGORIE : DOJO (Multiplicateurs globaux permanents)
  // ==========================================================================
  {
    id: 'dojo_intensive_training',
    name: 'Entraînement Intensif',
    category: 'dojo',
    description: 'Des séances de katas optimisées pour grimper de niveau à toute vitesse.',
    icon: '📜',
    baseCost: 180,
    costMultiplier: 1.55,
    maxLevel: 15,
    effectPerLevel: 10,
    effectLabel: '+10% XP globale',
  },
  {
    id: 'dojo_arena_treasury',
    name: 'Trésorerie de l’Arène',
    category: 'dojo',
    description: 'Négocie de meilleures primes de combat et des coffres mieux garnis.',
    icon: '💰',
    baseCost: 210,
    costMultiplier: 1.55,
    maxLevel: 15,
    effectPerLevel: 10,
    effectLabel: '+10% Or global',
  },
  {
    id: 'dojo_ancestral_forge',
    name: 'Forge Ancestrale',
    category: 'dojo',
    description: 'Le feu sacré renforce l’ensemble de ton équipement et de tes frappes.',
    icon: '⚒️',
    baseCost: 520,
    costMultiplier: 1.6,
    maxLevel: 12,
    effectPerLevel: 8,
    effectLabel: '+8% Puissance & Dégâts',
  },
  {
    id: 'dojo_legend_aura',
    name: 'Aura de Légende',
    category: 'dojo',
    description: 'Ta renommée rayonne dans tout l’empire : bonus massif sur tous les gains !',
    icon: '👑',
    baseCost: 1500,
    costMultiplier: 1.68,
    maxLevel: 10,
    effectPerLevel: 12,
    effectLabel: '+12% Or & +12% XP',
  },
];

const UPGRADE_BY_ID: Record<string, UpgradeDefinition> = Object.fromEntries(
  UPGRADES_CATALOG.map((u) => [u.id, u]),
);

export function getUpgradeDefinition(id: string): UpgradeDefinition | undefined {
  return UPGRADE_BY_ID[id];
}

export function getUpgradeCost(upgrade: UpgradeDefinition, currentLevel: number): number {
  const lvl = Math.max(0, currentLevel);
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, lvl));
}
