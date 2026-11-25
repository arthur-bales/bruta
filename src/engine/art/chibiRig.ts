// ============================================================================
// BRUTE LEGENDS — Chibi Anime Rig & 11-Animation Procedural Pose Keyframes
// ============================================================================

import type { AnimationName } from '@shared/types';

export type ChibiExpression =
  | 'normal'
  | 'angry'
  | 'hurt'
  | 'happy'
  | 'dizzy'
  | 'focused'
  | 'braced';

export interface ChibiPose {
  offsetX: number;
  offsetY: number;
  bodyTilt: number;
  headTilt: number;
  headBob: number;
  leftArmAngle: number;
  rightArmAngle: number;
  leftLegAngle: number;
  rightLegAngle: number;
  weaponAngle: number;
  weaponScale: number;
  smearAlpha: number;
  smearAngle: number;
  auraAlpha: number;
  auraColor: string;
  squashX: number;
  squashY: number;
  expression: ChibiExpression;
  capeWave: number;
  dustAlpha: number;
  afterimageAlpha: number;
  // Auxiliary expressive FX channels
  blink: boolean;
  shieldGleam: number;
  sparkleAlpha: number;
  dizzyAlpha: number;
  framePhase: number; // 0..1 normalized progression
}

const DEFAULT_POSE: ChibiPose = {
  offsetX: 0,
  offsetY: 0,
  bodyTilt: 0,
  headTilt: 0,
  headBob: 0,
  leftArmAngle: 0.25,
  rightArmAngle: -0.25,
  leftLegAngle: -0.1,
  rightLegAngle: 0.1,
  weaponAngle: -0.25,
  weaponScale: 1,
  smearAlpha: 0,
  smearAngle: 0,
  auraAlpha: 0,
  auraColor: '#fbbf24',
  squashX: 1,
  squashY: 1,
  expression: 'normal',
  capeWave: 0,
  dustAlpha: 0,
  afterimageAlpha: 0,
  blink: false,
  shieldGleam: 0,
  sparkleAlpha: 0,
  dizzyAlpha: 0,
  framePhase: 0,
};

function makePose(overrides: Partial<ChibiPose>): ChibiPose {
  return { ...DEFAULT_POSE, ...overrides };
}

function clampFrame(frameIndex: number, totalFrames: number): number {
  if (totalFrames <= 1) return 0;
  return ((Math.floor(frameIndex) % totalFrames) + totalFrames) % totalFrames;
}

const IDLE_FRAMES: Partial<ChibiPose>[] = [
  { offsetY: 0, headBob: 0, bodyTilt: 0.01, leftArmAngle: 0.28, rightArmAngle: -0.24, weaponAngle: -0.26, squashX: 1.0, squashY: 1.0, capeWave: 0.0 },
  { offsetY: -1.5, headBob: -1.0, bodyTilt: 0.02, leftArmAngle: 0.22, rightArmAngle: -0.30, weaponAngle: -0.32, squashX: 0.985, squashY: 1.018, capeWave: 0.35 },
  { offsetY: -2.2, headBob: -1.5, bodyTilt: 0.03, leftArmAngle: 0.18, rightArmAngle: -0.34, weaponAngle: -0.36, squashX: 0.98, squashY: 1.022, capeWave: 0.72 },
  { offsetY: -1.2, headBob: -0.6, bodyTilt: 0.02, leftArmAngle: 0.24, rightArmAngle: -0.28, weaponAngle: -0.30, squashX: 0.992, squashY: 1.01, capeWave: 0.95 },
  { offsetY: 0.5, headBob: 0.8, bodyTilt: 0.0, leftArmAngle: 0.31, rightArmAngle: -0.20, weaponAngle: -0.22, squashX: 1.018, squashY: 0.984, capeWave: 0.55, blink: true },
  { offsetY: 0.8, headBob: 0.5, bodyTilt: 0.0, leftArmAngle: 0.30, rightArmAngle: -0.22, weaponAngle: -0.24, squashX: 1.012, squashY: 0.99, capeWave: 0.2 },
];

