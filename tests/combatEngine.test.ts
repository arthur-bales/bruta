import { describe, expect, it } from 'vitest';
import {
  fighterToCombatParticipant,
  opponentToCombatParticipant,
  simulateCombat,
  type CombatParticipant,
} from '../shared/combatEngine';
import { instantiateEquipment } from '../shared/equipmentCatalog';
import { OPPONENTS_CATALOG, SEED_RIVAL_FIGHTERS } from '../shared/opponentsCatalog';
import { createInitialFighter } from '../shared/progression';
import type { AnimationName, CombatEventType, FighterProfile } from '../shared/types';

function createStackedFighter(id: string, name: string, level = 12): FighterProfile {
  const f = createInitialFighter(id, name);
  f.level = level;
  f.baseStats = { str: 22, def: 20, agi: 22, vit: 24, lck: 18 };
  f.equipped = {
    weapon: instantiateEquipment('wpn_katana', `${id}_wpn`), // bleed
    helmet: instantiateEquipment('hlm_viking_helm', `${id}_hlm`),
    armor: instantiateEquipment('arm_iron_plate', `${id}_arm`),
    gloves: instantiateEquipment('glv_iron_gauntlets', `${id}_glv`),
    boots: instantiateEquipment('bts_ninja_tabi', `${id}_bts`),
    accessory: instantiateEquipment('acc_demon_wings', `${id}_acc`), // vampirism
  };
  f.skills = {
    warrior_cry: 3,
    vampiric_blade: 3,
    furious_whirlwind: 3,
    thunder_bolt: 2,
    steel_skin: 3,
    feline_instinct: 3,
    hawk_eye: 2,
  };
  f.equippedSkills = ['warrior_cry', 'vampiric_blade', 'thunder_bolt'];
  return f;
}

