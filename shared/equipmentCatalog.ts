import { MAX_FORGE_LEVEL, RARITY_META } from './constants';
import type {
  CoreStats,
  EquipmentItem,
  EquipmentSpecialEffect,
  EquipmentTemplate,
  Rarity,
} from './types';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const EQUIPMENT_CATALOG: EquipmentTemplate[] = [
  // ==========================================================================
  // ARMES (10 — tous les WeaponVisualType)
  // ==========================================================================
  {
    templateId: 'wpn_wooden_club',
    name: 'Gourdin Noueux',
    slot: 'weapon',
    rarity: 'common',
    description: 'Un bon vieux gourdin en chêne massif. Rustique, mais ça assomme bien !',
    visualType: 'wooden_club',
    primaryColor: '#8b5a2b',
    accentColor: '#c49a6c',
    baseStats: { str: 3, vit: 1 },
    bonusAttack: 6,
    buyPrice: 60,
    minLevel: 1,
  },
  {
    templateId: 'wpn_fists',
    name: 'Poings de Casse-Noisette',
    slot: 'weapon',
    rarity: 'common',
    description: 'Des poings nus endurcis sur des sacs de riz. Rapides comme l’éclair !',
    visualType: 'fists',
    primaryColor: '#e85d3f',
    accentColor: '#ffd166',
    baseStats: { str: 2, agi: 3 },
    bonusAttack: 5,
    buyPrice: 75,
    minLevel: 1,
  },
  {
    templateId: 'wpn_frying_pan',
    name: 'Poêle de Grand-Mère',
    slot: 'weapon',
    rarity: 'rare',
    description: 'Fait un "BONG !" mémorable sur le crâne des adversaires trop confiants.',
    visualType: 'frying_pan',
    primaryColor: '#374151',
    accentColor: '#fbbf24',
    baseStats: { str: 5, lck: 5, vit: 2 },
    bonusAttack: 13,
    specialEffect: {
      type: 'crit_surge',
      value: 8,
      label: '+8% Chance de Critique',
    },
    buyPrice: 220,
    minLevel: 2,
  },
  {
    templateId: 'wpn_broadsword',
    name: 'Épée Large du Colisée',
    slot: 'weapon',
    rarity: 'rare',
    description: 'Forgée pour les gladiateurs d’arène. Équilibrée pour parer et riposter.',
    visualType: 'broadsword',
    primaryColor: '#cbd5e1',
    accentColor: '#2563eb',
    baseStats: { str: 7, def: 3, vit: 2 },
    bonusAttack: 17,
    bonusDefense: 4,
    specialEffect: {
      type: 'counter',
      value: 8,
      label: '+8% Contre-Attaque',
    },
    buyPrice: 360,
    minLevel: 4,
  },
  {
    templateId: 'wpn_katana',
    name: 'Katana Sakura',
    slot: 'weapon',
    rarity: 'epic',
    description: 'Une lame d’une finesse redoutable qui tranche au rythme des pétales.',
    visualType: 'katana',
    primaryColor: '#f8fafc',
    accentColor: '#ec4899',
    baseStats: { str: 10, agi: 9, lck: 5 },
    bonusAttack: 28,
    specialEffect: {
      type: 'bleed',
      value: 10,
      label: 'Saignement (10% ATQ/tour)',
    },
    buyPrice: 820,
    minLevel: 7,
  },
  {
    templateId: 'wpn_battle_axe',
    name: 'Hache du Berserker',
    slot: 'weapon',
    rarity: 'epic',
    description: 'Lourde, brutale et assoiffée de mêlée. Chaque coup revigore son porteur.',
    visualType: 'battle_axe',
    primaryColor: '#7f1d1d',
    accentColor: '#f97316',
    baseStats: { str: 14, vit: 7 },
    bonusAttack: 35,
    bonusHp: 25,
    specialEffect: {
      type: 'vampirism',
      value: 9,
      label: '+9% Vol de Vie',
    },
    buyPrice: 1250,
    minLevel: 10,
  },
  {
    templateId: 'wpn_war_hammer',
    name: 'Marteau Titan',
    slot: 'weapon',
    rarity: 'legendary',
    description: 'Fait trembler le dojo à chaque frappe. Un pur délice sur le mannequin !',
    visualType: 'war_hammer',
    primaryColor: '#d97706',
    accentColor: '#fef08a',
    baseStats: { str: 21, vit: 11, def: 6 },
    bonusAttack: 52,
    bonusHp: 55,
    specialEffect: {
      type: 'click_boost',
      value: 25,
      label: '+25% Dégâts de Clic',
    },
    buyPrice: 2700,
    minLevel: 14,
  },
  {
    templateId: 'wpn_dragon_spear',
    name: 'Lance Draconique',
    slot: 'weapon',
    rarity: 'legendary',
    description: 'Imprégnée de souffle volcanique. Perforante et impitoyable.',
    visualType: 'dragon_spear',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    baseStats: { str: 24, agi: 14, lck: 8 },
    bonusAttack: 62,
    specialEffect: {
      type: 'bleed',
      value: 15,
      label: 'Saignement (15% ATQ/tour)',
    },
    buyPrice: 3800,
    minLevel: 18,
  },
  {
    templateId: 'wpn_crystal_blade',
    name: 'Lame Cristalline',
    slot: 'weapon',
    rarity: 'legendary',
    description: 'Taillée dans un prisme astral. Ses éclairs trouvent toujours la faille.',
    visualType: 'crystal_blade',
    primaryColor: '#38bdf8',
    accentColor: '#e0f2fe',
    baseStats: { str: 26, agi: 15, lck: 14 },
    bonusAttack: 70,
    specialEffect: {
      type: 'crit_surge',
      value: 15,
      label: '+15% Chance de Critique',
    },
    buyPrice: 5200,
    minLevel: 22,
  },
  {
    templateId: 'wpn_mythic_scythe',
    name: 'Faux Mythique du Néant',
    slot: 'weapon',
    rarity: 'mythic',
    description: 'Une relique interdite qui moissonne la vitalité des plus grands champions.',
    visualType: 'mythic_scythe',
    primaryColor: '#7c3aed',
    accentColor: '#f43f5e',
    baseStats: { str: 36, agi: 20, lck: 16, vit: 12 },
    bonusAttack: 102,
    bonusHp: 85,
    specialEffect: {
      type: 'vampirism',
      value: 16,
      label: '+16% Vol de Vie',
    },
    buyPrice: 10500,
    minLevel: 26,
  },

  // ==========================================================================
  // CASQUES (8 — tous les HelmetVisualType)
  // ==========================================================================
  {
    templateId: 'hlm_none',
    name: 'Gel Coiffant Aérodynamique',
    slot: 'helmet',
    rarity: 'common',
    description: 'Protège le style capillaire tout en réduisant la résistance au vent.',
    visualType: 'none',
    primaryColor: '#38bdf8',
    accentColor: '#f8fafc',
    baseStats: { agi: 2, lck: 2 },
    bonusHp: 12,
    buyPrice: 55,
    minLevel: 1,
  },
  {
    templateId: 'hlm_headband',
    name: 'Bandeau du Disciple',
    slot: 'helmet',
    rarity: 'common',
    description: 'Noué bien serré sur le front pour canaliser la concentration du dojo.',
    visualType: 'headband',
    primaryColor: '#e85d3f',
    accentColor: '#fef3c7',
    baseStats: { str: 2, agi: 2, vit: 1 },
    bonusHp: 18,
    bonusDefense: 2,
    buyPrice: 80,
    minLevel: 1,
  },
  {
    templateId: 'hlm_viking_helm',
    name: 'Casque Viking Cornu',
    slot: 'helmet',
    rarity: 'rare',
    description: 'Ses cornes massives dissuadent quiconque d’oser donner un coup de tête.',
    visualType: 'viking_helm',
    primaryColor: '#64748b',
    accentColor: '#fde68a',
    baseStats: { str: 4, def: 4, vit: 4 },
    bonusHp: 42,
    bonusDefense: 7,
    specialEffect: {
      type: 'thorns',
      value: 7,
      label: '+7% Épines',
    },
    buyPrice: 310,
    minLevel: 4,
  },
  {
    templateId: 'hlm_knight_visor',
    name: 'Heaume du Chevalier',
    slot: 'helmet',
    rarity: 'rare',
    description: 'Visière d’acier poli qui encaisse les premiers assauts sans broncher.',
    visualType: 'knight_visor',
    primaryColor: '#94a3b8',
    accentColor: '#2563eb',
    baseStats: { def: 7, vit: 5 },
    bonusHp: 58,
    bonusDefense: 11,
    specialEffect: {
      type: 'shield_start',
      value: 12,
      label: 'Bouclier initial (+12% PV)',
    },
    buyPrice: 480,
    minLevel: 6,
  },
  {
    templateId: 'hlm_shadow_hood',
    name: 'Capuche de l’Ombre',
    slot: 'helmet',
    rarity: 'epic',
    description: 'Tissée dans la brume nocturne. Permet de lire les ouvertures adverses.',
    visualType: 'shadow_hood',
    primaryColor: '#1f2937',
    accentColor: '#a855f7',
    baseStats: { agi: 11, lck: 9, str: 4 },
    bonusHp: 65,
    bonusDefense: 12,
    specialEffect: {
      type: 'crit_surge',
      value: 10,
      label: '+10% Chance de Critique',
    },
    buyPrice: 1150,
    minLevel: 10,
  },
  {
    templateId: 'hlm_samurai_kabuto',
    name: 'Kabuto du Shogun',
    slot: 'helmet',
    rarity: 'epic',
    description: 'Un casque impérial orné d’un croissant doré qui impose le respect.',
    visualType: 'samurai_kabuto',
    primaryColor: '#b91c1c',
    accentColor: '#fbbf24',
    baseStats: { str: 8, def: 11, vit: 9 },
    bonusHp: 95,
    bonusDefense: 18,
    specialEffect: {
      type: 'counter',
      value: 10,
      label: '+10% Contre-Attaque',
    },
    buyPrice: 1650,
    minLevel: 13,
  },
  {
    templateId: 'hlm_dragon_crown',
    name: 'Couronne du Dragon',
    slot: 'helmet',
    rarity: 'legendary',
    description: 'Sertie d’éclats d’ambre. Les spectateurs lancent des pièces sur son porteur !',
    visualType: 'dragon_crown',
    primaryColor: '#f59e0b',
    accentColor: '#dc2626',
    baseStats: { str: 14, def: 14, vit: 15, lck: 14 },
    bonusHp: 155,
    bonusDefense: 26,
    specialEffect: {
      type: 'gold_boost',
      value: 20,
      label: '+20% Or gagné',
    },
    buyPrice: 4100,
    minLevel: 20,
  },
  {
    templateId: 'hlm_halo_crest',
    name: 'Auréole Céleste',
    slot: 'helmet',
    rarity: 'mythic',
    description: 'Une couronne de lumière pure qui enveloppe la brute d’un rempart divin.',
    visualType: 'halo_crest',
    primaryColor: '#fef08a',
    accentColor: '#38bdf8',
    baseStats: { str: 18, def: 22, agi: 16, vit: 22, lck: 18 },
    bonusHp: 240,
    bonusDefense: 40,
    specialEffect: {
      type: 'shield_start',
      value: 22,
      label: 'Bouclier initial (+22% PV)',
    },
    buyPrice: 9800,
    minLevel: 27,
  },

  // ==========================================================================
  // ARMURES (7 — tous les ArmorVisualType)
  // ==========================================================================
  {
    templateId: 'arm_tunic',
    name: 'Tunique de l’Apprenti',
    slot: 'armor',
    rarity: 'common',
    description: 'Légère et respirante, idéale pour faire ses premiers pas dans l’arène.',
    visualType: 'tunic',
    primaryColor: '#e85d3f',
    accentColor: '#ffd166',
    baseStats: { vit: 2, def: 2 },
    bonusHp: 24,
    bonusDefense: 3,
    buyPrice: 65,
    minLevel: 1,
  },
  {
    templateId: 'arm_gi_martial',
    name: 'Kimono du Dojo',
    slot: 'armor',
    rarity: 'common',
    description: 'Coton renforcé et ceinture nouée avec art. Liberté de mouvement totale.',
    visualType: 'gi_martial',
    primaryColor: '#f8fafc',
    accentColor: '#1d4ed8',
    baseStats: { agi: 3, vit: 3, str: 1 },
    bonusHp: 32,
    bonusDefense: 4,
    buyPrice: 110,
    minLevel: 2,
  },
  {
    templateId: 'arm_leather_vest',
    name: 'Plastron de Cuir Souple',
    slot: 'armor',
    rarity: 'rare',
    description: 'Tanné pour résister aux griffes et favoriser les esquives rapides.',
    visualType: 'leather_vest',
    primaryColor: '#92400e',
    accentColor: '#f59e0b',
    baseStats: { def: 5, agi: 5, vit: 5 },
    bonusHp: 62,
    bonusDefense: 10,
    specialEffect: {
      type: 'counter',
      value: 7,
      label: '+7% Contre-Attaque',
    },
    buyPrice: 340,
    minLevel: 4,
  },
  {
    templateId: 'arm_iron_plate',
    name: 'Cuirasse de Fer Forgé',
    slot: 'armor',
    rarity: 'epic',
    description: 'Épaisse comme un mur de forteresse. Les attaquants s’y cassent les phalanges.',
    visualType: 'iron_plate',
    primaryColor: '#475569',
    accentColor: '#cbd5e1',
    baseStats: { def: 13, vit: 11 },
    bonusHp: 130,
    bonusDefense: 22,
    specialEffect: {
      type: 'thorns',
      value: 11,
      label: '+11% Épines',
    },
    buyPrice: 1100,
    minLevel: 9,
  },
  {
    templateId: 'arm_samurai_do',
    name: 'Armure Dō Écarlate',
    slot: 'armor',
    rarity: 'epic',
    description: 'Lamelles laquées rouges des maîtres du sabre. Élégante et redoutable.',
    visualType: 'samurai_do',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    baseStats: { str: 9, def: 12, agi: 8, vit: 10 },
    bonusHp: 145,
    bonusDefense: 25,
    specialEffect: {
      type: 'shield_start',
      value: 15,
      label: 'Bouclier initial (+15% PV)',
    },
    buyPrice: 1750,
    minLevel: 13,
  },
  {
    templateId: 'arm_dragon_scale',
    name: 'Écailles du Wyrm',
    slot: 'armor',
    rarity: 'legendary',
    description: 'Forgée à partir de mues de dragon volcanique. Brûle tout agresseur.',
    visualType: 'dragon_scale',
    primaryColor: '#b91c1c',
    accentColor: '#f97316',
    baseStats: { str: 14, def: 20, vit: 20 },
    bonusHp: 230,
    bonusDefense: 38,
    specialEffect: {
      type: 'thorns',
      value: 16,
      label: '+16% Épines',
    },
    buyPrice: 4300,
    minLevel: 19,
  },
  {
    templateId: 'arm_mythic_aegis',
    name: 'Égide Mythique des Dieux',
    slot: 'armor',
    rarity: 'mythic',
    description: 'Armure céleste indestructible pulsant d’une aura dorée éblouissante.',
    visualType: 'mythic_aegis',
    primaryColor: '#f59e0b',
    accentColor: '#7c3aed',
    baseStats: { str: 20, def: 30, agi: 14, vit: 30, lck: 14 },
    bonusHp: 360,
    bonusDefense: 58,
    specialEffect: {
      type: 'shield_start',
      value: 25,
      label: 'Bouclier initial (+25% PV)',
    },
    buyPrice: 11200,
    minLevel: 28,
  },

  // ==========================================================================
  // GANTS (6 — tous les GlovesVisualType)
  // ==========================================================================
  {
    templateId: 'glv_none',
    name: 'Mains Nues Endurcies',
    slot: 'gloves',
    rarity: 'common',
    description: 'Callosités fièrement acquises après mille frappes sur le tronc du dojo.',
    visualType: 'none',
    primaryColor: '#f8c8a0',
    accentColor: '#e85d3f',
    baseStats: { str: 2, agi: 1 },
    bonusAttack: 3,
    buyPrice: 50,
    minLevel: 1,
  },
  {
    templateId: 'glv_wraps',
    name: 'Bandages de Boxe',
    slot: 'gloves',
    rarity: 'common',
    description: 'Maintiennent les poignets bien fermes pour enchaîner les uppercuts.',
    visualType: 'wraps',
    primaryColor: '#f1f5f9',
    accentColor: '#dc2626',
    baseStats: { str: 3, agi: 2 },
    bonusAttack: 5,
    buyPrice: 95,
    minLevel: 2,
  },
  {
    templateId: 'glv_leather_gloves',
    name: 'Gants de Bagarreur',
    slot: 'gloves',
    rarity: 'rare',
    description: 'Renforcés aux phalanges. Boostent nettement la cadence sur le mannequin !',
    visualType: 'leather_gloves',
    primaryColor: '#78350f',
    accentColor: '#fbbf24',
    baseStats: { str: 6, agi: 4, lck: 3 },
    bonusAttack: 11,
    specialEffect: {
      type: 'click_boost',
      value: 15,
      label: '+15% Dégâts de Clic',
    },
    buyPrice: 380,
    minLevel: 5,
  },
  {
    templateId: 'glv_iron_gauntlets',
    name: 'Gantelets d’Acier',
    slot: 'gloves',
    rarity: 'epic',
    description: 'Dévier une épée à mains nues ? Aucun souci avec ces gantelets !',
    visualType: 'iron_gauntlets',
    primaryColor: '#64748b',
    accentColor: '#38bdf8',
    baseStats: { str: 10, def: 9, vit: 5 },
    bonusAttack: 18,
    bonusDefense: 11,
    specialEffect: {
      type: 'counter',
      value: 11,
      label: '+11% Contre-Attaque',
    },
    buyPrice: 1320,
    minLevel: 11,
  },
  {
    templateId: 'glv_flame_fists',
    name: 'Poings de Braise',
    slot: 'gloves',
    rarity: 'legendary',
    description: 'Enveloppés de flammes ardentes qui pulvérisent les records du dojo.',
    visualType: 'flame_fists',
    primaryColor: '#f97316',
    accentColor: '#fef08a',
    baseStats: { str: 20, agi: 12, lck: 9 },
    bonusAttack: 36,
    specialEffect: {
      type: 'click_boost',
      value: 30,
      label: '+30% Dégâts de Clic',
    },
    buyPrice: 3750,
    minLevel: 18,
  },
  {
    templateId: 'glv_titan_claws',
    name: 'Griffes du Titan',
    slot: 'gloves',
    rarity: 'mythic',
    description: 'Des serres d’obsidienne qui laissent une morsure sanglante à chaque assaut.',
    visualType: 'titan_claws',
    primaryColor: '#991b1b',
    accentColor: '#f43f5e',
    baseStats: { str: 28, agi: 18, lck: 14, vit: 10 },
    bonusAttack: 58,
    specialEffect: {
      type: 'bleed',
      value: 18,
      label: 'Saignement (18% ATQ/tour)',
    },
    buyPrice: 9600,
    minLevel: 26,
  },

  // ==========================================================================
  // BOTTES (6 — tous les BootsVisualType)
  // ==========================================================================
  {
    templateId: 'bts_sandals',
    name: 'Sandales en Paille',
    slot: 'boots',
    rarity: 'common',
    description: 'Aérées et silencieuses. L’équipement traditionnel du petit scarabée.',
    visualType: 'sandals',
    primaryColor: '#d97706',
    accentColor: '#fef3c7',
    baseStats: { agi: 3, lck: 1 },
    bonusHp: 10,
    buyPrice: 55,
    minLevel: 1,
  },
  {
    templateId: 'bts_leather_boots',
    name: 'Bottes de Pisteur',
    slot: 'boots',
    rarity: 'common',
    description: 'Semelles antidérapantes pour bondir dans le sable de l’arène.',
    visualType: 'leather_boots',
    primaryColor: '#78350f',
    accentColor: '#d97706',
    baseStats: { agi: 4, vit: 3, def: 1 },
    bonusHp: 22,
    bonusDefense: 3,
    buyPrice: 140,
    minLevel: 3,
  },
  {
    templateId: 'bts_iron_greaves',
    name: 'Grèves de Fer',
    slot: 'boots',
    rarity: 'rare',
    description: 'Bottes blindées qui transforment chaque coup de pied en coup de bélier.',
    visualType: 'iron_greaves',
    primaryColor: '#64748b',
    accentColor: '#f59e0b',
    baseStats: { def: 7, vit: 6, str: 3 },
    bonusHp: 48,
    bonusDefense: 11,
    specialEffect: {
      type: 'thorns',
      value: 7,
      label: '+7% Épines',
    },
    buyPrice: 440,
    minLevel: 6,
  },
  {
    templateId: 'bts_ninja_tabi',
    name: 'Tabi du Shinobi',
    slot: 'boots',
    rarity: 'epic',
    description: 'Furtives comme le vent. Permettent d’apparaître dans le dos de l’ennemi.',
    visualType: 'ninja_tabi',
    primaryColor: '#1e293b',
    accentColor: '#ef4444',
    baseStats: { agi: 14, lck: 9, str: 5 },
    bonusHp: 58,
    bonusDefense: 10,
    specialEffect: {
      type: 'crit_surge',
      value: 10,
      label: '+10% Chance de Critique',
    },
    buyPrice: 1280,
    minLevel: 11,
  },
  {
    templateId: 'bts_wing_boots',
    name: 'Bottes Ailées d’Hermès',
    slot: 'boots',
    rarity: 'legendary',
    description: 'Serties d’ailes dorées qui permettent d’esquiver et de riposter en plein vol.',
    visualType: 'wing_boots',
    primaryColor: '#f8fafc',
    accentColor: '#f59e0b',
    baseStats: { agi: 23, lck: 12, def: 9, vit: 8 },
    bonusHp: 110,
    bonusDefense: 18,
    specialEffect: {
      type: 'counter',
      value: 13,
      label: '+13% Contre-Attaque',
    },
    buyPrice: 3500,
    minLevel: 17,
  },
  {
    templateId: 'bts_mythic_striders',
    name: 'Foulées Astrales',
    slot: 'boots',
    rarity: 'mythic',
    description: 'Laissent une traînée d’étoiles filantes et attirent la fortune des champions.',
    visualType: 'mythic_striders',
    primaryColor: '#6366f1',
    accentColor: '#38bdf8',
    baseStats: { agi: 32, lck: 20, str: 14, vit: 16 },
    bonusHp: 180,
    bonusDefense: 28,
    specialEffect: {
      type: 'gold_boost',
      value: 25,
      label: '+25% Or gagné',
    },
    buyPrice: 9200,
    minLevel: 25,
  },

  // ==========================================================================
  // ACCESSOIRES (7 — tous les AccessoryVisualType)
  // ==========================================================================
  {
    templateId: 'acc_none',
    name: 'Porte-Bonheur Discret',
    slot: 'accessory',
    rarity: 'common',
    description: 'Un petit trèfle glissé dans la poche. Discret, mais toujours utile !',
    visualType: 'none',
    primaryColor: '#22a06b',
    accentColor: '#fef08a',
    baseStats: { lck: 4, vit: 1 },
    bonusHp: 10,
    buyPrice: 60,
    minLevel: 1,
  },
  {
    templateId: 'acc_red_scarf',
    name: 'Écharpe Rouge du Héros',
    slot: 'accessory',
    rarity: 'rare',
    description: 'Flotte héroïquement au vent dès que la brute entre dans le dojo !',
    visualType: 'red_scarf',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    baseStats: { str: 4, agi: 4, lck: 4 },
    bonusAttack: 7,
    bonusHp: 24,
    specialEffect: {
      type: 'click_boost',
      value: 12,
      label: '+12% Dégâts de Clic',
    },
    buyPrice: 260,
    minLevel: 3,
  },
  {
    templateId: 'acc_golden_amulet',
    name: 'Amulette d’Or Pur',
    slot: 'accessory',
    rarity: 'rare',
    description: 'Brille si fort qu’elle aimante les pièces d’or des coffres et des victoires.',
    visualType: 'golden_amulet',
    primaryColor: '#f59e0b',
    accentColor: '#fef08a',
    baseStats: { lck: 8, vit: 4 },
    bonusHp: 35,
    specialEffect: {
      type: 'gold_boost',
      value: 15,
      label: '+15% Or gagné',
    },
    buyPrice: 410,
    minLevel: 5,
  },
  {
    templateId: 'acc_fox_tail',
    name: 'Queue de Kitsune',
    slot: 'accessory',
    rarity: 'epic',
    description: 'Douce, malicieuse et chargée de magie renarde pour des coups critiques sournois.',
    visualType: 'fox_tail',
    primaryColor: '#f97316',
    accentColor: '#fff7ed',
    baseStats: { agi: 11, lck: 13 },
    bonusAttack: 14,
    bonusHp: 50,
    specialEffect: {
      type: 'crit_surge',
      value: 11,
      label: '+11% Chance de Critique',
    },
    buyPrice: 1180,
    minLevel: 9,
  },
  {
    templateId: 'acc_hero_cape',
    name: 'Cape de Champion',
    slot: 'accessory',
    rarity: 'epic',
    description: 'Broderies royales de l’arène. Offre un bouclier d’entrée héroïque.',
    visualType: 'hero_cape',
    primaryColor: '#2563eb',
    accentColor: '#fbbf24',
    baseStats: { str: 9, def: 10, vit: 11, lck: 6 },
    bonusHp: 105,
    bonusDefense: 14,
    specialEffect: {
      type: 'shield_start',
      value: 14,
      label: 'Bouclier initial (+14% PV)',
    },
    buyPrice: 1900,
    minLevel: 14,
  },
  {
    templateId: 'acc_demon_wings',
    name: 'Ailes du Démon',
    slot: 'accessory',
    rarity: 'legendary',
    description: 'Déploient une ombre terrifiante et drainent la force vitale des rivaux.',
    visualType: 'demon_wings',
    primaryColor: '#7f1d1d',
    accentColor: '#a855f7',
    baseStats: { str: 18, agi: 16, lck: 12, vit: 12 },
    bonusAttack: 28,
    bonusHp: 120,
    specialEffect: {
      type: 'vampirism',
      value: 12,
      label: '+12% Vol de Vie',
    },
    buyPrice: 4400,
    minLevel: 20,
  },
  {
    templateId: 'acc_spirit_aura',
    name: 'Aura Spirituelle Ultime',
    slot: 'accessory',
    rarity: 'mythic',
    description: 'Un tourbillon d’énergie ki pure réservé aux véritables légendes du combat.',
    visualType: 'spirit_aura',
    primaryColor: '#38bdf8',
    accentColor: '#f43f5e',
    baseStats: { str: 24, def: 20, agi: 22, vit: 22, lck: 26 },
    bonusAttack: 42,
    bonusHp: 210,
    bonusDefense: 25,
    specialEffect: {
      type: 'gold_boost',
      value: 30,
      label: '+30% Or gagné',
    },
    buyPrice: 11500,
    minLevel: 28,
  },
];