const WALK_FRAMES: Partial<ChibiPose>[] = [
  { offsetY: 0, headBob: 0.5, bodyTilt: 0.09, headTilt: -0.02, leftLegAngle: -0.52, rightLegAngle: 0.52, leftArmAngle: 0.55, rightArmAngle: -0.48, weaponAngle: -0.35, squashX: 1.03, squashY: 0.97, capeWave: 0.1 },
  { offsetY: -4.2, headBob: -1.8, bodyTilt: 0.11, headTilt: 0.02, leftLegAngle: -0.22, rightLegAngle: 0.22, leftArmAngle: 0.25, rightArmAngle: -0.22, weaponAngle: -0.25, squashX: 0.97, squashY: 1.03, capeWave: 0.45 },
  { offsetY: -1.2, headBob: -0.4, bodyTilt: 0.08, headTilt: 0.01, leftLegAngle: 0.18, rightLegAngle: -0.18, leftArmAngle: -0.12, rightArmAngle: 0.10, weaponAngle: -0.15, squashX: 1.0, squashY: 1.0, capeWave: 0.8 },
  { offsetY: 0, headBob: 0.5, bodyTilt: 0.09, headTilt: -0.02, leftLegAngle: 0.52, rightLegAngle: -0.52, leftArmAngle: -0.45, rightArmAngle: 0.38, weaponAngle: -0.05, squashX: 1.03, squashY: 0.97, capeWave: 1.0 },
  { offsetY: -4.2, headBob: -1.8, bodyTilt: 0.11, headTilt: 0.02, leftLegAngle: 0.22, rightLegAngle: -0.22, leftArmAngle: -0.18, rightArmAngle: 0.15, weaponAngle: -0.16, squashX: 0.97, squashY: 1.03, capeWave: 0.65 },
  { offsetY: -1.2, headBob: -0.4, bodyTilt: 0.08, headTilt: 0.01, leftLegAngle: -0.18, rightLegAngle: 0.18, leftArmAngle: 0.22, rightArmAngle: -0.20, weaponAngle: -0.28, squashX: 1.0, squashY: 1.0, capeWave: 0.3 },
];

const RUN_FRAMES: Partial<ChibiPose>[] = [
  { offsetX: 3, offsetY: 1, headBob: 1.0, bodyTilt: 0.30, headTilt: -0.10, leftLegAngle: -0.92, rightLegAngle: 0.88, leftArmAngle: 0.92, rightArmAngle: -0.82, weaponAngle: -0.78, squashX: 1.06, squashY: 0.94, expression: 'focused', capeWave: 0.8, dustAlpha: 0.8 },
  { offsetX: 5, offsetY: -6.5, headBob: -2.0, bodyTilt: 0.34, headTilt: -0.12, leftLegAngle: -0.42, rightLegAngle: 0.36, leftArmAngle: 0.48, rightArmAngle: -0.55, weaponAngle: -0.88, squashX: 0.94, squashY: 1.06, expression: 'focused', capeWave: 1.15, dustAlpha: 0.45 },
  { offsetX: 4, offsetY: -3.0, headBob: -0.8, bodyTilt: 0.28, headTilt: -0.08, leftLegAngle: 0.24, rightLegAngle: -0.28, leftArmAngle: -0.18, rightArmAngle: -0.15, weaponAngle: -0.68, squashX: 0.98, squashY: 1.02, expression: 'focused', capeWave: 0.95, dustAlpha: 0.25 },
  { offsetX: 3, offsetY: 1, headBob: 1.0, bodyTilt: 0.30, headTilt: -0.10, leftLegAngle: 0.90, rightLegAngle: -0.88, leftArmAngle: -0.72, rightArmAngle: 0.55, weaponAngle: -0.45, squashX: 1.06, squashY: 0.94, expression: 'focused', capeWave: 1.2, dustAlpha: 0.85 },
  { offsetX: 5, offsetY: -6.5, headBob: -2.0, bodyTilt: 0.34, headTilt: -0.12, leftLegAngle: 0.40, rightLegAngle: -0.38, leftArmAngle: -0.32, rightArmAngle: 0.22, weaponAngle: -0.58, squashX: 0.94, squashY: 1.06, expression: 'focused', capeWave: 1.05, dustAlpha: 0.5 },
  { offsetX: 4, offsetY: -3.0, headBob: -0.8, bodyTilt: 0.28, headTilt: -0.08, leftLegAngle: -0.26, rightLegAngle: 0.28, leftArmAngle: 0.38, rightArmAngle: -0.42, weaponAngle: -0.74, squashX: 0.98, squashY: 1.02, expression: 'focused', capeWave: 0.85, dustAlpha: 0.3 },
];

