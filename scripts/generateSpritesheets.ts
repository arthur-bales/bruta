// ============================================================================
// BRUTE LEGENDS — Static Spritesheet Atlas Metadata & Reference Sheet Exporter
// Run via: npx tsx scripts/generateSpritesheets.ts
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_ANIMATIONS,
  ANIMATION_SPECS,
  DEFAULT_APPEARANCE,
  SPRITE_FRAME_SIZE,
  SPRITE_MAX_COLS,
} from '../shared/constants';
import { sampleChibiPose, type ChibiPose } from '../src/engine/art/chibiRig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'spritesheets');

const SHEET_W = SPRITE_MAX_COLS * SPRITE_FRAME_SIZE; // 1280
const SHEET_H = ALL_ANIMATIONS.length * SPRITE_FRAME_SIZE; // 1760
const INK = '#231917';

function radToDeg(rad: number): string {
  return ((rad * 180) / Math.PI).toFixed(1);
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function renderSvgEyes(pose: ChibiPose): string {
  if (pose.expression === 'hurt') {
    return `
      <path d="M -7 -1 L 1 3 L -7 7 M 19 -1 L 11 3 L 19 7" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  }
  if (pose.expression === 'happy') {
    return `
      <path d="M -7 5 A 5.5 5.5 0 0 1 3 5 M 9 5 A 5.5 5.5 0 0 1 19 5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    `;
  }
  if (pose.expression === 'dizzy') {
    return `
      <circle cx="-2" cy="3" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2.2"/>
      <circle cx="14" cy="3" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2.2"/>
      <circle cx="-2" cy="3" r="2" fill="none" stroke="${INK}" stroke-width="1.8"/>
      <circle cx="14" cy="3" r="2" fill="none" stroke="${INK}" stroke-width="1.8"/>
    `;
  }
  if (pose.blink) {
    return `
      <path d="M -6 4 Q -2 8 2 4 M 10 4 Q 14 8 18 4" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
    `;
  }
  const eyH = pose.expression === 'braced' ? 4.8 : 7.2;
  const brow =
    pose.expression === 'angry' || pose.expression === 'focused'
      ? `<path d="M -8 -7 L 3 -3.5 M 19 -7 L 9 -3.5" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : `<path d="M -7 -6.5 L 2 -5.5 M 10 -5.5 L 19 -6.5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `
    <ellipse cx="-2" cy="3" rx="5" ry="${eyH}" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="-1.2" cy="3.5" rx="3.4" ry="${fmt(eyH * 0.78)}" fill="${DEFAULT_APPEARANCE.eyeColor}"/>
    <circle cx="-1" cy="3.2" r="2" fill="${INK}"/>
    <circle cx="-3" cy="${fmt(3 - eyH * 0.35)}" r="1.8" fill="#fff"/>
    <ellipse cx="14" cy="3" rx="4.6" ry="${eyH}" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="14.6" cy="3.5" rx="3.1" ry="${fmt(eyH * 0.78)}" fill="${DEFAULT_APPEARANCE.eyeColor}"/>
    <circle cx="14.7" cy="3.2" r="1.8" fill="${INK}"/>
    <circle cx="12.8" cy="${fmt(3 - eyH * 0.35)}" r="1.7" fill="#fff"/>
    ${brow}
  `;
}

function renderSvgChibiCell(
  cellX: number,
  cellY: number,
  animLabel: string,
  frameIdx: number,
  pose: ChibiPose
): string {
  const skin = DEFAULT_APPEARANCE.skinColor;
  const hair = DEFAULT_APPEARANCE.hairColor;
  const primary = DEFAULT_APPEARANCE.outfitPrimary;
  const secondary = DEFAULT_APPEARANCE.outfitSecondary;

  const aura =
    pose.auraAlpha > 0.05
      ? `<ellipse cx="${fmt(74 + pose.offsetX)}" cy="${fmt(94 + pose.offsetY * 0.6)}" rx="46" ry="54" fill="${pose.auraColor}" fill-opacity="${fmt(pose.auraAlpha * 0.35)}" stroke="${pose.auraColor}" stroke-width="2" stroke-opacity="${fmt(pose.auraAlpha * 0.7)}"/>`
      : '';

  const smear =
    pose.smearAlpha > 0.05
      ? `<path d="M 10 -52 A 54 54 0 0 1 56 14 L 38 14 A 34 34 0 0 0 8 -34 Z" fill="${secondary}" fill-opacity="${fmt(pose.smearAlpha * 0.75)}" stroke="#fff" stroke-width="2"/>`
      : '';

  const shadowScale = Math.max(0.5, 1 - Math.max(0, -pose.offsetY) / 70);

  return `
  <g transform="translate(${cellX}, ${cellY})">
    <rect x="0" y="0" width="${SPRITE_FRAME_SIZE}" height="${SPRITE_FRAME_SIZE}" fill="none" stroke="#e2d9c8" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="6" y="14" font-family="monospace" font-size="10" fill="#6b5d4d">${animLabel} #${frameIdx}</text>
    ${aura}
    <ellipse cx="${fmt(74 + pose.offsetX * 0.7)}" cy="138" rx="${fmt(26 * shadowScale)}" ry="${fmt(7 * shadowScale)}" fill="${INK}" fill-opacity="0.22"/>

    <g transform="translate(${fmt(74 + pose.offsetX)}, ${fmt(136 + pose.offsetY)}) scale(${fmt(pose.squashX)}, ${fmt(pose.squashY)}) translate(0, -24) rotate(${radToDeg(pose.bodyTilt)})">
      <!-- Back Arm -->
      <g transform="translate(-11, -20) rotate(${radToDeg(pose.leftArmAngle)})">
        <rect x="-4.5" y="-2" width="9" height="15" rx="4.5" fill="${primary}" stroke="${INK}" stroke-width="3"/>
        <circle cx="0" cy="14" r="5.6" fill="${skin}" stroke="${INK}" stroke-width="3"/>
      </g>
      <!-- Legs -->
      <g transform="translate(-6.5, 0) rotate(${radToDeg(pose.leftLegAngle)})">
        <rect x="-5.5" y="0" width="11" height="22" rx="5" fill="#7c4a28" stroke="${INK}" stroke-width="3"/>
      </g>
      <g transform="translate(6.5, 0) rotate(${radToDeg(pose.rightLegAngle)})">
        <rect x="-5.5" y="0" width="11" height="22" rx="5" fill="#7c4a28" stroke="${INK}" stroke-width="3"/>
      </g>
      <!-- Torso -->
      <path d="M -12 -24 Q 0 -27 12 -24 L 14.5 -2 Q 0 4 -14.5 -2 Z" fill="${primary}" stroke="${INK}" stroke-width="3.2"/>
      <rect x="-14" y="-8.5" width="28" height="5" rx="2" fill="#5a351c" stroke="${INK}" stroke-width="2.2"/>
      <rect x="-3.5" y="-9" width="7" height="6" rx="1.5" fill="${secondary}" stroke="${INK}" stroke-width="2"/>

      <!-- Large Chibi Head -->
      <g transform="translate(1, ${fmt(-46 + pose.headBob)}) rotate(${radToDeg(pose.headTilt)})">
        <circle cx="-22" cy="4" r="5.6" fill="${skin}" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="0" cy="0" rx="23.5" ry="22.5" fill="${skin}" stroke="${INK}" stroke-width="3.2"/>
        <ellipse cx="-9.5" cy="10.5" rx="5" ry="3" fill="#fb7185" fill-opacity="0.4"/>
        <ellipse cx="18.5" cy="10.5" rx="4.2" ry="2.6" fill="#fb7185" fill-opacity="0.4"/>
        ${renderSvgEyes(pose)}
        <path d="M 2 13.5 Q 6.5 16.5 11 13" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
        <!-- Spiky Shonen Hair -->
        <path d="M -24 1 L -28 -14 L -18 -18 L -14 -33 L -3 -24 L 6 -34 L 13 -23 L 24 -27 L 21 -13 L 27 -8 L 22 -1 L 15 -9 L 10 -1 L 3 -10 L -4 -1 L -11 -10 L -17 3 Z" fill="${hair}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
      </g>

      <!-- Front Arm + Oversized Chibi Broadsword -->
      <g transform="translate(11, -20) rotate(${radToDeg(pose.rightArmAngle)})">
        <rect x="-4.5" y="-2" width="9" height="15" rx="4.5" fill="${primary}" stroke="${INK}" stroke-width="3"/>
        <g transform="translate(1, 14) rotate(${radToDeg(pose.weaponAngle)}) scale(${fmt(pose.weaponScale)})">
          ${smear}
          <path d="M -7 -7 L -8 -48 L 0 -60 L 8 -48 L 7 -7 Z" fill="#cbd5e1" stroke="${INK}" stroke-width="3"/>
          <rect x="-13" y="-10" width="26" height="6" rx="3" fill="${secondary}" stroke="${INK}" stroke-width="2.8"/>
        </g>
        <circle cx="0" cy="14" r="5.6" fill="${skin}" stroke="${INK}" stroke-width="3"/>
      </g>
    </g>
  </g>`;
}

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const animationsAtlas: Record<
    string,
    {
      row: number;
      frames: number;
      startFrame: number;
      endFrame: number;
      frameRate: number;
      repeat: number;
      label: string;
      cells: {
        index: number;
        col: number;
        row: number;
        x: number;
        y: number;
        width: number;
        height: number;
        expression: string;
      }[];
    }
  > = {};

  const svgCells: string[] = [];
  let totalActiveFrames = 0;

  for (const animName of ALL_ANIMATIONS) {
    const spec = ANIMATION_SPECS[animName];
    const startFrame = spec.row * SPRITE_MAX_COLS;
    const endFrame = startFrame + spec.frames - 1;
    const cells = [];

    for (let col = 0; col < spec.frames; col++) {
      const pose = sampleChibiPose(animName, col, spec.frames);
      const x = col * SPRITE_FRAME_SIZE;
      const y = spec.row * SPRITE_FRAME_SIZE;

      cells.push({
        index: startFrame + col,
        col,
        row: spec.row,
        x,
        y,
        width: SPRITE_FRAME_SIZE,
        height: SPRITE_FRAME_SIZE,
        expression: pose.expression,
      });

      svgCells.push(renderSvgChibiCell(x, y, animName, col, pose));
      totalActiveFrames++;
    }

    animationsAtlas[animName] = {
      row: spec.row,
      frames: spec.frames,
      startFrame,
      endFrame,
      frameRate: spec.frameRate,
      repeat: spec.repeat,
      label: spec.label,
      cells,
    };
  }

  const atlasPayload = {
    meta: {
      game: 'Brute Legends',
      style: 'cel-shaded-chibi-anime',
      format: 'regular-grid-spritesheet',
      sheetWidth: SHEET_W,
      sheetHeight: SHEET_H,
      frameWidth: SPRITE_FRAME_SIZE,
      frameHeight: SPRITE_FRAME_SIZE,
      maxCols: SPRITE_MAX_COLS,
      rows: ALL_ANIMATIONS.length,
      totalActiveFrames,
      referenceSvg: 'chibi_base_grid.svg',
      generatedAt: new Date().toISOString(),
    },
    animations: animationsAtlas,
  };

  const atlasPath = path.join(OUTPUT_DIR, 'chibi_atlas.json');
  fs.writeFileSync(atlasPath, JSON.stringify(atlasPayload, null, 2) + '\n', 'utf8');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${SHEET_H}" viewBox="0 0 ${SHEET_W} ${SHEET_H}">
  <title>Brute Legends — Chibi Anime 11-Animation Regular Grid Spritesheet (${SHEET_W}x${SHEET_H})</title>
  <rect x="0" y="0" width="${SHEET_W}" height="${SHEET_H}" fill="transparent"/>
  ${svgCells.join('\n')}
</svg>
`;

  const svgPath = path.join(OUTPUT_DIR, 'chibi_base_grid.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf8');

  console.log(
    `[generateSpritesheets] Exported ${ALL_ANIMATIONS.length} animations (${totalActiveFrames} frames, ${SHEET_W}x${SHEET_H} grid)`
  );
  console.log(`  -> ${path.relative(ROOT_DIR, atlasPath)}`);
  console.log(`  -> ${path.relative(ROOT_DIR, svgPath)}`);
}

main();