const TEMPLATE_BY_ID: Record<string, EquipmentTemplate> = Object.fromEntries(
  EQUIPMENT_CATALOG.map((item) => [item.templateId, item]),
);

let uidSequence = 0;

function generateItemUid(templateId: string): string {
  uidSequence = (uidSequence + 1) % 100_000;
  const rand = Math.floor(Math.random() * 1_000_000).toString(36);
  return `eq_${templateId}_${Date.now().toString(36)}_${uidSequence.toString(36)}_${rand}`;
}

export function getEquipmentTemplate(templateId: string): EquipmentTemplate | undefined {
  return TEMPLATE_BY_ID[templateId];
}

export function instantiateEquipment(templateId: string, uid?: string): EquipmentItem {
  const template = TEMPLATE_BY_ID[templateId];
  if (!template) {
    throw new Error(`Unknown equipment templateId: "${templateId}"`);
  }
  return {
    ...template,
    baseStats: { ...template.baseStats },
    specialEffect: template.specialEffect ? { ...template.specialEffect } : undefined,
    uid: uid ?? generateItemUid(templateId),
    upgradeLevel: 0,
    acquiredAt: Date.now(),
  };
}

export function rollRandomLoot(
  playerLevel: number,
  minRarity: Rarity = 'common',
  rng: () => number = Math.random,
): EquipmentItem {
  const minIdx = Math.max(0, RARITY_ORDER.indexOf(minRarity));
  const eligibleRarities = RARITY_ORDER.slice(minIdx);

  // Higher player level slightly boosts rare/epic/legendary/mythic weights
  const levelBonus = Math.min(25, Math.max(0, playerLevel - 1));
  const weighted = eligibleRarities.map((rarity) => {
    const idx = RARITY_ORDER.indexOf(rarity);
    const baseWeight = RARITY_META[rarity].weight;
    const adjusted =
      idx === 0
        ? Math.max(12, baseWeight - levelBonus * 1.1)
        : baseWeight * (1 + levelBonus * (0.04 * idx));
    return { rarity, weight: adjusted };
  });

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let roll = rng() * totalWeight;
  let chosenRarity: Rarity = eligibleRarities[0];
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      chosenRarity = entry.rarity;
      break;
    }
  }

  // Prefer items near or below playerLevel + 4 so loot is exciting yet relevant
  const levelCap = playerLevel + 4;
  let pool = EQUIPMENT_CATALOG.filter(
    (t) => t.rarity === chosenRarity && t.minLevel <= levelCap,
  );
  if (pool.length === 0) {
    pool = EQUIPMENT_CATALOG.filter((t) => t.rarity === chosenRarity);
  }
  if (pool.length === 0) {
    pool = EQUIPMENT_CATALOG;
  }

  const picked = pool[Math.floor(rng() * pool.length) % pool.length];
  return instantiateEquipment(picked.templateId);
}