const ATTACK_FRAMES: Partial<ChibiPose>[] = [
  // 0: snappy windup
  { offsetX: -7, offsetY: 2, bodyTilt: -0.20, headTilt: 0.06, leftLegAngle: -0.35, rightLegAngle: 0.30, leftArmAngle: 0.65, rightArmAngle: -1.45, weaponAngle: -1.35, weaponScale: 1.04, squashX: 1.06, squashY: 0.95, expression: 'angry', capeWave: -0.4 },
  // 1: coiled tension peak
  { offsetX: -10, offsetY: 4, bodyTilt: -0.28, headTilt: 0.08, leftLegAngle: -0.45, rightLegAngle: 0.38, leftArmAngle: 0.82, rightArmAngle: -1.78, weaponAngle: -1.65, weaponScale: 1.08, squashX: 1.10, squashY: 0.91, expression: 'angry', capeWave: -0.65, dustAlpha: 0.35 },
  // 2: explosive forward slash + huge smear!
  { offsetX: 15, offsetY: -2, bodyTilt: 0.30, headTilt: -0.08, leftLegAngle: -0.65, rightLegAngle: 0.72, leftArmAngle: -0.75, rightArmAngle: 1.15, weaponAngle: 0.95, weaponScale: 1.26, smearAlpha: 0.96, smearAngle: 0.12, squashX: 1.12, squashY: 0.91, expression: 'angry', capeWave: 1.25, dustAlpha: 0.72 },
  // 3: slash follow-through
  { offsetX: 13, offsetY: 1, bodyTilt: 0.26, headTilt: -0.05, leftLegAngle: -0.52, rightLegAngle: 0.60, leftArmAngle: -0.62, rightArmAngle: 1.38, weaponAngle: 1.28, weaponScale: 1.14, smearAlpha: 0.52, smearAngle: 0.42, squashX: 1.04, squashY: 0.96, expression: 'angry', capeWave: 0.95, dustAlpha: 0.35 },
  // 4: settle recoil
  { offsetX: 6, offsetY: 0, bodyTilt: 0.10, headTilt: -0.02, leftLegAngle: -0.24, rightLegAngle: 0.28, leftArmAngle: -0.15, rightArmAngle: 0.52, weaponAngle: 0.45, weaponScale: 1.02, smearAlpha: 0.12, smearAngle: 0.55, squashX: 1.0, squashY: 1.0, expression: 'focused', capeWave: 0.45 },
  // 5: recover
  { offsetX: 1, offsetY: 0, bodyTilt: 0.02, leftLegAngle: -0.12, rightLegAngle: 0.12, leftArmAngle: 0.22, rightArmAngle: -0.18, weaponAngle: -0.22, squashX: 1.0, squashY: 1.0, expression: 'normal', capeWave: 0.15 },
];

