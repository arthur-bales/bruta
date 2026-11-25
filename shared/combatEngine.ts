import { getEffectiveItemStats } from './equipmentCatalog';
import { computeDerivedStats } from './progression';
import { getSkillDefinition } from './skillsCatalog';
import type {
  AnimationName,
  ArenaTheme,
  BattleResult,
  CombatEvent,
  CombatFighterSnapshot,
  CombatSide,
  DerivedStats,
  EquipmentSlot,
  EquippedGear,
  FighterAppearance,
  FighterProfile,
  OpponentDefinition,
  SkillDefinition,
} from './types';

export interface CombatParticipant {
  id: string;
  name: string;
  title: string;
  level: number;
  appearance: FighterAppearance;
  equipped: EquippedGear;
  derived: DerivedStats;
  activeSkills: { id: string; level: number }[];
}

export interface SimulateCombatParams {
  left: CombatParticipant;
  right: CombatParticipant;
  arena: ArenaTheme;
  seed?: number;
  battleId?: string;
}

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'accessory',
];

const MAX_TURNS = 40;

/**
 * Mulberry32 deterministic PRNG — identical results in browser and Node/Express.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fighterToCombatParticipant(fighter: FighterProfile): CombatParticipant {
  const derived = computeDerivedStats(
    fighter.baseStats,
    fighter.level,
    fighter.equipped,
    fighter.skills,
    fighter.upgrades,
  );
  const activeSkills = fighter.equippedSkills
    .map((id) => ({ id, level: fighter.skills[id] ?? 0 }))
    .filter((s) => s.level > 0);

  return {
    id: fighter.id,
    name: fighter.name,
    title: fighter.title,
    level: fighter.level,
    appearance: { ...fighter.appearance },
    equipped: fighter.equipped,
    derived,
    activeSkills,
  };
}

export function opponentToCombatParticipant(opponent: OpponentDefinition): CombatParticipant {
  const derived = computeDerivedStats(
    opponent.baseStats,
    opponent.level,
    opponent.equipped,
  );
  return {
    id: opponent.id,
    name: opponent.name,
    title: opponent.title,
    level: opponent.level,
    appearance: { ...opponent.appearance },
    equipped: opponent.equipped,
    derived,
    activeSkills: opponent.activeSkills,
  };
}

interface ActiveFighterState {
  side: CombatSide;
  participant: CombatParticipant;
  hp: number;
  maxHp: number;
  shield: number;
  rage: number;
  gauge: number;
  stunTurns: number;
  bleedTurns: number;
  bleedDamage: number;
  bleedPercentFromGear: number;
  attackBonusMult: number;
  speedBonus: number;
  dodgeBonus: number;
  skillCursor: number;
}

function getSpecialEffectTotal(equipped: EquippedGear, effectType: 'bleed' | 'shield_start'): number {
  let total = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipped[slot];
    if (!item) continue;
    const eff = getEffectiveItemStats(item);
    if (eff.specialEffect?.type === effectType) {
      total += eff.specialEffect.value;
    }
  }
  return total;
}

function initState(side: CombatSide, participant: CombatParticipant): ActiveFighterState {
  const maxHp = Math.max(1, participant.derived.maxHp);
  const shieldPct = getSpecialEffectTotal(participant.equipped, 'shield_start');
  const shield = Math.round((maxHp * shieldPct) / 100);
  const bleedPercentFromGear = getSpecialEffectTotal(participant.equipped, 'bleed');

  return {
    side,
    participant,
    hp: maxHp,
    maxHp,
    shield,
    rage: 15, // Small opening adrenaline so specials fire early & often!
    gauge: 0,
    stunTurns: 0,
    bleedTurns: 0,
    bleedDamage: 0,
    bleedPercentFromGear,
    attackBonusMult: 1,
    speedBonus: 0,
    dodgeBonus: 0,
    skillCursor: 0,
  };
}

function toSnapshot(participant: CombatParticipant): CombatFighterSnapshot {
  return {
    id: participant.id,
    name: participant.name,
    title: participant.title,
    level: participant.level,
    appearance: { ...participant.appearance },
    equipped: participant.equipped,
    derived: { ...participant.derived },
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

const NORMAL_ATTACK_VERBS = [
  'assène un coup rapide à',
  'frappe sèchement',
  'enchaîne un direct sur',
  'décoche un coup bien placé sur',
  'porte une attaque vive contre',
] as const;

const HEAVY_ATTACK_VERBS = [
  'déchaîne une FRAPPE LOURDE sur',
  'abat un coup surpuissant sur',
  'écrase la garde de',
  'envoie une mandale colossale à',
] as const;

const DODGE_LINES = [
  'esquive avec une pirouette féline !',
  'se faufile hors de portée au dernier instant !',
  'fait un pas de côté éclair !',
  'évite le coup avec style !',
] as const;

export function simulateCombat(
  params: SimulateCombatParams,
): Omit<BattleResult, 'rewards'> {
  const seed =
    params.seed !== undefined
      ? params.seed >>> 0
      : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rng = createSeededRng(seed);
  const battleId = params.battleId ?? `btl_${seed.toString(36)}_${Date.now().toString(36)}`;

  const left = initState('left', params.left);
  const right = initState('right', params.right);

  const events: CombatEvent[] = [];
  let seq = 0;

  const pushEvent = (
    partial: Omit<
      CombatEvent,
      'seq' | 'leftHp' | 'leftMaxHp' | 'leftRage' | 'rightHp' | 'rightMaxHp' | 'rightRage'
    >,
  ) => {
    events.push({
      ...partial,
      seq: seq++,
      leftHp: Math.max(0, left.hp),
      leftMaxHp: left.maxHp,
      leftRage: Math.max(0, Math.min(100, Math.round(left.rage))),
      rightHp: Math.max(0, right.hp),
      rightMaxHp: right.maxHp,
      rightRage: Math.max(0, Math.min(100, Math.round(right.rage))),
    });
  };

  const applyDamage = (target: ActiveFighterState, incoming: number): { hpDamage: number; absorbed: number } => {
    const safeDmg = Math.max(0, Math.round(incoming));
    if (safeDmg === 0) return { hpDamage: 0, absorbed: 0 };
    let absorbed = 0;
    let remaining = safeDmg;
    if (target.shield > 0) {
      absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
    }
    const hpDamage = Math.min(target.hp, remaining);
    target.hp = Math.max(0, target.hp - hpDamage);
    return { hpDamage, absorbed };
  };

  const addRage = (fighter: ActiveFighterState, amount: number) => {
    fighter.rage = Math.max(0, Math.min(100, fighter.rage + amount));
  };

  const computeRawDamage = (
    attacker: ActiveFighterState,
    defender: ActiveFighterState,
    multiplier: number,
  ): number => {
    const { minDamage, maxDamage } = attacker.participant.derived;
    const base = minDamage + rng() * Math.max(1, maxDamage - minDamage);
    const boosted = base * attacker.attackBonusMult * multiplier;
    const defenseMitigation = 100 / (100 + defender.participant.derived.defense * 1.4);
    return Math.max(2, boosted * defenseMitigation);
  };

  // 1) Opening event: battle_start
  const shieldNotes: string[] = [];
  if (left.shield > 0) shieldNotes.push(`${left.participant.name} active un bouclier (${left.shield} PV)`);
  if (right.shield > 0) shieldNotes.push(`${right.participant.name} active un bouclier (${right.shield} PV)`);

  pushEvent({
    turn: 0,
    type: 'battle_start',
    actor: 'left',
    target: 'right',
    actorAnim: 'idle',
    targetAnim: 'idle',
    damage: 0,
    heal: 0,
    isCrit: false,
    isDodged: false,
    isBlocked: false,
    logText:
      `⚔️ ${left.participant.name} affronte ${right.participant.name} !` +
      (shieldNotes.length > 0 ? ` (${shieldNotes.join(' • ')})` : ' Que le duel commence !'),
  });

  // 2) Dash into arena: move_in (uses 'run' animation!)
  pushEvent({
    turn: 0,
    type: 'move_in',
    actor: 'left',
    target: 'right',
    actorAnim: 'run',
    targetAnim: 'run',
    damage: 0,
    heal: 0,
    isCrit: false,
    isDodged: false,
    isBlocked: false,
    logText: `💨 « ${left.participant.appearance.warCry || 'En garde !'} » Les combattants foncent au centre !`,
  });

  const chooseReadyActiveSkill = (
    fighter: ActiveFighterState,
  ): { def: SkillDefinition; level: number } | null => {
    const skills = fighter.participant.activeSkills;
    if (!skills || skills.length === 0) return null;

    const ready: { def: SkillDefinition; level: number }[] = [];
    for (let i = 0; i < skills.length; i++) {
      const idx = (fighter.skillCursor + i) % skills.length;
      const entry = skills[idx];
      const def = getSkillDefinition(entry.id);
      if (
        def &&
        def.category === 'active' &&
        def.rageCost !== undefined &&
        fighter.rage >= def.rageCost
      ) {
        ready.push({ def, level: Math.max(1, entry.level) });
      }
    }

    if (ready.length === 0) return null;
    fighter.skillCursor = (fighter.skillCursor + 1) % skills.length;
    return ready[0];
  };

  const resolveStrike = (opts: {
    turn: number;
    attacker: ActiveFighterState;
    defender: ActiveFighterState;
    kind: 'attack' | 'heavy_attack' | 'special' | 'counter';
    damageMult: number;
    skill?: SkillDefinition;
    hitIndex?: number;
    totalHits?: number;
    allowCounter: boolean;
  }) => {
    const { turn, attacker, defender, kind, damageMult, skill, hitIndex, totalHits, allowCounter } = opts;

    const effectiveDodge = Math.min(
      0.55,
      (defender.participant.derived.dodgeChance + defender.dodgeBonus) *
        (kind === 'special' ? 0.45 : kind === 'counter' ? 0.5 : 1),
    );
    const isDodged = rng() < effectiveDodge;

    if (isDodged) {
      addRage(attacker, 10);
      addRage(defender, 14);
      const actorAnim: AnimationName =
        kind === 'special'
          ? 'special'
          : kind === 'heavy_attack'
            ? 'heavy_attack'
            : 'attack';

      pushEvent({
        turn,
        type: kind === 'special' ? 'special' : 'dodge',
        actor: attacker.side,
        target: defender.side,
        actorAnim,
        targetAnim: 'dodge',
        damage: 0,
        heal: 0,
        isCrit: false,
        isDodged: true,
        isBlocked: false,
        skillId: skill?.id,
        skillName: skill?.name,
        logText:
          kind === 'special' && skill
            ? `💨 ${attacker.participant.name} lance ${skill.name}, mais ${defender.participant.name} ${pick(DODGE_LINES, rng)}`
            : `💨 ${defender.participant.name} ${pick(DODGE_LINES, rng)}`,
      });

      // Counter-strike opportunity on dodge!
      if (allowCounter && defender.hp > 0 && attacker.hp > 0 && rng() < defender.participant.derived.counterChance) {
        resolveStrike({
          turn,
          attacker: defender,
          defender: attacker,
          kind: 'counter',
          damageMult: 0.78,
          allowCounter: false,
        });
      }
      return;
    }

    const effectiveBlock =
      defender.participant.derived.blockChance * (kind === 'special' ? 0.65 : 1);
    const isBlocked = rng() < effectiveBlock;

    const isCrit = rng() < attacker.participant.derived.critChance;
    let rawDamage = computeRawDamage(attacker, defender, damageMult);
    if (isCrit) {
      rawDamage *= attacker.participant.derived.critMultiplier;
    }
    if (isBlocked) {
      rawDamage = Math.max(1, rawDamage * 0.45);
    }

    const finalDamage = Math.max(1, Math.round(rawDamage));
    const { absorbed } = applyDamage(defender, finalDamage);

    // Rage generation
    if (kind !== 'special') {
      addRage(attacker, isCrit ? 24 : 18);
    }
    addRage(defender, isBlocked ? 16 : 22);

    const actorAnim: AnimationName =
      kind === 'special'
        ? 'special'
        : kind === 'heavy_attack'
          ? 'heavy_attack'
          : 'attack';
    const targetAnim: AnimationName = isBlocked ? 'block' : 'hit';

    const eventType: CombatEvent['type'] =
      kind === 'special'
        ? 'special'
        : kind === 'counter'
          ? 'counter'
          : isBlocked
            ? 'block'
            : kind === 'heavy_attack'
              ? 'heavy_attack'
              : 'attack';

    const vfxType: CombatEvent['vfxType'] =
      kind === 'special'
        ? 'special_burst'
        : kind === 'counter'
          ? 'counter'
          : isBlocked
            ? 'block_spark'
            : kind === 'heavy_attack'
              ? 'heavy_smash'
              : 'slash';

    const shieldSuffix = absorbed > 0 ? ` (bouclier -${absorbed})` : '';
    const critTag = isCrit ? ' 💥 CRITIQUE !' : '';
    const blockTag = isBlocked ? ' 🛡️ Bloqué !' : '';

    let logText = '';
    if (kind === 'special' && skill) {
      const hitCounter =
        totalHits && totalHits > 1 && hitIndex !== undefined ? ` [${hitIndex + 1}/${totalHits}]` : '';
      logText = `${skill.icon} ${attacker.participant.name} déclenche ${skill.name}${hitCounter} : -${finalDamage} PV à ${defender.participant.name} !${critTag}${blockTag}${shieldSuffix}`;
    } else if (kind === 'counter') {
      logText = `⚡ Contre-attaque éclair ! ${attacker.participant.name} riposte sur ${defender.participant.name} (-${finalDamage} PV) !${critTag}${shieldSuffix}`;
    } else if (kind === 'heavy_attack') {
      logText = `🔨 ${attacker.participant.name} ${pick(HEAVY_ATTACK_VERBS, rng)} ${defender.participant.name} (-${finalDamage} PV) !${critTag}${blockTag}${shieldSuffix}`;
    } else {
      logText = `⚔️ ${attacker.participant.name} ${pick(NORMAL_ATTACK_VERBS, rng)} ${defender.participant.name} (-${finalDamage} PV) !${critTag}${blockTag}${shieldSuffix}`;
    }

    pushEvent({
      turn,
      type: eventType,
      actor: attacker.side,
      target: defender.side,
      actorAnim,
      targetAnim,
      damage: finalDamage,
      heal: 0,
      isCrit,
      isDodged: false,
      isBlocked,
      skillId: skill?.id,
      skillName: skill?.name,
      vfxType,
      logText,
    });

    // Apply bleed from gear on clean hit
    if (!isBlocked && attacker.bleedPercentFromGear > 0 && defender.hp > 0) {
      const avgAtk =
        (attacker.participant.derived.minDamage + attacker.participant.derived.maxDamage) / 2;
      defender.bleedTurns = 3;
      defender.bleedDamage = Math.max(
        3,
        Math.round((avgAtk * attacker.bleedPercentFromGear) / 100),
      );
    }

    // Lifesteal heal
    if (finalDamage > 0 && attacker.participant.derived.lifesteal > 0 && attacker.hp > 0 && attacker.hp < attacker.maxHp) {
      const healAmount = Math.max(1, Math.round(finalDamage * attacker.participant.derived.lifesteal));
      const actualHeal = Math.min(attacker.maxHp - attacker.hp, healAmount);
      if (actualHeal > 0) {
        attacker.hp += actualHeal;
        pushEvent({
          turn,
          type: 'heal',
          actor: attacker.side,
          target: attacker.side,
          actorAnim: 'idle',
          targetAnim: 'idle',
          damage: 0,
          heal: actualHeal,
          isCrit: false,
          isDodged: false,
          isBlocked: false,
          vfxType: 'heal_aura',
          logText: `🩸 Vol de vie ! ${attacker.participant.name} récupère +${actualHeal} PV !`,
        });
      }
    }

    // Thorns reflection
    if (finalDamage > 0 && defender.participant.derived.thornsPercent > 0 && attacker.hp > 0 && kind !== 'counter') {
      const thornsDmg = Math.max(1, Math.round(finalDamage * defender.participant.derived.thornsPercent));
      applyDamage(attacker, thornsDmg);
      pushEvent({
        turn,
        type: 'counter',
        actor: defender.side,
        target: attacker.side,
        actorAnim: 'block',
        targetAnim: 'hit',
        damage: thornsDmg,
        heal: 0,
        isCrit: false,
        isDodged: false,
        isBlocked: false,
        vfxType: 'counter',
        logText: `🌵 Les épines de ${defender.participant.name} piquent ${attacker.participant.name} (-${thornsDmg} PV) !`,
      });
    }

    // Counter-strike opportunity on block!
    if (
      allowCounter &&
      isBlocked &&
      defender.hp > 0 &&
      attacker.hp > 0 &&
      rng() < defender.participant.derived.counterChance
    ) {
      resolveStrike({
        turn,
        attacker: defender,
        defender: attacker,
        kind: 'counter',
        damageMult: 0.8,
        allowCounter: false,
      });
    }
  };

  let turn = 0;

  while (left.hp > 0 && right.hp > 0 && turn < MAX_TURNS) {
    turn += 1;

    // Speed-based turn gauge (faster fighters act first & can earn extra turns!)
    const leftSpeed = left.participant.derived.speed + left.speedBonus;
    const rightSpeed = right.participant.derived.speed + right.speedBonus;

    let guard = 0;
    while (left.gauge < 100 && right.gauge < 100 && guard < 25) {
      left.gauge += leftSpeed * (0.9 + rng() * 0.2);
      right.gauge += rightSpeed * (0.9 + rng() * 0.2);
      guard += 1;
    }

    const attacker = left.gauge >= right.gauge ? left : right;
    const defender = attacker.side === 'left' ? right : left;
    attacker.gauge = Math.max(0, attacker.gauge - 100);

    // Bleed tick at start of actor's turn
    if (attacker.bleedTurns > 0 && attacker.hp > 0) {
      attacker.bleedTurns -= 1;
      const bleedDmg = Math.max(1, attacker.bleedDamage);
      applyDamage(attacker, bleedDmg);
      pushEvent({
        turn,
        type: 'bleed_tick',
        actor: defender.side,
        target: attacker.side,
        actorAnim: 'idle',
        targetAnim: 'hit',
        damage: bleedDmg,
        heal: 0,
        isCrit: false,
        isDodged: false,
        isBlocked: false,
        vfxType: 'bleed',
        logText: `🩸 ${attacker.participant.name} saigne et perd -${bleedDmg} PV !`,
      });

      if (attacker.hp <= 0) {
        break;
      }
    }

    // Stun check
    if (attacker.stunTurns > 0) {
      attacker.stunTurns -= 1;
      addRage(attacker, 12);
      pushEvent({
        turn,
        type: 'block',
        actor: defender.side,
        target: attacker.side,
        actorAnim: 'idle',
        targetAnim: 'hit',
        damage: 0,
        heal: 0,
        isCrit: false,
        isDodged: false,
        isBlocked: true,
        logText: `💫 ${attacker.participant.name} est étourdi et perd son tour !`,
      });
      continue;
    }

    // 1) Try an Active Special Skill if Rage >= rageCost
    const readySkill = chooseReadyActiveSkill(attacker);
    if (readySkill) {
      const { def: skill, level: skillLevel } = readySkill;
      attacker.rage = Math.max(0, attacker.rage - (skill.rageCost ?? 60));

      // Apply skill buff if defined
      if (skill.buffStat && skill.buffAmount) {
        const scaledBuff = skill.buffAmount + (skillLevel - 1) * 2;
        if (skill.buffStat === 'str') {
          attacker.attackBonusMult = Math.min(1.6, attacker.attackBonusMult + scaledBuff * 0.02);
        } else if (skill.buffStat === 'agi') {
          attacker.speedBonus = Math.min(40, attacker.speedBonus + scaledBuff);
          attacker.dodgeBonus = Math.min(0.15, attacker.dodgeBonus + scaledBuff * 0.004);
        }
      }

      const hits = Math.max(1, skill.hits ?? 1);
      const levelMult = 1 + (skillLevel - 1) * 0.08;
      const skillMult = (skill.damageMultiplier ?? 1.4) * levelMult;

      for (let h = 0; h < hits; h++) {
        if (defender.hp <= 0 || attacker.hp <= 0) break;
        resolveStrike({
          turn,
          attacker,
          defender,
          kind: 'special',
          damageMult: skillMult,
          skill,
          hitIndex: h,
          totalHits: hits,
          allowCounter: h === hits - 1,
        });
      }

      // Skill heal component
      if (skill.healPercent && attacker.hp > 0) {
        const healAmt = Math.max(
          5,
          Math.round((attacker.maxHp * (skill.healPercent + (skillLevel - 1) * 1.5)) / 100),
        );
        const actualHeal = Math.min(attacker.maxHp - attacker.hp, healAmt);
        if (actualHeal > 0) {
          attacker.hp += actualHeal;
          pushEvent({
            turn,
            type: 'heal',
            actor: attacker.side,
            target: attacker.side,
            actorAnim: 'special',
            targetAnim: 'idle',
            damage: 0,
            heal: actualHeal,
            isCrit: false,
            isDodged: false,
            isBlocked: false,
            skillId: skill.id,
            skillName: skill.name,
            vfxType: 'heal_aura',
            logText: `✨ ${skill.name} soigne ${attacker.participant.name} de +${actualHeal} PV !`,
          });
        }
      }

      // Skill stun component
      if (skill.stunTurns && defender.hp > 0 && attacker.hp > 0) {
        defender.stunTurns = Math.max(defender.stunTurns, skill.stunTurns);
      }

      continue;
    }

    // 2) Heavy Attack (~22% chance) or Normal Attack
    const isHeavy = rng() < 0.22;
    resolveStrike({
      turn,
      attacker,
      defender,
      kind: isHeavy ? 'heavy_attack' : 'attack',
      damageMult: isHeavy ? 1.38 : 1.0,
      allowCounter: true,
    });
  }

  // Determine winner (KO or highest remaining HP% tie-breaker at MAX_TURNS)
  let winner: CombatSide;
  if (left.hp > 0 && right.hp <= 0) {
    winner = 'left';
  } else if (right.hp > 0 && left.hp <= 0) {
    winner = 'right';
  } else {
    const leftRatio = left.hp / left.maxHp;
    const rightRatio = right.hp / right.maxHp;
    winner = leftRatio >= rightRatio ? 'left' : 'right';
  }

  const loser: CombatSide = winner === 'left' ? 'right' : 'left';
  const winnerName = winner === 'left' ? left.participant.name : right.participant.name;
  const loserName = loser === 'left' ? left.participant.name : right.participant.name;

  pushEvent({
    turn,
    type: 'victory',
    actor: winner,
    target: loser,
    actorAnim: 'victory',
    targetAnim: 'defeat',
    damage: 0,
    heal: 0,
    isCrit: false,
    isDodged: false,
    isBlocked: false,
    logText: `🏆 VICTOIRE ! ${winnerName} triomphe de ${loserName} sous les acclamations de l’arène !`,
  });

  return {
    battleId,
    seed,
    arena: params.arena,
    winner,
    totalTurns: turn,
    left: toSnapshot(params.left),
    right: toSnapshot(params.right),
    events,
  };
}
