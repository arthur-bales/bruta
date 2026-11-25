import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  ALL_ANIMATIONS,
  ANIMATION_SPECS,
  SPRITE_FRAME_SIZE,
  SPRITE_MAX_COLS,
} from '../shared/constants';
import { sampleChibiPose, type ChibiExpression } from '../src/engine/art/chibiRig';

const ROOT_DIR = path.resolve(__dirname, '..');

const VALID_EXPRESSIONS: ReadonlySet<ChibiExpression> = new Set([
  'normal',
  'angry',
  'hurt',
  'happy',
  'dizzy',
  'focused',
  'braced',
]);

interface AtlasCell {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  expression: string;
}

interface AtlasAnimation {
  row: number;
  frames: number;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
  label: string;
  cells: AtlasCell[];
}

interface ChibiAtlasJson {
  meta: {
    sheetWidth: number;
    sheetHeight: number;
    frameWidth: number;
    frameHeight: number;
    maxCols: number;
    rows: number;
    totalActiveFrames: number;
  };
  animations: Record<string, AtlasAnimation>;
}

describe('Chibi Rig & Spritesheet Spec Validation', () => {
  it('sampleChibiPose succeeds for all 11 animations and every frame with finite numbers and valid expressions', () => {
    expect(ALL_ANIMATIONS).toHaveLength(11);

    let totalSampledFrames = 0;

    for (const anim of ALL_ANIMATIONS) {
      const spec = ANIMATION_SPECS[anim];
      expect(spec).toBeDefined();
      expect(spec.frames).toBeGreaterThan(0);
      expect(spec.frames).toBeLessThanOrEqual(SPRITE_MAX_COLS);

      for (let frameIdx = 0; frameIdx < spec.frames; frameIdx++) {
        const pose = sampleChibiPose(anim, frameIdx, spec.frames);
        totalSampledFrames += 1;

        const numericFields: number[] = [
          pose.offsetX,
          pose.offsetY,
          pose.bodyTilt,
          pose.headTilt,
          pose.headBob,
          pose.leftArmAngle,
          pose.rightArmAngle,
          pose.leftLegAngle,
          pose.rightLegAngle,
          pose.weaponAngle,
          pose.weaponScale,
          pose.smearAlpha,
          pose.smearAngle,
          pose.auraAlpha,
          pose.squashX,
          pose.squashY,
          pose.capeWave,
          pose.dustAlpha,
          pose.afterimageAlpha,
          pose.shieldGleam,
          pose.sparkleAlpha,
          pose.dizzyAlpha,
          pose.framePhase,
        ];

        for (const val of numericFields) {
          expect(Number.isFinite(val), `Non-finite pose value in ${anim}[${frameIdx}]`).toBe(true);
        }

        expect(pose.squashX).toBeGreaterThan(0);
        expect(pose.squashY).toBeGreaterThan(0);
        expect(pose.weaponScale).toBeGreaterThan(0);
        expect(pose.framePhase).toBeGreaterThanOrEqual(0);
        expect(pose.framePhase).toBeLessThanOrEqual(1);
        expect(VALID_EXPRESSIONS.has(pose.expression)).toBe(true);
        expect(pose.auraColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(typeof pose.blink).toBe('boolean');
      }
    }

    expect(totalSampledFrames).toBe(66);
  });

  it('public/assets/spritesheets/chibi_atlas.json matches 1280x1760 regular 160x160 grid with 11 animations (66 active frames)', () => {
    const atlasPath = path.join(ROOT_DIR, 'public/assets/spritesheets/chibi_atlas.json');
    expect(fs.existsSync(atlasPath)).toBe(true);

    const raw = fs.readFileSync(atlasPath, 'utf-8');
    const atlas = JSON.parse(raw) as ChibiAtlasJson;

    expect(atlas.meta.sheetWidth).toBe(1280);
    expect(atlas.meta.sheetHeight).toBe(1760);
    expect(atlas.meta.frameWidth).toBe(SPRITE_FRAME_SIZE);
    expect(atlas.meta.frameHeight).toBe(SPRITE_FRAME_SIZE);
    expect(atlas.meta.maxCols).toBe(SPRITE_MAX_COLS);
    expect(atlas.meta.rows).toBe(11);
    expect(atlas.meta.totalActiveFrames).toBe(66);
    expect(atlas.meta.maxCols * atlas.meta.frameWidth).toBe(atlas.meta.sheetWidth);
    expect(atlas.meta.rows * atlas.meta.frameHeight).toBe(atlas.meta.sheetHeight);

    let totalCells = 0;
    for (const anim of ALL_ANIMATIONS) {
      const spec = ANIMATION_SPECS[anim];
      const entry = atlas.animations[anim];
      expect(entry, `Missing animation "${anim}" in chibi_atlas.json`).toBeDefined();
      expect(entry.row).toBe(spec.row);
      expect(entry.frames).toBe(spec.frames);
      expect(entry.frameRate).toBe(spec.frameRate);
      expect(entry.repeat).toBe(spec.repeat);
      expect(entry.startFrame).toBe(spec.row * SPRITE_MAX_COLS);
      expect(entry.endFrame).toBe(spec.row * SPRITE_MAX_COLS + spec.frames - 1);
      expect(entry.cells).toHaveLength(spec.frames);

      for (let col = 0; col < spec.frames; col++) {
        const cell = entry.cells[col];
        expect(cell.col).toBe(col);
        expect(cell.row).toBe(spec.row);
        expect(cell.x).toBe(col * SPRITE_FRAME_SIZE);
        expect(cell.y).toBe(spec.row * SPRITE_FRAME_SIZE);
        expect(cell.width).toBe(SPRITE_FRAME_SIZE);
        expect(cell.height).toBe(SPRITE_FRAME_SIZE);
        expect(cell.x + cell.width).toBeLessThanOrEqual(atlas.meta.sheetWidth);
        expect(cell.y + cell.height).toBeLessThanOrEqual(atlas.meta.sheetHeight);
        expect(VALID_EXPRESSIONS.has(cell.expression as ChibiExpression)).toBe(true);
        totalCells += 1;
      }
    }

    expect(totalCells).toBe(66);

    const svgPath = path.join(ROOT_DIR, 'public/assets/spritesheets/chibi_base_grid.svg');
    expect(fs.existsSync(svgPath)).toBe(true);
    expect(fs.statSync(svgPath).size).toBeGreaterThan(1000);
  });

  it('all 3 arena background JPEGs exist and are valid non-empty files', () => {
    const arenas = ['coliseum.jpg', 'dojo.jpg', 'volcano.jpg'];

    for (const file of arenas) {
      const filePath = path.join(ROOT_DIR, 'public/assets/arenas', file);
      expect(fs.existsSync(filePath), `Missing arena background: ${file}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(5_000);

      // Verify JPEG SOI header bytes (0xFF 0xD8)
      const buf = Buffer.alloc(2);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buf, 0, 2, 0);
      } finally {
        fs.closeSync(fd);
      }
      expect(buf[0]).toBe(0xff);
      expect(buf[1]).toBe(0xd8);
    }
  });
});