export function getForgeUpgradeCost(item: EquipmentItem): number {
  const level = Math.min(MAX_FORGE_LEVEL, Math.max(0, item.upgradeLevel));
  const rarityMult = RARITY_META[item.rarity].statMult;
  const base = Math.max(45, Math.round(item.buyPrice * 0.34 + 20 * rarityMult));
  return Math.round(base * Math.pow(1.45, level));
}

export function getItemSellValue(item: EquipmentItem): number {
  const sellMult = RARITY_META[item.rarity].sellMult;
  const baseSell = item.buyPrice * sellMult;
  const forgeBonus = item.upgradeLevel * Math.max(25, item.buyPrice * 0.14);
  return Math.max(15, Math.round(baseSell + forgeBonus));
}

export interface EffectiveItemStats {
  stats: CoreStats;
  bonusHp: number;
  bonusAttack: number;
  bonusDefense: number;
  specialEffect?: EquipmentSpecialEffect;
}

export function getEffectiveItemStats(item: EquipmentItem): EffectiveItemStats {
  const lvl = Math.max(0, Math.min(MAX_FORGE_LEVEL, item.upgradeLevel));
  const mult = 1 + lvl * 0.12;

  const scaleStat = (val?: number) => (val ? Math.round(val * mult) : 0);

  const stats: CoreStats = {
    str: scaleStat(item.baseStats.str),
    def: scaleStat(item.baseStats.def),
    agi: scaleStat(item.baseStats.agi),
    vit: scaleStat(item.baseStats.vit),
    lck: scaleStat(item.baseStats.lck),
  };

  let specialEffect: EquipmentSpecialEffect | undefined;
  if (item.specialEffect) {
    const scaledValue = Math.round(item.specialEffect.value * (1 + lvl * 0.05) * 10) / 10;
    specialEffect = {
      ...item.specialEffect,
      value: scaledValue,
    };
  }

  return {
    stats,
    bonusHp: scaleStat(item.bonusHp),
    bonusAttack: scaleStat(item.bonusAttack),
    bonusDefense: scaleStat(item.bonusDefense),
    specialEffect,
  };
}