const HEAVY_ATTACK_FRAMES: Partial<ChibiPose>[] = [
  // 0: deep crouch charge
  { offsetX: -4, offsetY: 7, bodyTilt: -0.16, headTilt: 0.08, leftLegAngle: -0.45, rightLegAngle: 0.45, leftArmAngle: 0.55, rightArmAngle: -1.10, weaponAngle: -1.15, weaponScale: 1.05, squashX: 1.16, squashY: 0.85, expression: 'angry', capeWave: -0.3, dustAlpha: 0.45, auraAlpha: 0.22, auraColor: '#f59e0b' },
  // 1: launch upward
  { offsetX: -2, offsetY: -16, bodyTilt: -0.24, headTilt: -0.08, leftLegAngle: 0.32, rightLegAngle: -0.35, leftArmAngle: -1.15, rightArmAngle: -1.75, weaponAngle: -1.70, weaponScale: 1.14, squashX: 0.88, squashY: 1.14, expression: 'angry', capeWave: 0.9, dustAlpha: 0.55, auraAlpha: 0.42, auraColor: '#f59e0b' },
  // 2: mid-air apex, weapon cocked sky-high
  { offsetX: 2, offsetY: -24, bodyTilt: -0.32, headTilt: -0.10, leftLegAngle: 0.52, rightLegAngle: -0.25, leftArmAngle: -1.45, rightArmAngle: -2.18, weaponAngle: -2.05, weaponScale: 1.22, squashX: 0.92, squashY: 1.10, expression: 'angry', capeWave: 1.25, auraAlpha: 0.65, auraColor: '#f97316' },
  // 3: downward meteor plunge
  { offsetX: 10, offsetY: -9, bodyTilt: 0.16, headTilt: 0.04, leftLegAngle: -0.30, rightLegAngle: 0.48, leftArmAngle: -0.55, rightArmAngle: -0.20, weaponAngle: -0.28, weaponScale: 1.32, smearAlpha: 0.78, smearAngle: -0.28, squashX: 0.94, squashY: 1.08, expression: 'angry', capeWave: 1.35, auraAlpha: 0.65, auraColor: '#f97316' },
  // 4: MASSIVE OVERHEAD SLAM IMPACT!
  { offsetX: 17, offsetY: 6, bodyTilt: 0.42, headTilt: -0.10, leftLegAngle: -0.68, rightLegAngle: 0.78, leftArmAngle: -0.82, rightArmAngle: 1.38, weaponAngle: 1.48, weaponScale: 1.42, smearAlpha: 1.0, smearAngle: 0.32, squashX: 1.25, squashY: 0.77, expression: 'angry', capeWave: 1.5, dustAlpha: 1.0, auraAlpha: 0.55, auraColor: '#fbbf24', sparkleAlpha: 0.65 },
  // 5: impact shockwave hold
  { offsetX: 15, offsetY: 4, bodyTilt: 0.36, headTilt: -0.06, leftLegAngle: -0.58, rightLegAngle: 0.68, leftArmAngle: -0.70, rightArmAngle: 1.45, weaponAngle: 1.52, weaponScale: 1.24, smearAlpha: 0.46, smearAngle: 0.52, squashX: 1.13, squashY: 0.88, expression: 'angry', capeWave: 1.0, dustAlpha: 0.72, auraAlpha: 0.25, auraColor: '#fbbf24' },
  // 6: lifting weapon back up
  { offsetX: 7, offsetY: 1, bodyTilt: 0.16, leftLegAngle: -0.30, rightLegAngle: 0.35, leftArmAngle: -0.12, rightArmAngle: 0.52, weaponAngle: 0.55, weaponScale: 1.06, smearAlpha: 0.1, squashX: 1.03, squashY: 0.97, expression: 'focused', capeWave: 0.45, dustAlpha: 0.25 },
  // 7: return to battle guard
  { offsetX: 1, offsetY: 0, bodyTilt: 0.02, leftLegAngle: -0.12, rightLegAngle: 0.12, leftArmAngle: 0.22, rightArmAngle: -0.20, weaponAngle: -0.22, squashX: 1.0, squashY: 1.0, expression: 'normal', capeWave: 0.15 },
];

const HIT_FRAMES: Partial<ChibiPose>[] = [
  // 0: sudden impact snap
  { offsetX: -12, offsetY: -4, bodyTilt: -0.40, headTilt: -0.32, headBob: -2, leftLegAngle: 0.42, rightLegAngle: -0.20, leftArmAngle: -1.15, rightArmAngle: -1.25, weaponAngle: -1.1, squashX: 0.84, squashY: 1.16, expression: 'hurt', capeWave: -0.9, dustAlpha: 0.55 },
  // 1: max knockback + wobble squash
  { offsetX: -16, offsetY: 2, bodyTilt: -0.48, headTilt: -0.36, headBob: 1, leftLegAngle: 0.55, rightLegAngle: -0.32, leftArmAngle: -1.35, rightArmAngle: -1.45, weaponAngle: -1.35, squashX: 1.14, squashY: 0.87, expression: 'hurt', capeWave: -1.1, dustAlpha: 0.75 },
  // 2: reeling back
  { offsetX: -9, offsetY: 1, bodyTilt: -0.24, headTilt: -0.16, leftLegAngle: 0.28, rightLegAngle: -0.15, leftArmAngle: -0.45, rightArmAngle: -0.65, weaponAngle: -0.65, squashX: 1.04, squashY: 0.96, expression: 'hurt', capeWave: -0.5, dustAlpha: 0.35 },
  // 3: catching footing
  { offsetX: -3, offsetY: 0, bodyTilt: -0.07, headTilt: -0.04, leftLegAngle: 0.08, rightLegAngle: -0.05, leftArmAngle: 0.12, rightArmAngle: -0.30, weaponAngle: -0.30, squashX: 1.0, squashY: 1.0, expression: 'braced', capeWave: -0.15 },
];