describe('Combat Engine (shared/combatEngine.ts)', () => {
  it('produces identical BattleResult for identical seed and inputs (determinism)', () => {
    const left = fighterToCombatParticipant(createStackedFighter('p_left', 'Kaito', 10));
    const right = opponentToCombatParticipant(OPPONENTS_CATALOG[2]);

    const runA = simulateCombat({
      left,
      right,
      arena: 'coliseum',
      seed: 133742,
      battleId: 'btl_det_test',
    });

    const runB = simulateCombat({
      left,
      right,
      arena: 'coliseum',
      seed: 133742,
      battleId: 'btl_det_test',
    });

    expect(runA).toEqual(runB);
    expect(runA.seed).toBe(133742);
    expect(runA.events.length).toBeGreaterThan(3);

    // Different seeds should diverge in event timelines
    const runC = simulateCombat({
      left,
      right,
      arena: 'coliseum',
      seed: 987654,
      battleId: 'btl_det_test',
    });
    expect(runC.events).not.toEqual(runA.events);
  });

  it('exercises all combat event types and combat animations across seeded battles', () => {
    const fighterA = createStackedFighter('cov_a', 'Sakura', 14);
    const fighterB = createStackedFighter('cov_b', 'Riku', 14);
    // Give fighterB a counter weapon & hero cape (shield_start) so counter + block + bleed + heal all fire
    fighterB.equipped.weapon = instantiateEquipment('wpn_broadsword', 'cov_b_wpn');
    fighterB.equipped.accessory = instantiateEquipment('acc_hero_cape', 'cov_b_acc');

    const left = fighterToCombatParticipant(fighterA);
    const right = fighterToCombatParticipant(fighterB);

    const observedTypes = new Set<CombatEventType>();
    const observedAnims = new Set<AnimationName>();

    for (let seed = 1; seed <= 40; seed++) {
      const result = simulateCombat({
        left,
        right,
        arena: seed % 2 === 0 ? 'dojo' : 'volcano',
        seed: seed * 7919,
        battleId: `btl_cov_${seed}`,
      });

      for (const ev of result.events) {
        observedTypes.add(ev.type);
        observedAnims.add(ev.actorAnim);
        observedAnims.add(ev.targetAnim);
      }
    }

    const expectedEventTypes: CombatEventType[] = [
      'battle_start',
      'move_in',
      'attack',
      'heavy_attack',
      'special',
      'counter',
      'bleed_tick',
      'heal',
      'dodge',
      'block',
      'victory',
    ];

    for (const type of expectedEventTypes) {
      expect(observedTypes.has(type), `Expected combat event type "${type}" to be exercised`).toBe(
        true,
      );
    }

    const expectedCombatAnims: AnimationName[] = [
      'idle',
      'run',
      'attack',
      'heavy_attack',
      'special',
      'hit',
      'dodge',
      'block',
      'victory',
      'defeat',
    ];

    for (const anim of expectedCombatAnims) {
      expect(observedAnims.has(anim), `Expected animation "${anim}" to appear in events`).toBe(
        true,
      );
    }
  });

  it('keeps both fighters within 0..maxHp and 0..100 rage on every event', () => {
    const left = fighterToCombatParticipant(createStackedFighter('bounds_l', 'Tornado', 15));
    const right = fighterToCombatParticipant(createStackedFighter('bounds_r', 'Bagarrox', 15));

    for (let seed = 100; seed < 125; seed++) {
      const result = simulateCombat({
        left,
        right,
        arena: 'coliseum',
        seed,
      });

      let expectedSeq = 0;
      for (const ev of result.events) {
        expect(ev.seq).toBe(expectedSeq++);
        expect(ev.leftHp).toBeGreaterThanOrEqual(0);
        expect(ev.leftHp).toBeLessThanOrEqual(ev.leftMaxHp);
        expect(ev.rightHp).toBeGreaterThanOrEqual(0);
        expect(ev.rightHp).toBeLessThanOrEqual(ev.rightMaxHp);

        expect(ev.leftRage).toBeGreaterThanOrEqual(0);
        expect(ev.leftRage).toBeLessThanOrEqual(100);
        expect(ev.rightRage).toBeGreaterThanOrEqual(0);
        expect(ev.rightRage).toBeLessThanOrEqual(100);
      }

      const first = result.events[0];
      const last = result.events[result.events.length - 1];
      expect(first.type).toBe('battle_start');
      expect(last.type).toBe('victory');
      expect(last.actor).toBe(result.winner);
      expect(last.actorAnim).toBe('victory');
      expect(last.targetAnim).toBe('defeat');
    }
  });

  it('terminates all Boss and PvP battles cleanly within 40 turns with a valid winner', () => {
    const heroProfile = createStackedFighter('hero_boss_tester', 'Champion', 18);
    const hero: CombatParticipant = fighterToCombatParticipant(heroProfile);

    const bosses = OPPONENTS_CATALOG.filter((o) => o.isBoss);
    expect(bosses.length).toBeGreaterThan(0);

    for (const [idx, boss] of bosses.entries()) {
      const res = simulateCombat({
        left: hero,
        right: opponentToCombatParticipant(boss),
        arena: boss.arena,
        seed: 5000 + idx,
      });

      expect(res.totalTurns).toBeGreaterThan(0);
      expect(res.totalTurns).toBeLessThanOrEqual(40);
      expect(['left', 'right']).toContain(res.winner);
      expect(res.events[res.events.length - 1].type).toBe('victory');
    }

    expect(SEED_RIVAL_FIGHTERS.length).toBeGreaterThan(0);
    for (const [idx, rival] of SEED_RIVAL_FIGHTERS.entries()) {
      const res = simulateCombat({
        left: hero,
        right: opponentToCombatParticipant(rival),
        arena: 'coliseum',
        seed: 8000 + idx,
      });

      expect(res.totalTurns).toBeGreaterThan(0);
      expect(res.totalTurns).toBeLessThanOrEqual(40);
      expect(['left', 'right']).toContain(res.winner);
      expect(res.events[res.events.length - 1].type).toBe('victory');
    }
  });
});
