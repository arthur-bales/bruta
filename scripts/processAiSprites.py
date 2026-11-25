#!/usr/bin/env python3
"""
BRUTE LEGENDS — AI Sprite Chroma-Key, Despill, Alignment & Spritesheet Pipeline
Processes AI-generated chibi anime sprites, rivals, weapons, chests, and dummy into:
  1. Clean transparent PNGs under public/assets/ai/
  2. Regular-grid 11-animation PNG spritesheet under public/assets/spritesheets/hero_ai_spritesheet.png
  3. Optimized WebP Data-URI pack for standalone preview embedding
"""

import base64
import io
import json
import os
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

BRAIN_DIR = Path("/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/f296d1e6-6b86-4a5a-8cf3-56b519f30510")
REPO_DIR = Path("/home/antigravity/arthur-bales/bruta")
OUT_AI = REPO_DIR / "public/assets/ai"
OUT_SHEETS = REPO_DIR / "public/assets/spritesheets"
ARENAS_DIR = REPO_DIR / "public/assets/arenas"

SRC = {
    "hero_master": BRAIN_DIR / "chibi_hero_master_1795607592883.jpg",
    "hero_sheet_1": BRAIN_DIR / "hero_anim_sheet_1_1795607630504.jpg",
    "hero_sheet_2": BRAIN_DIR / "hero_anim_sheet_2_1795607635309.jpg",
    "hero_sheet_3": BRAIN_DIR / "hero_anim_sheet_3_1795607638096.jpg",
    "rivals_1": BRAIN_DIR / "ai_rivals_sheet_1795607637716.jpg",
    "rivals_2": BRAIN_DIR / "ai_more_rivals_1795607669954.jpg",
    "dummy": BRAIN_DIR / "ai_training_dummy_1795607598132.jpg",
    "weapons": BRAIN_DIR / "ai_weapons_sheet_1795607596240.jpg",
    "chests": BRAIN_DIR / "ai_chests_sheet_1795607597764.jpg",
    "gear": BRAIN_DIR / "ai_gear_icons_1795607668122.jpg",
}