const DODGE_FRAMES: Partial<ChibiPose>[] = [
  // 0: agile crouch coil
  { offsetX: -2, offsetY: 5, bodyTilt: -0.12, leftLegAngle: -0.35, rightLegAngle: 0.35, leftArmAngle: 0.55, rightArmAngle: -0.65, weaponAngle: -0.75, squashX: 1.14, squashY: 0.86, expression: 'focused', capeWave: -0.3, dustAlpha: 0.45, afterimageAlpha: 0.25 },
  // 1: explosive back-hop launch
  { offsetX: -12, offsetY: -13, bodyTilt: -0.46, headTilt: 0.14, leftLegAngle: 0.65, rightLegAngle: 0.35, leftArmAngle: -0.95, rightArmAngle: -0.95, weaponAngle: -1.0, squashX: 0.90, squashY: 1.12, expression: 'focused', capeWave: -1.1, dustAlpha: 0.55, afterimageAlpha: 0.72 },
  // 2: mid-air acrobatic flip tuck
  { offsetX: -18, offsetY: -20, bodyTilt: -1.10, headTilt: 0.22, leftLegAngle: 0.95, rightLegAngle: 0.75, leftArmAngle: -1.35, rightArmAngle: -1.15, weaponAngle: -1.3, squashX: 0.95, squashY: 1.05, expression: 'focused', capeWave: -1.45, afterimageAlpha: 0.9 },
  // 3: whip-around descent
  { offsetX: -14, offsetY: -10, bodyTilt: -0.38, headTilt: 0.10, leftLegAngle: 0.45, rightLegAngle: -0.15, leftArmAngle: -0.55, rightArmAngle: -0.75, weaponAngle: -0.85, squashX: 0.94, squashY: 1.07, expression: 'focused', capeWave: -0.95, afterimageAlpha: 0.65 },
  // 4: sleek low landing
  { offsetX: -6, offsetY: 4, bodyTilt: 0.14, headTilt: -0.06, leftLegAngle: -0.48, rightLegAngle: 0.48, leftArmAngle: 0.55, rightArmAngle: -0.50, weaponAngle: -0.55, squashX: 1.15, squashY: 0.86, expression: 'focused', capeWave: 0.65, dustAlpha: 0.72, afterimageAlpha: 0.32 },
  // 5: ready stance snap
  { offsetX: 0, offsetY: 0, bodyTilt: 0.04, leftLegAngle: -0.15, rightLegAngle: 0.15, leftArmAngle: 0.25, rightArmAngle: -0.25, weaponAngle: -0.28, squashX: 1.0, squashY: 1.0, expression: 'focused', capeWave: 0.2, afterimageAlpha: 0.08 },
];

const BLOCK_FRAMES: Partial<ChibiPose>[] = [
  // 0: snap into defensive guard
  { offsetX: -1, offsetY: 3, bodyTilt: -0.06, headTilt: 0.05, leftLegAngle: -0.35, rightLegAngle: 0.38, leftArmAngle: -0.48, rightArmAngle: -0.72, weaponAngle: -1.18, squashX: 1.06, squashY: 0.94, expression: 'braced', capeWave: -0.25, shieldGleam: 0.45 },
  // 1: heavy impact absorbed with gleam!
  { offsetX: -7, offsetY: 5, bodyTilt: -0.16, headTilt: 0.10, leftLegAngle: -0.48, rightLegAngle: 0.52, leftArmAngle: -0.62, rightArmAngle: -0.85, weaponAngle: -1.32, weaponScale: 1.08, squashX: 1.14, squashY: 0.87, expression: 'braced', capeWave: -0.75, dustAlpha: 0.65, shieldGleam: 1.0 },
  // 2: holding strong
  { offsetX: -5, offsetY: 4, bodyTilt: -0.12, headTilt: 0.07, leftLegAngle: -0.42, rightLegAngle: 0.46, leftArmAngle: -0.56, rightArmAngle: -0.78, weaponAngle: -1.26, squashX: 1.07, squashY: 0.93, expression: 'braced', capeWave: -0.45, dustAlpha: 0.3, shieldGleam: 0.62 },
  // 3: easing out of guard
  { offsetX: -1, offsetY: 1, bodyTilt: -0.04, headTilt: 0.02, leftLegAngle: -0.22, rightLegAngle: 0.24, leftArmAngle: -0.20, rightArmAngle: -0.45, weaponAngle: -0.72, squashX: 1.01, squashY: 0.99, expression: 'braced', capeWave: -0.15, shieldGleam: 0.2 },
];

const VICTORY_FRAMES: Partial<ChibiPose>[] = [
  // 0: happy pre-bounce crouch
  { offsetY: 4, headBob: 1, bodyTilt: 0.0, headTilt: -0.06, leftLegAngle: -0.22, rightLegAngle: 0.22, leftArmAngle: -1.35, rightArmAngle: -1.45, weaponAngle: -1.35, squashX: 1.10, squashY: 0.90, expression: 'happy', capeWave: 0.25, sparkleAlpha: 0.6 },
  // 1: joyful jump + double pump!
  { offsetY: -14, headBob: -2.5, bodyTilt: -0.05, headTilt: -0.10, leftLegAngle: 0.35, rightLegAngle: -0.35, leftArmAngle: -2.42, rightArmAngle: -2.32, weaponAngle: -1.95, weaponScale: 1.08, squashX: 0.91, squashY: 1.11, expression: 'happy', capeWave: 1.0, sparkleAlpha: 1.0 },
  // 2: floating peak wiggle
  { offsetY: -15, headBob: -2.0, bodyTilt: 0.05, headTilt: 0.08, leftLegAngle: -0.25, rightLegAngle: 0.25, leftArmAngle: -2.25, rightArmAngle: -2.48, weaponAngle: -2.08, weaponScale: 1.08, squashX: 0.95, squashY: 1.06, expression: 'happy', capeWave: 0.8, sparkleAlpha: 0.92 },
  // 3: bouncy landing
  { offsetY: 3, headBob: 1.2, bodyTilt: 0.02, headTilt: 0.04, leftLegAngle: -0.24, rightLegAngle: 0.24, leftArmAngle: -1.55, rightArmAngle: -1.65, weaponAngle: -1.45, squashX: 1.11, squashY: 0.90, expression: 'happy', capeWave: 0.35, dustAlpha: 0.35, sparkleAlpha: 0.72 },
  // 4: proud heroic fist-pump hop
  { offsetY: -7, headBob: -1.4, bodyTilt: -0.06, headTilt: -0.08, leftLegAngle: -0.18, rightLegAngle: 0.32, leftArmAngle: -2.18, rightArmAngle: -2.35, weaponAngle: -1.90, weaponScale: 1.05, squashX: 0.95, squashY: 1.06, expression: 'happy', capeWave: 0.75, sparkleAlpha: 0.95 },
  // 5: cheerful landing smile
  { offsetY: 0, headBob: 0, bodyTilt: 0.0, headTilt: -0.03, leftLegAngle: -0.14, rightLegAngle: 0.14, leftArmAngle: -1.75, rightArmAngle: -1.85, weaponAngle: -1.55, squashX: 1.02, squashY: 0.98, expression: 'happy', capeWave: 0.45, sparkleAlpha: 0.8 },
];