def remove_chroma_bg(img: Image.Image, mode: str = "green") -> Image.Image:
    """
    Border-seeded chroma-key removal + edge despill.
    Preserves interior highlights and cel-shaded outlines cleanly.
    """
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    if mode == "green":
        # Strong green dominance relative to red & blue
        dom = g - np.maximum(r, b)
        is_key = (dom > 45) & (g > 110)
        soft_key = (dom > 18) & (g > 90)
    else:
        # Magenta chroma key (#FF00FF): both R and B much higher than G
        dom = np.minimum(r, b) - g
        is_key = (dom > 45) & (r > 120) & (b > 120)
        soft_key = (dom > 18) & (r > 95) & (b > 95)

    h, w = is_key.shape
    # Flood-fill from all 4 borders through soft_key pixels so we only remove exterior background
    # plus isolated pure chroma holes (between legs/arms) that strongly match is_key
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if soft_key[0, x]:
            bg[0, x] = True
            q.append((0, x))
        if soft_key[h - 1, x]:
            bg[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if soft_key[y, 0] and not bg[y, 0]:
            bg[y, 0] = True
            q.append((y, 0))
        if soft_key[y, w - 1] and not bg[y, w - 1]:
            bg[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and soft_key[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    # Also catch interior chroma cutouts (like gaps between legs/arms/weapon handles)
    bg = bg | is_key

    # Dilate bg by 1px to soften fringe pixels & compute alpha
    alpha = np.where(bg, 0.0, 255.0)

    # Soft anti-aliased fringe pass on pixels adjacent to bg
    padded = np.pad(bg, 1, mode="constant", constant_values=True)
    near_bg = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
        | padded[:-2, :-2] | padded[:-2, 2:] | padded[2:, :-2] | padded[2:, 2:]
    )
    fringe = (~bg) & near_bg & (dom > 5)
    if mode == "green":
        # Despill green channel on fringe pixels and gently lower alpha proportional to green excess
        spill = np.clip((g - np.maximum(r, b)) / 60.0, 0.0, 1.0)
        arr[:, :, 1] = np.where(fringe, np.minimum(g, np.maximum(r, b) * 0.96), g)
        alpha = np.where(fringe, np.clip(255.0 * (1.0 - spill * 0.72), 0, 255), alpha)
        # Second gentle despill on any remaining greenish border tint
        mild_green = (~bg) & (g > np.maximum(r, b) + 12) & near_bg
        arr[:, :, 1] = np.where(mild_green, np.maximum(r, b), arr[:, :, 1])
    else:
        spill = np.clip((np.minimum(r, b) - g) / 60.0, 0.0, 1.0)
        avg = np.minimum(r, b) * 0.75 + g * 0.25
        arr[:, :, 0] = np.where(fringe, np.minimum(r, avg), r)
        arr[:, :, 2] = np.where(fringe, np.minimum(b, avg), b)
        alpha = np.where(fringe, np.clip(255.0 * (1.0 - spill * 0.72), 0, 255), alpha)

    arr[:, :, 3] = alpha
    # Zero RGB on fully transparent pixels so LANCZOS/BICUBIC transforms never bleed chroma color
    trans = alpha <= 2
    arr[trans, 0] = 0
    arr[trans, 1] = 0
    arr[trans, 2] = 0
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def crop_and_fit(rgba: Image.Image, size: int = 256, align_bottom: bool = True, fill_ratio: float = 0.84) -> Image.Image:
    """Trim transparent margin and fit cleanly into size x size transparent cell."""
    alpha = np.array(rgba)[:, :, 3]
    ys, xs = np.where(alpha > 24)
    if len(xs) == 0:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x0, x1 = max(0, int(xs.min()) - 2), min(rgba.width, int(xs.max()) + 3)
    y0, y1 = max(0, int(ys.min()) - 2), min(rgba.height, int(ys.max()) + 3)
    cropped = rgba.crop((x0, y0, x1, y1))

    max_dim = int(size * fill_ratio)
    scale = min(max_dim / cropped.width, max_dim / cropped.height)
    nw = max(1, int(round(cropped.width * scale)))
    nh = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    if align_bottom:
        oy = int(size * 0.93) - nh
    else:
        oy = (size - nh) // 2
    oy = max(2, min(size - nh - 2, oy))
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def slice_grid(path: Path, cols: int, rows: int, mode: str = "green", inset: float = 0.02):
    img = Image.open(path)
    cw, ch = img.width / cols, img.height / rows
    cells = []
    for r in range(rows):
        for c in range(cols):
            pad_x = int(cw * inset)
            pad_y = int(ch * inset)
            box = (
                int(c * cw) + pad_x,
                int(r * ch) + pad_y,
                int((c + 1) * cw) - pad_x,
                int((r + 1) * ch) - pad_y,
            )
            sub = img.crop(box)
            cells.append(remove_chroma_bg(sub, mode=mode))
    return cells


def transform_pose(img: Image.Image, dx: int = 0, dy: int = 0, sx: float = 1.0, sy: float = 1.0, rot: float = 0.0) -> Image.Image:
    """Create crisp micro-motion animation frames from an AI keyframe."""
    size = img.width
    nw = max(1, int(round(size * sx)))
    nh = max(1, int(round(size * sy)))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    if abs(rot) > 0.1:
        scaled = scaled.rotate(rot, resample=Image.Resampling.BILINEAR, expand=False)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2 + dx
    oy = int(size * 0.93) - int(nh * 0.93) + dy
    out.paste(scaled, (ox, oy), scaled)
    return out


def to_data_uri(img: Image.Image, max_size: int = 192, fmt: str = "WEBP", quality: int = 84) -> str:
    im = img.copy()
    if im.width > max_size or im.height > max_size:
        im.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    if fmt == "JPEG":
        im.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True)
        mime = "image/jpeg"
    else:
        im.save(buf, format="WEBP", quality=quality, method=6)
        mime = "image/webp"
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def main():
    for sub in ["hero", "rivals", "weapons", "gear", "chests"]:
        (OUT_AI / sub).mkdir(parents=True, exist_ok=True)
    OUT_SHEETS.mkdir(parents=True, exist_ok=True)

    print("[1/6] Processing Hero Master & 12 AI Pose Keyframes...")
    hero_idle = crop_and_fit(remove_chroma_bg(Image.open(SRC["hero_master"]), "green"), 256, True, 0.84)
    s1 = slice_grid(SRC["hero_sheet_1"], 2, 2, "green", inset=0.015)
    s2 = slice_grid(SRC["hero_sheet_2"], 2, 2, "green", inset=0.015)
    s3 = slice_grid(SRC["hero_sheet_3"], 2, 2, "green", inset=0.015)

    poses = {
        "idle": hero_idle,
        "walk": crop_and_fit(s1[0], 256, True, 0.84),
        "run": crop_and_fit(s1[1], 256, True, 0.84),
        "attack": crop_and_fit(s1[2], 256, True, 0.86),
        "heavy_attack": crop_and_fit(s1[3], 256, True, 0.86),
        "hit": crop_and_fit(s2[0], 256, True, 0.84),
        "dodge": crop_and_fit(s2[1], 256, True, 0.84),
        "block": crop_and_fit(s2[2], 256, True, 0.84),
        "victory": crop_and_fit(s2[3], 256, True, 0.86),
        "defeat": crop_and_fit(s3[0], 256, True, 0.78),
        "special": crop_and_fit(s3[1], 256, True, 0.92),
        "attack_windup": crop_and_fit(s3[2], 256, True, 0.84),
        "idle_alt": crop_and_fit(s3[3], 256, True, 0.84),
    }

    for name, im in poses.items():
        im.save(OUT_AI / "hero" / f"{name}.png")

    print("[2/6] Building 11-Row Regular-Grid AI Spritesheet (1024x2816)...")
    # 11 animations x 4 frames per row = crisp 1024x2816 transparent PNG spritesheet!
    anim_rows = [
        ("idle", [
            poses["idle"],
            transform_pose(poses["idle"], dy=2, sx=1.02, sy=0.98),
            poses["idle_alt"],
            transform_pose(poses["idle_alt"], dy=2, sx=1.02, sy=0.98),
        ]),
        ("walk", [
            poses["walk"],
            transform_pose(poses["walk"], dy=-5, rot=-2.5),
            poses["idle_alt"],
            transform_pose(poses["walk"], dy=-4, rot=2.5),
        ]),
        ("run", [
            poses["run"],
            transform_pose(poses["run"], dx=4, dy=-8, sx=1.05, sy=0.96, rot=-3),
            transform_pose(poses["run"], dx=2, dy=-2, sx=0.98, sy=1.03, rot=-1),
            transform_pose(poses["run"], dx=5, dy=-7, sx=1.04, sy=0.97, rot=-4),
        ]),
        ("attack", [
            poses["attack_windup"],
            transform_pose(poses["attack_windup"], dx=-6, sx=0.96, sy=1.04),
            transform_pose(poses["attack"], dx=12, sx=1.07, sy=0.95),
            transform_pose(poses["attack"], dx=4, sx=1.02, sy=0.98),
        ]),
        ("heavy_attack", [
            poses["attack_windup"],
            transform_pose(poses["heavy_attack"], dy=-16, sx=0.95, sy=1.06, rot=4),
            transform_pose(poses["heavy_attack"], dx=10, dy=-4, sx=1.10, sy=0.92, rot=-5),
            transform_pose(poses["attack"], dx=14, dy=4, sx=1.12, sy=0.89),
        ]),
        ("hit", [
            transform_pose(poses["hit"], dx=-10, rot=6, sx=0.94, sy=1.06),
            poses["hit"],
            transform_pose(poses["hit"], dx=-5, rot=3),
            transform_pose(poses["idle_alt"], dx=-3),
        ]),
        ("dodge", [
            transform_pose(poses["dodge"], dx=-8, dy=-6, rot=5),
            transform_pose(poses["dodge"], dx=-14, dy=-12, rot=8),
            poses["dodge"],
            poses["idle_alt"],
        ]),
        ("block", [
            transform_pose(poses["block"], dx=-5, sx=1.06, sy=0.94),
            poses["block"],
            transform_pose(poses["block"], dx=-3, sx=1.03, sy=0.97),
            poses["block"],
        ]),
        ("victory", [
            poses["idle"],
            transform_pose(poses["victory"], dy=-14, sx=0.96, sy=1.05),
            poses["victory"],
            transform_pose(poses["victory"], dy=-8, sx=1.02, sy=0.99),
        ]),
        ("defeat", [
            transform_pose(poses["hit"], dx=-8, rot=12),
            transform_pose(poses["defeat"], dy=-8, rot=6),
            poses["defeat"],
            transform_pose(poses["defeat"], dy=2, sx=1.03, sy=0.97),
        ]),
        ("special", [
            transform_pose(poses["attack_windup"], dy=4, sx=1.06, sy=0.94),
            transform_pose(poses["special"], sx=0.96, sy=1.05),
            transform_pose(poses["special"], dy=-6, sx=1.06, sy=1.02),
            transform_pose(poses["special"], dx=6, dy=-2, sx=1.03, sy=1.01),
        ]),
    ]

    cell = 256
    cols = 4
    rows = len(anim_rows)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    atlas = {"frameWidth": cell, "frameHeight": cell, "cols": cols, "rows": rows, "animations": {}}
    for r_idx, (anim_name, frames) in enumerate(anim_rows):
        for c_idx, frame_img in enumerate(frames):
            sheet.paste(frame_img, (c_idx * cell, r_idx * cell), frame_img)
        atlas["animations"][anim_name] = {
            "row": r_idx,
            "startFrame": r_idx * cols,
            "endFrame": r_idx * cols + len(frames) - 1,
            "frames": len(frames),
        }
    sheet.save(OUT_SHEETS / "hero_ai_spritesheet.png")
    (OUT_SHEETS / "hero_ai_atlas.json").write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    print("[3/6] Processing 6 AI Rivals & Bosses...")
    r1 = slice_grid(SRC["rivals_1"], 2, 2, "green", inset=0.015)
    r2 = slice_grid(SRC["rivals_2"], 2, 1, "green", inset=0.015)
    rivals = {
        "caillou": crop_and_fit(r2[0], 256, True, 0.84),
        "kenshi": crop_and_fit(r1[0], 256, True, 0.86),
        "grog": crop_and_fit(r1[1], 256, True, 0.88),
        "kitsune": crop_and_fit(r1[2], 256, True, 0.86),
        "ignis": crop_and_fit(r2[1], 256, True, 0.88),
        "draconis": crop_and_fit(r1[3], 256, True, 0.90),
    }
    for name, im in rivals.items():
        im.save(OUT_AI / "rivals" / f"{name}.png")

    print("[4/6] Processing AI Training Dummy...")
    dummy = crop_and_fit(remove_chroma_bg(Image.open(SRC["dummy"]), "magenta"), 256, True, 0.88)
    dummy.save(OUT_AI / "dummy.png")

    print("[5/6] Processing AI Weapons, Gear Icons & Chests...")
    w_cells = slice_grid(SRC["weapons"], 3, 2, "green", inset=0.025)
    weapon_names = ["wooden_club", "frying_pan", "broadsword", "katana", "battle_axe", "mythic_scythe"]
    weapons = {}
    for name, cell_im in zip(weapon_names, w_cells):
        im = crop_and_fit(cell_im, 192, False, 0.86)
        im.save(OUT_AI / "weapons" / f"{name}.png")
        weapons[name] = im

    g_cells = slice_grid(SRC["gear"], 3, 2, "green", inset=0.025)
    gear_names = ["headband", "viking_helm", "samurai_kabuto", "armor_tunic", "flame_fists", "scarf_boots"]
    gears = {}
    for name, cell_im in zip(gear_names, g_cells):
        im = crop_and_fit(cell_im, 192, False, 0.86)
        im.save(OUT_AI / "gear" / f"{name}.png")
        gears[name] = im

    c_cells = slice_grid(SRC["chests"], 3, 1, "green", inset=0.02)
    chest_names = ["chest_wood", "chest_epic", "chest_mythic"]
    chests = {}
    for name, cell_im in zip(chest_names, c_cells):
        im = crop_and_fit(cell_im, 192, False, 0.86)
        im.save(OUT_AI / "chests" / f"{name}.png")
        chests[name] = im

    print("[6/6] Exporting compact WebP Data-URI bundle for standalone preview...")
    bundle = {
        "hero": {k: to_data_uri(v, 220, "WEBP", 84) for k, v in poses.items()},
        "rivals": {k: to_data_uri(v, 220, "WEBP", 84) for k, v in rivals.items()},
        "dummy": to_data_uri(dummy, 220, "WEBP", 84),
        "weapons": {k: to_data_uri(v, 128, "WEBP", 84) for k, v in weapons.items()},
        "gear": {k: to_data_uri(v, 128, "WEBP", 84) for k, v in gears.items()},
        "chests": {k: to_data_uri(v, 148, "WEBP", 84) for k, v in chests.items()},
        "arenas": {
            "coliseum": to_data_uri(Image.open(ARENAS_DIR / "coliseum.jpg"), 760, "JPEG", 78),
            "dojo": to_data_uri(Image.open(ARENAS_DIR / "dojo.jpg"), 760, "JPEG", 78),
            "volcano": to_data_uri(Image.open(ARENAS_DIR / "volcano.jpg"), 760, "JPEG", 78),
        },
    }
    out_bundle = OUT_AI / "standalone_bundle.json"
    out_bundle.write_text(json.dumps(bundle), encoding="utf-8")
    size_kb = out_bundle.stat().st_size / 1024
    print(f"DONE! Generated all AI transparent PNGs, 11-row hero_ai_spritesheet.png, and standalone_bundle.json ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