const DEFEAT_FRAMES: Partial<ChibiPose>[] = [
  // 0: dazed wobble
  { offsetX: -6, offsetY: -1, bodyTilt: -0.34, headTilt: -0.26, leftLegAngle: 0.30, rightLegAngle: -0.20, leftArmAngle: -0.90, rightArmAngle: -0.85, weaponAngle: -0.85, squashX: 0.94, squashY: 1.06, expression: 'hurt', capeWave: -0.5, dizzyAlpha: 0.3 },
  // 1: tipping backwards dramatically
  { offsetX: -12, offsetY: 3, bodyTilt: -0.76, headTilt: -0.30, leftLegAngle: 0.58, rightLegAngle: 0.25, leftArmAngle: -1.45, rightArmAngle: -1.25, weaponAngle: -1.35, squashX: 0.96, squashY: 1.04, expression: 'dizzy', capeWave: -0.9, dizzyAlpha: 0.6 },
  // 2: mid-tumble
  { offsetX: -16, offsetY: 11, bodyTilt: -1.22, headTilt: -0.22, leftLegAngle: 0.72, rightLegAngle: 0.40, leftArmAngle: -1.65, rightArmAngle: -1.45, weaponAngle: -1.55, squashX: 1.02, squashY: 0.98, expression: 'dizzy', capeWave: -1.1, dustAlpha: 0.45, dizzyAlpha: 0.8 },
  // 3: comic THUD slump!
  { offsetX: -18, offsetY: 22, bodyTilt: -1.48, headTilt: -0.12, leftLegAngle: 0.45, rightLegAngle: 0.20, leftArmAngle: -1.10, rightArmAngle: 0.65, weaponAngle: 0.95, squashX: 1.18, squashY: 0.84, expression: 'dizzy', capeWave: -0.4, dustAlpha: 0.95, dizzyAlpha: 1.0 },
  // 4: little comic bounce off floor
  { offsetX: -18, offsetY: 19, bodyTilt: -1.43, headTilt: -0.06, leftLegAngle: 0.35, rightLegAngle: 0.15, leftArmAngle: -0.95, rightArmAngle: 0.75, weaponAngle: 1.05, squashX: 1.06, squashY: 0.94, expression: 'dizzy', capeWave: -0.2, dustAlpha: 0.45, dizzyAlpha: 1.0 },
  // 5: slumped KO with orbiting stars
  { offsetX: -18, offsetY: 21, bodyTilt: -1.46, headTilt: -0.08, leftLegAngle: 0.38, rightLegAngle: 0.18, leftArmAngle: -1.02, rightArmAngle: 0.72, weaponAngle: 1.02, squashX: 1.08, squashY: 0.92, expression: 'dizzy', capeWave: -0.15, dizzyAlpha: 1.0 },
];

const SPECIAL_FRAMES: Partial<ChibiPose>[] = [
  // 0: dramatic power crouch + aura ignition
  { offsetX: -4, offsetY: 6, bodyTilt: -0.12, headTilt: 0.08, leftLegAngle: -0.45, rightLegAngle: 0.45, leftArmAngle: 0.75, rightArmAngle: -0.85, weaponAngle: -0.95, weaponScale: 1.08, auraAlpha: 0.55, auraColor: '#fbbf24', squashX: 1.14, squashY: 0.87, expression: 'focused', capeWave: 0.85, dustAlpha: 0.45 },
  // 1: raging power-up surge
  { offsetX: -6, offsetY: 7, bodyTilt: -0.18, headTilt: 0.10, leftLegAngle: -0.52, rightLegAngle: 0.52, leftArmAngle: 0.95, rightArmAngle: -1.35, weaponAngle: -1.40, weaponScale: 1.16, auraAlpha: 0.88, auraColor: '#f97316', squashX: 1.16, squashY: 0.86, expression: 'angry', capeWave: 1.25, dustAlpha: 0.75, sparkleAlpha: 0.45 },
  // 2: MAXIMUM SHONEN CHARGE!
  { offsetX: -2, offsetY: -7, bodyTilt: -0.24, headTilt: -0.10, leftLegAngle: -0.22, rightLegAngle: 0.32, leftArmAngle: -1.35, rightArmAngle: -2.05, weaponAngle: -1.95, weaponScale: 1.26, auraAlpha: 1.0, auraColor: '#ef4444', squashX: 0.90, squashY: 1.12, expression: 'angry', capeWave: 1.55, dustAlpha: 0.55, sparkleAlpha: 0.8 },
  // 3: lightning dash forward
  { offsetX: 11, offsetY: -10, bodyTilt: 0.22, headTilt: -0.08, leftLegAngle: -0.58, rightLegAngle: 0.65, leftArmAngle: -0.85, rightArmAngle: -0.45, weaponAngle: -0.45, weaponScale: 1.36, smearAlpha: 0.65, smearAngle: -0.22, auraAlpha: 0.95, auraColor: '#fbbf24', squashX: 0.94, squashY: 1.08, expression: 'angry', capeWave: 1.65, afterimageAlpha: 0.68, sparkleAlpha: 0.75 },
  // 4: EXPLOSIVE FINISHER BURST!
  { offsetX: 20, offsetY: -1, bodyTilt: 0.38, headTilt: -0.08, leftLegAngle: -0.75, rightLegAngle: 0.82, leftArmAngle: -0.95, rightArmAngle: 1.32, weaponAngle: 1.35, weaponScale: 1.50, smearAlpha: 1.0, smearAngle: 0.18, auraAlpha: 1.0, auraColor: '#fef08a', squashX: 1.22, squashY: 0.82, expression: 'angry', capeWave: 1.8, dustAlpha: 1.0, afterimageAlpha: 0.45, sparkleAlpha: 1.0 },
  // 5: blazing shockwave follow-through
  { offsetX: 18, offsetY: 2, bodyTilt: 0.30, headTilt: -0.05, leftLegAngle: -0.62, rightLegAngle: 0.70, leftArmAngle: -0.78, rightArmAngle: 1.48, weaponAngle: 1.52, weaponScale: 1.34, smearAlpha: 0.72, smearAngle: 0.45, auraAlpha: 0.78, auraColor: '#f59e0b', squashX: 1.10, squashY: 0.91, expression: 'angry', capeWave: 1.35, dustAlpha: 0.7, sparkleAlpha: 0.82 },
  // 6: heroic finisher hold
  { offsetX: 10, offsetY: 0, bodyTilt: 0.12, headTilt: -0.02, leftLegAngle: -0.34, rightLegAngle: 0.40, leftArmAngle: -0.25, rightArmAngle: 0.65, weaponAngle: 0.62, weaponScale: 1.12, smearAlpha: 0.22, smearAngle: 0.58, auraAlpha: 0.45, auraColor: '#fbbf24', squashX: 1.02, squashY: 0.98, expression: 'focused', capeWave: 0.7, dustAlpha: 0.25, sparkleAlpha: 0.48 },
  // 7: cool anime stance return
  { offsetX: 2, offsetY: 0, bodyTilt: 0.03, leftLegAngle: -0.14, rightLegAngle: 0.14, leftArmAngle: 0.18, rightArmAngle: -0.18, weaponAngle: -0.22, weaponScale: 1.02, auraAlpha: 0.15, auraColor: '#fbbf24', squashX: 1.0, squashY: 1.0, expression: 'focused', capeWave: 0.25, sparkleAlpha: 0.18 },
];

const POSE_TABLE: Record<AnimationName, Partial<ChibiPose>[]> = {
  idle: IDLE_FRAMES,
  walk: WALK_FRAMES,
  run: RUN_FRAMES,
  attack: ATTACK_FRAMES,
  heavy_attack: HEAVY_ATTACK_FRAMES,
  hit: HIT_FRAMES,
  dodge: DODGE_FRAMES,
  block: BLOCK_FRAMES,
  victory: VICTORY_FRAMES,
  defeat: DEFEAT_FRAMES,
  special: SPECIAL_FRAMES,
};

/**
 * Samples a fluid, expressive cel-shaded chibi pose for any of the 11 animations.
 * Keeps character pivot, proportions, and silhouette 100% consistent across frames.
 */
export function sampleChibiPose(
  anim: AnimationName,
  frameIndex: number,
  totalFrames: number
): ChibiPose {
  const frames = POSE_TABLE[anim] ?? IDLE_FRAMES;
  const safeTotal = Math.max(1, totalFrames || frames.length);
  const clamped = clampFrame(frameIndex, safeTotal);
  const mappedIndex =
    safeTotal === frames.length
      ? clamped
      : Math.min(frames.length - 1, Math.floor((clamped / safeTotal) * frames.length));

  const base = frames[mappedIndex] ?? frames[0];
  return makePose({
    ...base,
    framePhase: safeTotal > 1 ? clamped / (safeTotal - 1) : 0,
  });
}
