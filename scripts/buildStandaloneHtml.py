#!/usr/bin/env python3
"""
Builds the self-contained AI-art playable HTML preview of BRUTE LEGENDS
by injecting public/assets/ai/standalone_bundle.json (all real AI-generated WebP
sprites, 11 hero poses, 6 rivals/bosses, dummy, weapons, gear, chests & 3 arenas)
into the artifact brute_legends.html.
"""

import json
from pathlib import Path

REPO = Path("/home/antigravity/arthur-bales/bruta")
BUNDLE_PATH = REPO / "public/assets/ai/standalone_bundle.json"
ARTIFACT_PATH = Path("/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/f296d1e6-6b86-4a5a-8cf3-56b519f30510/brute_legends.html")

TEMPLATE = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Brute Legends — Arène Chibi RPG & Clicker (Sprites IA)</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; width: 100%; min-height: 100vh;
    background: linear-gradient(180deg, #f3e8d2 0%, #e6d5b5 100%);
    color: #3c2e28;
    font-family: 'Trebuchet MS', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 14px; line-height: 1.4; overflow-x: hidden; touch-action: manipulation;
  }
  h1, h2, h3, h4, .disp { font-family: 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif; margin: 0; color: #231917; }
  button { cursor: pointer; font-family: inherit; user-select: none; -webkit-tap-highlight-color: transparent; }

  .shell { display: flex; min-height: 100vh; width: 100%; overflow-x: hidden; }
  .sidebar { display: none; }
  @media (min-width: 960px) {
    .sidebar {
      display: flex; flex-direction: column; width: 232px; flex-shrink: 0;
      background: linear-gradient(180deg, #653c26 0%, #452515 100%);
      border-right: 3px solid #231917; padding: 14px 10px; gap: 6px;
      position: sticky; top: 0; height: 100vh; overflow-y: auto; z-index: 20;
    }
  }
  .brand {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    background: linear-gradient(180deg, #ffd459 0%, #f5a623 100%);
    border: 3px solid #231917; border-radius: 14px; box-shadow: 0 3px 0 #231917; margin-bottom: 6px;
  }
  .brand-img { width: 40px; height: 40px; border-radius: 10px; background: #fff3d6; border: 2px solid #231917; object-fit: contain; flex-shrink: 0; }
  .nav-btn {
    display: flex; align-items: center; gap: 9px; width: 100%; min-height: 40px; padding: 7px 10px;
    border: 2px solid transparent; border-radius: 11px; background: rgba(255,248,235,0.08);
    color: #fcefd9; font-weight: 700; font-size: 13.5px; text-align: left; transition: 0.1s;
  }
  .nav-btn:hover { background: rgba(255,248,235,0.18); transform: translateX(2px); }
  .nav-btn.active {
    background: linear-gradient(180deg, #ff7e54 0%, #ef5b36 100%);
    color: #fff; border-color: #231917; box-shadow: 0 3px 0 #231917;
  }
  .nav-badge {
    margin-left: auto; background: #ffd152; color: #231917; border: 2px solid #231917;
    border-radius: 99px; padding: 0 6px; font-size: 11px; font-weight: 900;
  }

  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding-bottom: 78px; }
  @media (min-width: 960px) { .main { padding-bottom: 24px; } }

  .hud {
    position: sticky; top: 0; z-index: 18;
    background: rgba(253,248,236,0.96); backdrop-filter: blur(6px);
    border-bottom: 3px solid #231917; padding: 8px 12px;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .hud-id { display: flex; align-items: center; gap: 8px; min-width: 0; cursor: pointer; }
  .lvl-pill {
    width: 38px; height: 38px; border-radius: 11px;
    background: linear-gradient(180deg, #ffd152 0%, #f5b025 100%);
    border: 2.5px solid #231917; box-shadow: 0 2px 0 #231917;
    display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; flex-shrink: 0;
  }
  .lvl-pill small { font-size: 9px; font-weight: 900; }
  .lvl-pill strong { font-size: 15px; }
  .hud-res { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px;
    border-radius: 99px; border: 2px solid #231917; box-shadow: 0 2px 0 #231917;
    font-weight: 800; font-size: 12.5px; color: #231917; white-space: nowrap;
  }
  .chip-gold { background: #fff7dc; }
  .chip-gem { background: #e6f6ff; }
  .chip-en { background: #ffedd5; }

  .content { width: 100%; max-width: 1120px; margin: 0 auto; padding: 12px; flex: 1; }
  @media (min-width: 768px) { .content { padding: 18px 22px; } }

  .card {
    background: #fffdf7; border: 3px solid #231917; border-radius: 18px;
    box-shadow: 0 4px 0 #231917; padding: 14px;
  }
  .card-warm { background: #fdf8ec; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 40px; padding: 8px 14px; border: 2.5px solid #231917; border-radius: 13px;
    font-weight: 800; font-size: 13.5px; color: #231917; background: #fdf8ec;
    box-shadow: 0 3px 0 #231917; transition: transform 0.07s, box-shadow 0.07s;
  }
  .btn:hover:not(:disabled) { filter: brightness(1.04); transform: translateY(-1px); }
  .btn:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 #231917; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.4); }
  .btn-primary { background: linear-gradient(180deg, #ff784f 0%, #ef5b36 100%); color: #fff; text-shadow: 0 1px 0 rgba(35,25,23,0.5); }
  .btn-gold { background: linear-gradient(180deg, #ffd152 0%, #f5b025 100%); color: #231917; }
  .btn-sky { background: linear-gradient(180deg, #56abff 0%, #2d8cf0 100%); color: #fff; text-shadow: 0 1px 0 rgba(35,25,23,0.45); }
  .btn-jade { background: linear-gradient(180deg, #34c786 0%, #22a06b 100%); color: #fff; text-shadow: 0 1px 0 rgba(35,25,23,0.45); }
  .btn-danger { background: linear-gradient(180deg, #f85353 0%, #dc2626 100%); color: #fff; }
  .btn-sm { min-height: 33px; padding: 5px 10px; font-size: 12px; border-radius: 10px; }
  .btn-lg { min-height: 52px; padding: 12px 20px; font-size: 16px; }

  .meter {
    width: 100%; height: 14px; background: #dfd3ba; border: 2px solid #231917;
    border-radius: 99px; overflow: hidden; position: relative;
  }
  .meter-fill { height: 100%; border-radius: 99px; transition: width 0.2s ease; }
  .fill-hp-l { background: linear-gradient(90deg, #22c55e, #16a34a); }
  .fill-hp-r { background: linear-gradient(90deg, #ef4444, #f97316); }
  .fill-xp { background: linear-gradient(90deg, #3b82f6, #0ea5e9); }
  .fill-rage { background: linear-gradient(90deg, #f59e0b, #ef4444); }
  .fill-fever { background: linear-gradient(90deg, #f59e0b, #ec4899); }

  .stage-wrap {
    width: 100%; border: 3px solid #231917; border-radius: 18px; overflow: hidden;
    box-shadow: 0 4px 0 #231917; background: #2c1e16; position: relative;
  }
  .stage-canvas { display: block; width: 100%; height: 300px; }
  @media (min-width: 768px) { .stage-canvas { height: 370px; } }

  .grid-2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 820px) { .grid-2 { grid-template-columns: 1.2fr 1fr; } }
  .grid-cards { display: grid; grid-template-columns: 1fr; gap: 11px; }
  @media (min-width: 580px) { .grid-cards { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 980px) { .grid-cards { grid-template-columns: repeat(3, 1fr); } }

  .pill {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
    border-radius: 99px; border: 2px solid #231917; font-size: 11.5px; font-weight: 800;
  }
  .tag {
    display: inline-block; font-size: 11.5px; font-weight: 800; padding: 2px 7px;
    border-radius: 7px; background: #f4ead5; border: 1.5px solid rgba(35,25,23,0.25);
  }
  .input {
    width: 100%; min-height: 40px; padding: 8px 12px; border: 2px solid #231917;
    border-radius: 10px; font-size: 14px; font-weight: 700; background: #fff; color: #231917;
  }
  .sprite-icon {
    width: 54px; height: 54px; border-radius: 12px; border: 2.5px solid #231917;
    background: linear-gradient(180deg, #fff8e7 0%, #f1dfb8 100%);
    object-fit: contain; padding: 3px; flex-shrink: 0;
  }
  .sprite-avatar {
    width: 68px; height: 68px; border-radius: 14px; border: 2.5px solid #231917;
    background: linear-gradient(180deg, #dff3ff 0%, #fff4d6 100%);
    object-fit: contain; padding: 2px; flex-shrink: 0;
  }
  .chest-art {
    width: 96px; height: 96px; object-fit: contain; display: block; margin: 0 auto;
    filter: drop-shadow(0 4px 0 rgba(35,25,23,0.25));
  }

  .mobile-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
    background: linear-gradient(180deg, #5e3824 0%, #3d2113 100%);
    border-top: 3px solid #231917; padding: 6px;
  }
  @media (min-width: 960px) { .mobile-bar { display: none; } }
  .m-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    min-height: 50px; border: 2px solid transparent; border-radius: 11px;
    background: transparent; color: #f4dfc3; font-size: 11px; font-weight: 800; position: relative;
  }
  .m-btn.active { background: linear-gradient(180deg, #ff784f 0%, #ef5b36 100%); color: #fff; border-color: #231917; }

  .modal-bg {
    position: fixed; inset: 0; z-index: 60; background: rgba(24,16,12,0.65);
    backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 12px; overflow-y: auto;
  }
  .modal-box {
    width: 100%; max-width: 740px; max-height: 92vh; overflow-y: auto;
    background: #fdf8ec; border: 3px solid #231917; border-radius: 22px;
    box-shadow: 0 8px 0 #231917; padding: 18px;
  }
  .toasts {
    position: fixed; top: 68px; right: 12px; z-index: 80;
    display: flex; flex-direction: column; gap: 6px; max-width: min(320px, calc(100vw - 24px)); pointer-events: none;
  }
  .toast {
    padding: 9px 13px; border: 2.5px solid #231917; border-radius: 13px; box-shadow: 0 3px 0 #231917;
    background: #fffdf5; font-weight: 800; font-size: 12.5px; color: #231917;
  }
  .toast.gold { background: #fff6d6; }
  .toast.ok { background: #e8fbf0; }
  .toast.err { background: #ffe8e8; }

  .battle-log { max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
  .log-line { padding: 6px 9px; border-radius: 9px; background: #fdf8ec; border: 1.5px solid rgba(35,25,23,0.2); font-size: 12.5px; font-weight: 700; }
  .log-line.crit { background: #fff1d6; border-color: #d97706; }
  .log-line.spec { background: #f5e6ff; border-color: #9b30c9; }
  .log-line.win { background: #e2fbe8; border-color: #16a34a; }

  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .between { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .col { display: flex; flex-direction: column; gap: 10px; }
  @media (max-width: 420px) {
    .hud { padding: 6px 8px; }
    .chip { padding: 3px 7px; font-size: 11.5px; }
    .hide-xs { display: none !important; }
  }
</style>
</head>
<body>
<div id="app"></div>
<script>
const AI_ASSETS = __AI_BUNDLE_JSON__;

// Preload all real AI images into HTMLImageElement cache
const IMG = { hero:{}, rivals:{}, weapons:{}, gear:{}, chests:{}, arenas:{}, dummy: null };
function preloadImage(src) {
  const im = new Image();
  im.src = src;
  return im;
}
for (const [k,v] of Object.entries(AI_ASSETS.hero)) IMG.hero[k] = preloadImage(v);
for (const [k,v] of Object.entries(AI_ASSETS.rivals)) IMG.rivals[k] = preloadImage(v);
for (const [k,v] of Object.entries(AI_ASSETS.weapons)) IMG.weapons[k] = preloadImage(v);
for (const [k,v] of Object.entries(AI_ASSETS.gear)) IMG.gear[k] = preloadImage(v);
for (const [k,v] of Object.entries(AI_ASSETS.chests)) IMG.chests[k] = preloadImage(v);
for (const [k,v] of Object.entries(AI_ASSETS.arenas)) IMG.arenas[k] = preloadImage(v);
IMG.dummy = preloadImage(AI_ASSETS.dummy);

const SAVE_KEY = 'brute_legends_ai_v2';

const ANIM_SPECS = {
  idle:         { dur: 900,  loop: true,  label: 'Repos (Idle)' },
  walk:         { dur: 620,  loop: true,  label: 'Marche (Walk)' },
  run:          { dur: 460,  loop: true,  label: 'Course (Run)' },
  attack:       { dur: 480,  loop: false, label: 'Attaque' },
  heavy_attack: { dur: 650,  loop: false, label: 'Attaque Lourde' },
  hit:          { dur: 420,  loop: false, label: 'Coup Reçu' },
  dodge:        { dur: 460,  loop: false, label: 'Esquive' },
  block:        { dur: 460,  loop: false, label: 'Blocage' },
  victory:      { dur: 780,  loop: true,  label: 'Victoire' },
  defeat:       { dur: 700,  loop: false, label: 'Défaite' },
  special:      { dur: 760,  loop: false, label: 'Spécial !' },
};
const ALL_ANIMS = Object.keys(ANIM_SPECS);

const HERO_STYLES = [
  { id:'flame',  label:'Flamme Originale', filter:'none', aura:'#f97316' },
  { id:'azure',  label:'Guerrier Azur',    filter:'hue-rotate(195deg) saturate(1.1)', aura:'#38bdf8' },
  { id:'sakura', label:'Sakura Furie',     filter:'hue-rotate(305deg) saturate(1.15)', aura:'#ec4899' },
  { id:'jade',   label:'Dragon de Jade',   filter:'hue-rotate(110deg) saturate(1.05)', aura:'#22c55e' },
  { id:'gold',   label:'Champion Solaire', filter:'hue-rotate(34deg) saturate(1.25) brightness(1.05)', aura:'#fbbf24' },
  { id:'shadow', label:'Ombre Nocturne',   filter:'hue-rotate(250deg) saturate(0.85) contrast(1.1)', aura:'#a855f7' },
];

const RARITY = {
  common:    { label: 'Commun',     color: '#5a6370', bg: '#f0efe9', weight: 50 },
  rare:      { label: 'Rare',       color: '#1d72c9', bg: '#e5f2ff', weight: 28 },
  epic:      { label: 'Épique',     color: '#9b30c9', bg: '#f7e9ff', weight: 14 },
  legendary: { label: 'Légendaire', color: '#d97706', bg: '#fff3d6', weight: 6.5 },
  mythic:    { label: 'Mythique',   color: '#dc2626', bg: '#ffe4e6', weight: 1.5 },
};
const RARITY_ORDER = ['common','rare','epic','legendary','mythic'];

const SLOTS = {
  weapon:    { label: 'Arme' },
  helmet:    { label: 'Casque' },
  armor:     { label: 'Armure' },
  gloves:    { label: 'Gants' },
  boots:     { label: 'Bottes' },
  accessory: { label: 'Accessoire' },
};

const EQUIPMENT_CATALOG = [
  { tid:'w_club',    name:'Gourdin Noueux',        slot:'weapon',    rarity:'common',    vis:'wooden_club',   icon:'w:wooden_club',   stats:{str:3}, bonusAtk:5, price:60 },
  { tid:'w_pan',     name:'Poêle de Grand-Mère',   slot:'weapon',    rarity:'rare',      vis:'frying_pan',    icon:'w:frying_pan',    stats:{str:5,lck:4}, bonusAtk:11, fx:{type:'crit_surge',val:8,label:'+8% Crit'}, price:190 },
  { tid:'w_sword',   name:'Épée du Colisée',       slot:'weapon',    rarity:'rare',      vis:'broadsword',    icon:'w:broadsword',    stats:{str:6,def:2}, bonusAtk:14, fx:{type:'counter',val:10,label:'10% Contre'}, price:240 },
  { tid:'w_katana',  name:'Katana Sakura',         slot:'weapon',    rarity:'epic',      vis:'katana',        icon:'w:katana',        stats:{str:9,agi:8}, bonusAtk:22, fx:{type:'bleed',val:12,label:'Saignement 12%'}, price:520 },
  { tid:'w_axe',     name:'Hache du Berserker',    slot:'weapon',    rarity:'epic',      vis:'battle_axe',    icon:'w:battle_axe',    stats:{str:13,vit:4}, bonusAtk:28, fx:{type:'vampirism',val:10,label:'Vol de vie 10%'}, price:640 },
  { tid:'w_hammer',  name:'Hache-Marteau Titan',   slot:'weapon',    rarity:'legendary', vis:'battle_axe',    icon:'w:battle_axe',    stats:{str:18,def:6,vit:6}, bonusAtk:40, fx:{type:'crit_surge',val:14,label:'+14% Crit'}, price:1350 },
  { tid:'w_scythe',  name:'Faux Mythique du Néant',slot:'weapon',    rarity:'mythic',    vis:'mythic_scythe', icon:'w:mythic_scythe', stats:{str:26,agi:16,lck:14}, bonusAtk:68, fx:{type:'vampirism',val:18,label:'Vol de vie 18%'}, price:3400 },

  { tid:'h_band',    name:'Bandeau du Dojo',       slot:'helmet',    rarity:'common',    vis:'headband',      icon:'g:headband',      stats:{agi:3,str:2}, bonusHp:15, price:70 },
  { tid:'h_viking',  name:'Casque Viking Cornu',   slot:'helmet',    rarity:'rare',      vis:'viking_helm',   icon:'g:viking_helm',   stats:{str:5,def:5,vit:4}, bonusHp:35, price:220 },
  { tid:'h_kabuto',  name:'Kabuto Écarlate',       slot:'helmet',    rarity:'epic',      vis:'samurai_kabuto',icon:'g:samurai_kabuto',stats:{def:8,agi:6,vit:6}, bonusHp:65, fx:{type:'counter',val:8,label:'8% Contre'}, price:540 },
  { tid:'h_crown',   name:'Kabuto Draconique',     slot:'helmet',    rarity:'legendary', vis:'samurai_kabuto',icon:'g:samurai_kabuto',stats:{str:11,vit:11,lck:10}, bonusHp:115, fx:{type:'gold_boost',val:20,label:'+20% Or'}, price:1300 },

  { tid:'a_tunic',   name:'Tunique de l’Apprenti', slot:'armor',     rarity:'common',    vis:'armor_tunic',   icon:'g:armor_tunic',   stats:{vit:3,def:2}, bonusHp:20, price:65 },
  { tid:'a_gi',      name:'Armure du Dojo',        slot:'armor',     rarity:'rare',      vis:'armor_tunic',   icon:'g:armor_tunic',   stats:{agi:6,str:4,vit:5}, bonusHp:45, fx:{type:'click_boost',val:15,label:'+15% Clic'}, price:230 },
  { tid:'a_dragon',  name:'Écailles de Dragon',    slot:'armor',     rarity:'legendary', vis:'armor_tunic',   icon:'g:armor_tunic',   stats:{def:16,str:10,vit:16}, bonusHp:165, fx:{type:'thorns',val:18,label:'Épines 18%'}, price:1450 },

  { tid:'g_wraps',   name:'Bandages de Frappe',    slot:'gloves',    rarity:'common',    vis:'flame_fists',   icon:'g:flame_fists',   stats:{str:2,agi:2}, bonusAtk:3, price:65 },
  { tid:'g_flame',   name:'Poings Ardents',        slot:'gloves',    rarity:'epic',      vis:'flame_fists',   icon:'g:flame_fists',   stats:{str:11,lck:6}, bonusAtk:18, fx:{type:'crit_surge',val:10,label:'+10% Crit'}, price:560 },
  { tid:'g_titan',   name:'Gantelets du Titan',    slot:'gloves',    rarity:'legendary', vis:'flame_fists',   icon:'g:flame_fists',   stats:{str:16,agi:10,lck:10}, bonusAtk:30, fx:{type:'vampirism',val:12,label:'Vol de vie 12%'}, price:1400 },

  { tid:'b_sandals', name:'Bottes du Dojo',        slot:'boots',     rarity:'common',    vis:'scarf_boots',   icon:'g:scarf_boots',   stats:{agi:3}, bonusHp:10, price:60 },
  { tid:'b_wing',    name:'Bottes Ailées',         slot:'boots',     rarity:'epic',      vis:'scarf_boots',   icon:'g:scarf_boots',   stats:{agi:14,def:5}, bonusHp:55, fx:{type:'counter',val:10,label:'10% Contre'}, price:550 },

  { tid:'x_scarf',   name:'Écharpe du Héros',      slot:'accessory', rarity:'common',    vis:'scarf_boots',   icon:'g:scarf_boots',   stats:{lck:3,agi:2}, bonusHp:12, price:85 },
  { tid:'x_aura',    name:'Écharpe Mythique',      slot:'accessory', rarity:'mythic',    vis:'scarf_boots',   icon:'g:scarf_boots',   stats:{str:18,def:16,agi:18,vit:18,lck:18}, bonusHp:200, fx:{type:'click_boost',val:35,label:'+35% Clic'}, price:3800 },
];

function getItemArt(it) {
  if (!it || !it.icon) return AI_ASSETS.weapons.wooden_club;
  const [kind, key] = it.icon.split(':');
  return kind === 'w' ? (AI_ASSETS.weapons[key] || AI_ASSETS.weapons.broadsword) : (AI_ASSETS.gear[key] || AI_ASSETS.gear.armor_tunic);
}

const SKILLS_CATALOG = [
  { id:'sk_meteor',   name:'Frappe Météore',    cat:'active',  ico:'☄️', maxLvl:5, reqLvl:1, baseCost:90,  rage:65, mult:1.95, hits:1, desc:'Écrase l’ennemi avec une frappe colossale.' },
  { id:'sk_whirl',    name:'Tourbillon Furieux',cat:'active',  ico:'🌪️', maxLvl:5, reqLvl:2, baseCost:140, rage:70, mult:0.78, hits:3, desc:'Enchaîne 3 coups rapides dévastateurs.' },
  { id:'sk_vamp',     name:'Lame Vampirique',   cat:'active',  ico:'🩸', maxLvl:5, reqLvl:3, baseCost:180, rage:60, mult:1.55, healPct:0.20, hits:1, desc:'Frappe et restaure 20% des PV max.' },
  { id:'sk_thunder',  name:'Éclair Foudroyant', cat:'active',  ico:'⚡', maxLvl:5, reqLvl:5, baseCost:260, rage:80, mult:2.35, hits:1, desc:'Décharge foudroyante à dégâts critiques amplifiés.' },
  { id:'sk_iron',     name:'Peau d’Acier',      cat:'passive', ico:'🛡️', maxLvl:5, reqLvl:1, baseCost:80,  passive:{def:4, block:0.03}, desc:'+4 Défense & +3% Blocage par niveau.' },
  { id:'sk_cat',      name:'Instinct Félin',    cat:'passive', ico:'🐾', maxLvl:5, reqLvl:1, baseCost:85,  passive:{agi:4, dodge:0.03}, desc:'+4 Agilité & +3% Esquive par niveau.' },
  { id:'sk_hawk',     name:'Œil de Faucon',     cat:'passive', ico:'🦅', maxLvl:5, reqLvl:2, baseCost:110, passive:{lck:4, crit:0.03},  desc:'+4 Chance & +3% Critique par niveau.' },
  { id:'sk_goldhand', name:'Main d’Or',         cat:'passive', ico:'🪙', maxLvl:5, reqLvl:2, baseCost:120, passive:{goldPct:12, clickPct:12}, desc:'+12% Or & +12% Dégâts Clic par niveau.' },
];

const UPGRADES_CATALOG = [
  { id:'up_fists',   name:'Poings d’Acier',       cat:'click', ico:'👊', baseCost:25,  mult:1.45, maxLvl:25, perLvl:2,  label:'+2 Or/clic', desc:'Augmente directement les pièces gagnées à chaque frappe.' },
  { id:'up_critclk', name:'Frappe Précise',       cat:'click', ico:'💥', baseCost:60,  mult:1.55, maxLvl:15, perLvl:3,  label:'+3% Crit clic', desc:'Booste vos chances de coup critique sur le mannequin.' },
  { id:'up_combo',   name:'Combo Turbo',          cat:'click', ico:'🔥', baseCost:110, mult:1.6,  maxLvl:15, perLvl:5,  label:'+5 Dégâts clic', desc:'Amplifie la puissance de frappe du dojo.' },
  { id:'up_dummy',   name:'Mannequin Automatique',cat:'auto',  ico:'🤖', baseCost:45,  mult:1.5,  maxLvl:25, perLvl:2,  label:'+2 Or/sec', desc:'Génère de l’or automatiquement chaque seconde.' },
  { id:'up_appren',  name:'Apprentis du Dojo',    cat:'auto',  ico:'🥋', baseCost:160, mult:1.55, maxLvl:20, perLvl:6,  label:'+6 Or/sec & +1 XP/s', desc:'Vos disciples s’entraînent même quand vous combattez.' },
  { id:'up_shrine',  name:'Sanctuaire d’Énergie', cat:'auto',  ico:'⛩️', baseCost:420, mult:1.65, maxLvl:15, perLvl:16, label:'+16 Or/sec & +3 XP/s', desc:'Source mystique d’or et d’expérience passifs.' },
  { id:'up_arena',   name:'Trésorerie de l’Arène',cat:'dojo',  ico:'🏆', baseCost:130, mult:1.65, maxLvl:15, perLvl:10, label:'+10% Or total', desc:'Augmente tous les gains d’or (arène et clicker).' },
  { id:'up_mentor',  name:'Entraînement Intensif',cat:'dojo',  ico:'📜', baseCost:150, mult:1.65, maxLvl:15, perLvl:10, label:'+10% XP total', desc:'Accélère la montée de niveau de votre combattant.' },
];

const CHESTS = [
  { id:'c_wood',   art:'chest_wood',   name:'Coffre du Dojo',    minRarity:'common', gold:120, gems:0,  desc:'Garantit un équipement Commun ou mieux.' },
  { id:'c_epic',   art:'chest_epic',   name:'Coffre Épique',     minRarity:'rare',   gold:420, gems:0,  desc:'Garantit au moins un objet Rare (haute chance Épique).' },
  { id:'c_mythic', art:'chest_mythic', name:'Coffre Légendaire', minRarity:'epic',   gold:0,   gems:12, desc:'Épique garanti, fortes chances Légendaire & Mythique !' },
];

const MISSIONS_CATALOG = [
  { id:'m_clk20',  title:'Échauffement Dojo',   type:'mission',     metric:'totalClicks', target:20,   gold:80,  gems:2, xp:50,  ico:'👊' },
  { id:'m_clk100', title:'Poings de Foudre',    type:'mission',     metric:'totalClicks', target:100,  gold:240, gems:4, xp:140, ico:'⚡' },
  { id:'m_bat1',   title:'Premier Combat',      type:'mission',     metric:'arenaBattles',target:1,    gold:100, gems:2, xp:70,  ico:'⚔️' },
  { id:'m_win5',   title:'Gladiateur',          type:'mission',     metric:'arenaWins',   target:5,    gold:300, gems:5, xp:220, ico:'🏆' },
  { id:'m_up3',    title:'Investisseur',        type:'mission',     metric:'upgradesBought',target:3,  gold:150, gems:3, xp:100, ico:'📈' },
  { id:'m_pvp1',   title:'Esprit de Rivalité',  type:'mission',     metric:'pvpWins',     target:1,    gold:220, gems:4, xp:160, ico:'🥊' },
  { id:'a_lvl5',   title:'Niveau 5 atteint',    type:'achievement', metric:'level',       target:5,    gold:400, gems:8, xp:200, ico:'⭐' },
  { id:'a_boss1',  title:'Chasseur de Boss',    type:'achievement', metric:'bossesDefeated',target:1,  gold:500, gems:10,xp:300, ico:'👹' },
  { id:'a_gold2k', title:'Coffre Plein (2000)', type:'achievement', metric:'totalGoldEarned',target:2000,gold:450,gems:8,xp:250, ico:'🪙' },
];

const DAILY_REWARDS = [
  { day:1, title:'Jour 1', gold:120, gems:3,  xp:60,  ico:'🪙' },
  { day:2, title:'Jour 2', gold:180, gems:4,  xp:90,  ico:'💰' },
  { day:3, title:'Jour 3', gold:250, gems:5,  xp:130, ico:'🎁', chest:'rare' },
  { day:4, title:'Jour 4', gold:320, gems:6,  xp:170, ico:'⚡' },
  { day:5, title:'Jour 5', gold:450, gems:8,  xp:220, ico:'💎' },
  { day:6, title:'Jour 6', gold:600, gems:10, xp:300, ico:'🔥' },
  { day:7, title:'Jour 7', gold:1000,gems:20, xp:500, ico:'👑', chest:'legendary' },
];

function mkItem(tid, upg=0) {
  const t = EQUIPMENT_CATALOG.find(e => e.tid === tid) || EQUIPMENT_CATALOG[0];
  return { ...t, uid: tid + '_' + Math.random().toString(36).slice(2,8), upg };
}

const OPPONENTS = [
  { id:'o_caillou', sprite:'caillou',  name:'Petit Caillou',    title:'Recrue du Colisée', lvl:1,  boss:false, arena:'coliseum', stats:{str:5,def:4,agi:5,vit:5,lck:4},    gold:75,  xp:65,  loot:0.55, minR:'common',    eq:{weapon:mkItem('w_club')}, skills:[] },
  { id:'o_kenshi',  sprite:'kenshi',   name:'Kenshi Apprenti',  title:'Samouraï Sakura',   lvl:3,  boss:false, arena:'dojo',     stats:{str:9,def:7,agi:11,vit:9,lck:7},   gold:145, xp:125, loot:0.65, minR:'common',    eq:{weapon:mkItem('w_katana')}, skills:['sk_whirl'] },
  { id:'o_grog',    sprite:'grog',     name:'Grog le Colosse',  title:'BOSS — Viking',     lvl:5,  boss:true,  arena:'coliseum', stats:{str:16,def:14,agi:9,vit:17,lck:8}, gold:310, xp:260, loot:0.9,  minR:'rare',      eq:{weapon:mkItem('w_axe'),helmet:mkItem('h_viking')}, skills:['sk_meteor'] },
  { id:'o_kitsune', sprite:'kitsune',  name:'Kitsune Écarlate', title:'BOSS — Ombre Dojo', lvl:8,  boss:true,  arena:'dojo',     stats:{str:22,def:16,agi:26,vit:20,lck:18},gold:540,xp:430, loot:0.95, minR:'epic',      eq:{weapon:mkItem('w_katana',2),helmet:mkItem('h_kabuto',1)}, skills:['sk_whirl','sk_vamp'] },
  { id:'o_ignis',   sprite:'ignis',    name:'Seigneur Ignis',   title:'BOSS — Volcan',     lvl:12, boss:true,  arena:'volcano',  stats:{str:34,def:28,agi:25,vit:34,lck:20},gold:950,xp:780, loot:1.0,  minR:'legendary', eq:{weapon:mkItem('w_hammer',3),armor:mkItem('a_dragon',2)}, skills:['sk_meteor','sk_thunder'] },
  { id:'o_draco',   sprite:'draconis', name:'Empereur Draconis',title:'BOSS MYTHIQUE',     lvl:18, boss:true,  arena:'volcano',  stats:{str:52,def:44,agi:44,vit:52,lck:36},gold:2100,xp:1600,loot:1.0,  minR:'mythic',    eq:{weapon:mkItem('w_scythe',4),armor:mkItem('a_dragon',3)}, skills:['sk_thunder','sk_vamp','sk_meteor'] },
];

const RIVALS = [
  { id:'r_ryu',  sprite:'kenshi',   name:'Taka le Rapide', title:'Dueliste',   lvl:2,  rating:1020, wins:12, losses:5,  stats:{str:8,def:6,agi:10,vit:8,lck:6},     eq:{weapon:mkItem('w_sword')}, skills:['sk_meteor'] },
  { id:'r_hana', sprite:'kitsune',  name:'Sakura Punch',   title:'Valkyrie',   lvl:4,  rating:1140, wins:24, losses:9,  stats:{str:12,def:10,agi:14,vit:12,lck:10}, eq:{weapon:mkItem('w_katana')}, skills:['sk_whirl'] },
  { id:'r_brut', sprite:'grog',     name:'Brutus Maximus', title:'Gladiateur', lvl:7,  rating:1290, wins:41, losses:14, stats:{str:20,def:18,agi:14,vit:22,lck:12}, eq:{weapon:mkItem('w_axe',1)}, skills:['sk_meteor','sk_vamp'] },
  { id:'r_zen',  sprite:'draconis', name:'Maître Kaito',   title:'Légende',    lvl:11, rating:1480, wins:78, losses:19, stats:{str:30,def:26,agi:30,vit:28,lck:24}, eq:{weapon:mkItem('w_scythe',2)}, skills:['sk_thunder','sk_whirl'] },
];

// ---- Web Audio SFX ----
const SFX = (() => {
  let ctx = null;
  function tone(f1, f2, dur, type='triangle', g=0.6, delay=0) {
    if (!G || !G.settings.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator(), gain = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
      const peak = Math.max(0.001, (G.settings.vol || 0.45) * 0.28 * g);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gain); gain.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  }
  return {
    play(k) {
      if (k==='click') tone(520,740,0.05,'triangle',0.5);
      else if (k==='hit') tone(220,70,0.1,'sawtooth',0.7);
      else if (k==='heavy') tone(170,40,0.2,'sawtooth',0.9);
      else if (k==='crit') { tone(440,920,0.1,'square',0.65); tone(660,1280,0.15,'triangle',0.8,0.04); }
      else if (k==='dodge') tone(420,900,0.12,'sine',0.6);
      else if (k==='block') tone(620,300,0.11,'square',0.65);
      else if (k==='special') { tone(260,640,0.16,'sawtooth',0.7); tone(520,1180,0.22,'triangle',0.85,0.08); }
      else if (k==='coin') { tone(987,1318,0.08,'sine',0.55); tone(1318,1567,0.1,'triangle',0.5,0.05); }
      else if (k==='win') [523,659,784,1046].forEach((f,i)=>tone(f,f*1.02,0.18,'triangle',0.75,i*0.08));
      else if (k==='lose') [392,349,311,261].forEach((f,i)=>tone(f,f*0.95,0.2,'sawtooth',0.5,i*0.1));
    }
  };
})();

function xpFor(lvl) { return Math.floor(100 * Math.pow(lvl, 1.45) + 35 * (lvl - 1)); }

function createFreshFighter() {
  return {
    name: 'Kuro',
    title: 'Champion du Dojo',
    styleId: 'flame',
    level: 1, xp: 0, xpToNext: xpFor(1),
    gold: 180, gems: 15, energy: 20, maxEnergy: 20,
    rating: 1000, statPoints: 4,
    baseStats: { str: 6, def: 5, agi: 6, vit: 6, lck: 5 },
    eq: { weapon: mkItem('w_club'), helmet: null, armor: mkItem('a_tunic'), gloves: null, boots: null, accessory: null },
    inv: [mkItem('w_sword'), mkItem('h_band'), mkItem('x_scarf')],
    skills: {}, eqSkills: [], upgrades: {},
    claimedMissions: [], dailyStreak: 0, lastDailyDate: null,
    progress: { totalClicks:0, arenaBattles:0, arenaWins:0, arenaLosses:0, pvpWins:0, bossesDefeated:0, totalGoldEarned:180, upgradesBought:0 },
    settings: { sound: true, vol: 0.45, speed: 1 },
    homeArena: 'dojo',
    isCustomized: false,
    shopSeed: 1, shopSold: [],
  };
}

let G = (() => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...createFreshFighter(), ...JSON.parse(raw) };
  } catch {}
  return createFreshFighter();
})();

function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch {} }
function getHeroStyle() { return HERO_STYLES.find(s => s.id === G.styleId) || HERO_STYLES[0]; }
function itemForgeMult(it) { return 1 + (it.upg || 0) * 0.14; }
function itemSellPrice(it) { return Math.max(15, Math.round(it.price * 0.42 * itemForgeMult(it))); }
function itemForgeCost(it) { return Math.round(Math.max(40, it.price * 0.45) * Math.pow(1.48, it.upg || 0)); }

function computeDerived(baseStats, level, eq, skills) {
  const s = { ...baseStats };
  let bonusHp = 0, bonusAtk = 0, crit = 0.08, dodge = 0.05, block = 0.06, vamp = 0, counter = 0.04, thorns = 0;
  for (const slot of Object.keys(SLOTS)) {
    const it = eq && eq[slot];
    if (!it) continue;
    const m = itemForgeMult(it);
    for (const k of ['str','def','agi','vit','lck']) if (it.stats && it.stats[k]) s[k] += Math.round(it.stats[k] * m);
    if (it.bonusHp) bonusHp += Math.round(it.bonusHp * m);
    if (it.bonusAtk) bonusAtk += Math.round(it.bonusAtk * m);
    if (it.fx) {
      if (it.fx.type==='crit_surge') crit += it.fx.val / 100;
      if (it.fx.type==='vampirism') vamp += it.fx.val / 100;
      if (it.fx.type==='counter') counter += it.fx.val / 100;
      if (it.fx.type==='thorns') thorns += it.fx.val / 100;
    }
  }
  for (const sk of SKILLS_CATALOG) {
    const lv = (skills && skills[sk.id]) || 0;
    if (!lv || !sk.passive) continue;
    if (sk.passive.def) s.def += sk.passive.def * lv;
    if (sk.passive.agi) s.agi += sk.passive.agi * lv;
    if (sk.passive.lck) s.lck += sk.passive.lck * lv;
    if (sk.passive.block) block += sk.passive.block * lv;
    if (sk.passive.dodge) dodge += sk.passive.dodge * lv;
    if (sk.passive.crit) crit += sk.passive.crit * lv;
  }
  const maxHp = Math.round(105 + level * 14 + s.vit * 9 + bonusHp);
  const baseDmg = 8 + level * 1.6 + s.str * 1.7 + bonusAtk;
  const minDmg = Math.max(4, Math.round(baseDmg * 0.86));
  const maxDmg = Math.max(minDmg + 2, Math.round(baseDmg * 1.16));
  const defense = Math.round(s.def * 1.35 + level * 0.8);
  const speed = Math.round(10 + s.agi * 1.5);
  crit = Math.min(0.75, crit + s.lck * 0.0055);
  dodge = Math.min(0.50, dodge + s.agi * 0.0045);
  block = Math.min(0.50, block + s.def * 0.004);
  const power = Math.round(maxHp * 0.35 + ((minDmg+maxDmg)/2) * 5.5 + defense * 3 + speed * 2 + (crit+dodge+block)*180);
  return { maxHp, minDmg, maxDmg, defense, speed, crit, dodge, block, vamp, counter, thorns, power, totalStats: s };
}

function clickMetrics() {
  const d = computeDerived(G.baseStats, G.level, G.eq, G.skills);
  const uFists = G.upgrades.up_fists || 0, uCrit = G.upgrades.up_critclk || 0, uCombo = G.upgrades.up_combo || 0;
  const uDummy = G.upgrades.up_dummy || 0, uApp = G.upgrades.up_appren || 0, uShr = G.upgrades.up_shrine || 0;
  const uGold = G.upgrades.up_arena || 0, uXp = G.upgrades.up_mentor || 0, skGold = G.skills.sk_goldhand || 0;
  let gearGoldPct = 0, gearClickPct = 0;
  for (const sl of Object.keys(SLOTS)) {
    const it = G.eq[sl];
    if (it && it.fx && it.fx.type==='gold_boost') gearGoldPct += it.fx.val;
    if (it && it.fx && it.fx.type==='click_boost') gearClickPct += it.fx.val;
  }
  const goldMult = 1 + (uGold * 10 + skGold * 12 + gearGoldPct) / 100;
  const xpMult = 1 + (uXp * 10) / 100;
  const clickMult = 1 + (skGold * 12 + gearClickPct) / 100;
  return {
    goldPerClick: Math.max(2, Math.round((3 + uFists * 2 + Math.floor(G.level * 0.7)) * goldMult)),
    xpPerClick: Math.max(1, Math.round((2 + Math.floor(uFists * 0.5)) * xpMult)),
    clickDmg: Math.round((d.minDmg + uCombo * 5) * clickMult),
    clickCrit: Math.min(0.75, 0.10 + uCrit * 0.03 + d.crit * 0.35),
    autoGold: Math.round((uDummy * 2 + uApp * 6 + uShr * 16) * goldMult),
    autoXp: Math.round((uApp * 1 + uShr * 3) * xpMult),
    goldMult, xpMult,
  };
}

function gainXp(amount) {
  G.xp += Math.round(amount);
  let leveled = false;
  while (G.xp >= G.xpToNext) {
    G.xp -= G.xpToNext; G.level += 1; G.xpToNext = xpFor(G.level);
    G.statPoints += 4; G.energy = G.maxEnergy; leveled = true;
  }
  if (leveled) { SFX.play('win'); toast(`🎉 NIVEAU ${G.level} ! +4 points de stats & Énergie restaurée !`, 'gold'); }
  return leveled;
}

function rollLoot(minRarity='common') {
  const pool = RARITY_ORDER.slice(RARITY_ORDER.indexOf(minRarity));
  const totalW = pool.reduce((a,r)=>a+RARITY[r].weight, 0);
  let roll = Math.random() * totalW, chosen = pool[0];
  for (const r of pool) { roll -= RARITY[r].weight; if (roll <= 0) { chosen = r; break; } }
  const items = EQUIPMENT_CATALOG.filter(e => e.rarity === chosen);
  const pick = items[Math.floor(Math.random() * items.length)] || EQUIPMENT_CATALOG[0];
  return mkItem(pick.tid, 0);
}

// ---- Combat Engine ----
function simulateBattle(opp, isPvp=false) {
  const L = { name:G.name, level:G.level, eq:G.eq, d:computeDerived(G.baseStats, G.level, G.eq, G.skills), skills:G.eqSkills.filter(id=>(G.skills[id]||0)>0) };
  const R = { name:opp.name, level:opp.lvl, sprite:opp.sprite, eq:opp.eq||{}, d:computeDerived(opp.stats, opp.lvl, opp.eq||{}, {}), skills:opp.skills||[] };
  let lHp = L.d.maxHp, rHp = R.d.maxHp, lRage = 15, rRage = 15;
  const events = []; let seq = 0;
  const push = (ev) => events.push({ seq: seq++, leftHp:lHp, leftMaxHp:L.d.maxHp, leftRage:lRage, rightHp:rHp, rightMaxHp:R.d.maxHp, rightRage:rRage, ...ev });

  push({ type:'battle_start', actor:'left', target:'right', aAnim:'idle', tAnim:'idle', dmg:0, heal:0, log:`⚔️ ${L.name} (Niv.${L.level}) affronte ${R.name} (Niv.${R.level}) !` });
  push({ type:'move_in', actor:'left', target:'right', aAnim:'run', tAnim:'run', dmg:0, heal:0, log:`💨 Les deux combattants chargent dans l’arène !` });

  let lGauge = 0, rGauge = 0;
  for (let turn = 1; turn <= 36 && lHp > 0 && rHp > 0; turn++) {
    lGauge += L.d.speed + Math.random()*8; rGauge += R.d.speed + Math.random()*8;
    const side = lGauge >= rGauge ? 'left' : 'right';
    if (side==='left') lGauge -= 18; else rGauge -= 18;
    const A = side==='left'?L:R, T = side==='left'?R:L, tgtSide = side==='left'?'right':'left';
    let aRage = side==='left'?lRage:rRage, usedSkill = null;
    for (const skId of A.skills) { const def = SKILLS_CATALOG.find(x=>x.id===skId); if (def && aRage>=def.rage){ usedSkill=def; break; } }
    const isHeavy = !usedSkill && Math.random() < 0.24;
    const hits = usedSkill ? (usedSkill.hits||1) : 1;
    const mult = usedSkill ? usedSkill.mult : (isHeavy ? 1.38 : 1.0);
    if (usedSkill) { if (side==='left') lRage=Math.max(0,lRage-usedSkill.rage); else rRage=Math.max(0,rRage-usedSkill.rage); }

    let totalDmg = 0, dodged = false, blocked = false, isCrit = false;
    if (!usedSkill && Math.random() < T.d.dodge) dodged = true;
    else {
      for (let h=0; h<hits; h++) {
        let raw = (A.d.minDmg + Math.random()*(A.d.maxDmg-A.d.minDmg)) * mult;
        let dmg = Math.max(2, raw - T.d.defense*0.42);
        if (Math.random() < A.d.crit) { isCrit=true; dmg *= 1.75; }
        if (!usedSkill && Math.random() < T.d.block) { blocked=true; dmg *= 0.48; }
        totalDmg += Math.max(1, Math.round(dmg));
      }
    }
    let heal = 0;
    if (!dodged) {
      if (tgtSide==='right') rHp = Math.max(0, rHp - totalDmg); else lHp = Math.max(0, lHp - totalDmg);
      if (A.d.vamp > 0) heal += Math.round(totalDmg * A.d.vamp);
      if (usedSkill && usedSkill.healPct) heal += Math.round(A.d.maxHp * usedSkill.healPct);
      if (heal > 0) { if (side==='left') lHp = Math.min(L.d.maxHp, lHp+heal); else rHp = Math.min(R.d.maxHp, rHp+heal); }
    }
    if (side==='left') { lRage=Math.min(100,lRage+(usedSkill?0:18)); rRage=Math.min(100,rRage+15); }
    else { rRage=Math.min(100,rRage+(usedSkill?0:18)); lRage=Math.min(100,lRage+15); }

    const aAnim = usedSkill?'special':(isHeavy?'heavy_attack':'attack');
    const tAnim = dodged?'dodge':(blocked?'block':'hit');
    const log = dodged ? `💨 ${T.name} esquive l’attaque de ${A.name} !`
      : usedSkill ? `✨ ${A.name} lance ${usedSkill.name} : -${totalDmg} PV${isCrit?' (CRIT !)':''}${heal?` (+${heal} PV)`:''} !`
      : blocked ? `🛡️ ${T.name} bloque la frappe de ${A.name} (-${totalDmg} PV) !`
      : `${isHeavy?'💥':'⚔️'} ${A.name} inflige ${totalDmg} dégâts${isCrit?' CRITIQUES !':''}${heal?` (+${heal} PV)`:''}`;

    push({ type:usedSkill?'special':(dodged?'dodge':blocked?'block':isHeavy?'heavy_attack':'attack'), actor:side, target:tgtSide, aAnim, tAnim, dmg:totalDmg, heal, isCrit, dodged, blocked, log });
    if ((blocked||dodged) && lHp>0 && rHp>0 && Math.random()<T.d.counter) {
      const cDmg = Math.max(2, Math.round(T.d.minDmg*0.72 - A.d.defense*0.3));
      if (side==='left') lHp=Math.max(0,lHp-cDmg); else rHp=Math.max(0,rHp-cDmg);
      push({ type:'counter', actor:tgtSide, target:side, aAnim:'attack', tAnim:'hit', dmg:cDmg, heal:0, isCrit:false, log:`↩️ Contre-attaque éclair de ${T.name} : -${cDmg} PV !` });
    }
  }
  const winner = lHp >= rHp ? 'left' : 'right';
  push({ type:'victory', actor:winner, target:winner==='left'?'right':'left', aAnim:'victory', tAnim:'defeat', dmg:0, heal:0, log: winner==='left'?`🏆 VICTOIRE ÉCLATANTE de ${L.name} !`:`💀 ${R.name} remporte ce duel !` });

  const cm = clickMetrics();
  let gold=0, xp=0, gems=0, ratingDelta=0, lootItem=null;
  G.progress.arenaBattles += 1;
  if (winner==='left') {
    gold = Math.round((opp.gold||120)*cm.goldMult); xp = Math.round((opp.xp||100)*cm.xpMult);
    gems = opp.boss ? 3 : 1; ratingDelta = isPvp ? 22 : (opp.boss ? 24 : 15);
    G.progress.arenaWins += 1; if (isPvp) G.progress.pvpWins += 1; if (opp.boss) G.progress.bossesDefeated += 1;
    if (Math.random() < (opp.loot||0.5)) { lootItem = rollLoot(opp.minR||'common'); G.inv.unshift(lootItem); }
  } else {
    gold = Math.round((opp.gold||100)*0.25); xp = Math.round((opp.xp||80)*0.30); ratingDelta = isPvp ? -10 : -5;
    G.progress.arenaLosses += 1;
  }
  G.gold += gold; G.gems += gems; G.progress.totalGoldEarned += gold;
  G.rating = Math.max(800, G.rating + ratingDelta);
  const leveledUp = gainXp(xp); saveGame();
  return { arena:opp.arena||'coliseum', winner, left:L, right:R, events, rewards:{gold,xp,gems,ratingDelta,lootItem,leveledUp} };
}

// ============================================================================
// REAL AI SPRITE & ARENA 60FPS CANVAS RENDERER
// ============================================================================
function drawCoverImage(ctx, img, w, h) {
  if (!img || !img.complete || !img.naturalWidth) {
    ctx.fillStyle = '#3c2e28'; ctx.fillRect(0,0,w,h); return;
  }
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
}

function drawHeroAI(ctx, x, y, size, facing, anim, t0, now, weaponVis, style, flash=false) {
  const spec = ANIM_SPECS[anim] || ANIM_SPECS.idle;
  const rawP = (now - t0) / spec.dur;
  const p = spec.loop ? (rawP % 1) : Math.min(1, Math.max(0, rawP));

  // Select authentic AI keyframe image for each phase of the animation
  let poseKey = anim;
  if (anim === 'idle') poseKey = p < 0.5 ? 'idle' : 'idle_alt';
  else if (anim === 'walk') poseKey = p < 0.5 ? 'walk' : 'idle_alt';
  else if (anim === 'attack') poseKey = p < 0.34 ? 'attack_windup' : 'attack';
  else if (anim === 'heavy_attack') poseKey = p < 0.25 ? 'attack_windup' : (p < 0.72 ? 'heavy_attack' : 'attack');
  else if (anim === 'defeat') poseKey = p < 0.22 ? 'hit' : 'defeat';
  else if (anim === 'special') poseKey = p < 0.2 ? 'attack_windup' : 'special';

  const img = IMG.hero[poseKey] || IMG.hero.idle;
  if (!img || !img.complete) return;

  // Dynamic squash/stretch & kinetic offsets synced with the AI keyframe
  let sx = 1, sy = 1, ox = 0, oy = 0, rot = 0, wRot = -0.35, smear = false;
  if (anim === 'idle') { sy = 1 + Math.sin(p*Math.PI*2)*0.025; sx = 1 - Math.sin(p*Math.PI*2)*0.02; }
  else if (anim === 'walk') { oy = -Math.abs(Math.sin(p*Math.PI*2))*8; rot = Math.sin(p*Math.PI*2)*0.05; }
  else if (anim === 'run') { oy = -Math.abs(Math.sin(p*Math.PI*2))*12; rot = 0.08; sx = 1.04; sy = 0.97; }
  else if (anim === 'attack') {
    if (p < 0.34) { ox = -10; rot = -0.06; wRot = -1.2; }
    else if (p < 0.75) { ox = 22; sx = 1.08; sy = 0.94; wRot = 1.1; smear = true; }
    else { ox = 6; wRot = 0.2; }
  } else if (anim === 'heavy_attack') {
    if (p < 0.25) { oy = 6; sy = 0.92; wRot = -1.6; }
    else if (p < 0.65) { oy = -26*Math.sin((p-0.25)*Math.PI*2.2); ox = 16; wRot = -2.0 + (p-0.25)*6; smear = true; }
    else { ox = 22; oy = 5; sx = 1.14; sy = 0.87; wRot = 1.3; smear = true; }
  } else if (anim === 'hit') { ox = -14*(1-p); rot = -0.14*(1-p); sx = 0.92; sy = 1.08; }
  else if (anim === 'dodge') { ox = -24*Math.sin(p*Math.PI); oy = -20*Math.sin(p*Math.PI); }
  else if (anim === 'block') { ox = -6*Math.sin(p*Math.PI); sx = 1.06; sy = 0.94; wRot = 0.65; }
  else if (anim === 'victory') { oy = -Math.abs(Math.sin(p*Math.PI*2))*18; wRot = -1.1; }
  else if (anim === 'special') { sx = 1 + Math.sin(p*Math.PI*4)*0.05; sy = 1 - Math.sin(p*Math.PI*4)*0.04; oy = -8*Math.sin(p*Math.PI); wRot = 1.25; smear = p > 0.35; }

  ctx.save();
  ctx.translate(x, y);
  // Contact shadow
  ctx.fillStyle = 'rgba(20,12,8,0.34)';
  ctx.beginPath(); ctx.ellipse(0, 4, size*0.28, size*0.07, 0, 0, Math.PI*2); ctx.fill();

  // Optional aura glow for special
  if (anim === 'special') {
    const gr = ctx.createRadialGradient(0, -size*0.45, 10, 0, -size*0.45, size*0.6);
    gr.addColorStop(0, 'rgba(253,224,71,0.55)'); gr.addColorStop(0.6, 'rgba(249,115,22,0.28)'); gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -size*0.45, size*0.6, 0, Math.PI*2); ctx.fill();
  }

  ctx.scale(facing * sx, sy);
  ctx.translate(ox, oy);
  ctx.rotate(rot);

  // Apply chosen Hero color style tint filter
  if (style && style.filter && style.filter !== 'none') ctx.filter = style.filter;
  ctx.drawImage(img, -size*0.5, -size*0.92, size, size);
  ctx.filter = 'none';

  // Overlay REAL AI equipped weapon in hero's hand!
  const wImg = weaponVis && IMG.weapons[weaponVis];
  if (wImg && wImg.complete && anim !== 'defeat' && anim !== 'hit') {
    ctx.save();
    const hx = anim === 'attack' && p >= 0.34 ? size*0.30 : (anim === 'block' ? size*0.18 : size*0.20);
    const hy = anim === 'heavy_attack' && p < 0.7 ? -size*0.68 : -size*0.40;
    ctx.translate(hx, hy);
    ctx.rotate(wRot);
    if (smear) {
      ctx.save();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, size*0.32, -1.6, 0.25); ctx.stroke();
      ctx.restore();
    }
    const ws = size * 0.44;
    ctx.drawImage(wImg, -ws*0.32, -ws*0.82, ws, ws);
    ctx.restore();
  }

  if (flash) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -size*0.45, size*0.35, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawRivalAI(ctx, x, y, size, facing, spriteKey, anim, t0, now, flash=false) {
  const img = IMG.rivals[spriteKey] || IMG.rivals.caillou;
  if (!img || !img.complete) return;
  const spec = ANIM_SPECS[anim] || ANIM_SPECS.idle;
  const rawP = (now - t0) / spec.dur;
  const p = spec.loop ? (rawP % 1) : Math.min(1, Math.max(0, rawP));
  let sx = 1, sy = 1, ox = 0, oy = 0, rot = 0;
  if (anim==='idle') { sy = 1 + Math.sin(p*Math.PI*2)*0.03; sx = 1 - Math.sin(p*Math.PI*2)*0.02; }
  else if (anim==='run') { oy = -Math.abs(Math.sin(p*Math.PI*2))*10; rot = 0.1; }
  else if (anim==='attack' || anim==='heavy_attack') { ox = 22*Math.sin(p*Math.PI); oy = anim==='heavy_attack'?-18*Math.sin(p*Math.PI):0; rot = 0.16*Math.sin(p*Math.PI); sx = 1.07; sy = 0.94; }
  else if (anim==='special') { ox = 16*Math.sin(p*Math.PI); oy = -14*Math.sin(p*Math.PI); sx = 1.1; sy = 1.05; }
  else if (anim==='hit') { ox = -14*(1-p); rot = -0.18*(1-p); }
  else if (anim==='dodge') { ox = -22*Math.sin(p*Math.PI); oy = -18*Math.sin(p*Math.PI); }
  else if (anim==='block') { sx = 1.07; sy = 0.93; ox = -6; }
  else if (anim==='victory') { oy = -Math.abs(Math.sin(p*Math.PI*2))*18; }
  else if (anim==='defeat') { oy = 18*Math.min(1,p*1.4); rot = -1.25*Math.min(1,p*1.4); }

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,12,8,0.34)';
  ctx.beginPath(); ctx.ellipse(0, 4, size*0.30, size*0.075, 0, 0, Math.PI*2); ctx.fill();
  if (anim === 'special') {
    const gr = ctx.createRadialGradient(0, -size*0.45, 8, 0, -size*0.45, size*0.58);
    gr.addColorStop(0, 'rgba(244,63,94,0.55)'); gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -size*0.45, size*0.58, 0, Math.PI*2); ctx.fill();
  }
  ctx.scale(facing * sx, sy);
  ctx.translate(ox, oy);
  ctx.rotate(rot);
  ctx.drawImage(img, -size*0.5, -size*0.92, size, size);
  if (flash) {
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -size*0.45, size*0.35, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawDummyAI(ctx, x, y, size, wobble, fever) {
  const img = IMG.dummy;
  if (!img || !img.complete) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,12,8,0.32)';
  ctx.beginPath(); ctx.ellipse(0, 4, size*0.26, size*0.07, 0, 0, Math.PI*2); ctx.fill();
  if (fever) {
    const gr = ctx.createRadialGradient(0,-size*0.48,12,0,-size*0.48,size*0.62);
    gr.addColorStop(0,'rgba(253,224,71,0.55)'); gr.addColorStop(0.6,'rgba(239,68,68,0.35)'); gr.addColorStop(1,'transparent');
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(0,-size*0.48,size*0.62,0,Math.PI*2); ctx.fill();
  }
  const ang = wobble > 0 ? Math.sin(wobble * Math.PI * 3.5) * 0.24 * (1 - wobble) : 0;
  const scX = wobble > 0 && wobble < 0.25 ? 1.12 : 1;
  const scY = wobble > 0 && wobble < 0.25 ? 0.90 : 1;
  ctx.scale(scX, scY);
  ctx.rotate(ang);
  ctx.drawImage(img, -size*0.5, -size*0.93, size, size);
  ctx.restore();
}

// ============================================================================
// UI ROUTER, CANVAS LOOP & ALL 11 VIEWS
// ============================================================================
const UI = {
  view: 'home', drawer: false, showCreator: !G.isCustomized,
  previewAnim: 'idle', previewT0: performance.now(),
  invFilter: 'all', upFilter: 'all', missionTab: 'daily', chestReveal: null,
  battle: null, battleIdx: 0, battleDone: false, battleLog: [], battleHud: null, battleTimer: null,
  leftAnim: 'idle', leftT0: 0, rightAnim: 'idle', rightT0: 0, leftOffX: 0, rightOffX: 0, leftFlash: 0, rightFlash: 0,
  shake: 0, floats: [], particles: [],
  combo: 0, fever: 0, isFever: false, feverEnd: 0, dummyWobble: 0, clkAnim: 'idle', clkT0: 0, clkEnd: 0, clkOffX: 0, lastClk: 0, hitCount: 0,
};

let toasts = [];
function toast(msg, kind='') {
  const id = Date.now() + Math.random();
  toasts.push({ id, msg, kind }); renderToasts();
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id); renderToasts(); }, 3200);
}
function renderToasts() {
  const el = document.getElementById('toast-box');
  if (el) el.innerHTML = toasts.map(t => `<div class="toast ${t.kind}">${t.msg}</div>`).join('');
}

function getMissionVal(m) { return m.metric==='level' ? G.level : (G.progress[m.metric]||0); }
function todayIso() { return new Date().toISOString().slice(0,10); }
function canClaimDaily() { return G.lastDailyDate !== todayIso(); }
function claimableCount() {
  return MISSIONS_CATALOG.filter(x => !G.claimedMissions.includes(x.id) && getMissionVal(x) >= x.target).length + (canClaimDaily()?1:0);
}

setInterval(() => {
  const cm = clickMetrics();
  if (cm.autoGold > 0) {
    G.gold += cm.autoGold; G.progress.totalGoldEarned += cm.autoGold;
    if (cm.autoXp > 0) gainXp(cm.autoXp);
    saveGame(); updateHudNumbers();
  }
}, 1000);

function updateHudNumbers() {
  const gEl = document.getElementById('hud-gold'); if (gEl) gEl.textContent = G.gold.toLocaleString('fr-FR');
  const xpEl = document.getElementById('hud-xp-fill'); if (xpEl) xpEl.style.width = Math.min(100, Math.round((G.xp/Math.max(1,G.xpToNext))*100))+'%';
  const lvEl = document.getElementById('hud-lvl'); if (lvEl) lvEl.textContent = G.level;
}

function spawnBurst(rx, ry, count, color='#fde047') {
  const now = performance.now();
  for (let i=0; i<count; i++) {
    const a = Math.random()*Math.PI*2, spd = 50 + Math.random()*130;
    UI.particles.push({ x:rx, y:ry, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd - 70, color, sz:4+Math.random()*5, t0:now });
  }
}

let rafId = null;
function startCanvasLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  const loop = (now) => {
    const cv = document.getElementById('game-canvas');
    if (cv) {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(280, Math.floor(rect.width)), h = Math.max(220, Math.floor(rect.height));
      if (cv.width !== w*dpr || cv.height !== h*dpr) { cv.width = w*dpr; cv.height = h*dpr; }
      const ctx = cv.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      if (UI.shake > 0) { ctx.translate((Math.random()-0.5)*UI.shake, (Math.random()-0.5)*UI.shake); UI.shake = Math.max(0, UI.shake - 0.8); }

      const mode = cv.dataset.mode;
      const charSize = Math.min(235, Math.max(145, h * 0.62));
      const floorY = h * 0.89;
      const wVis = G.eq.weapon ? G.eq.weapon.vis : null;
      const style = getHeroStyle();

      if (mode === 'showcase') {
        drawCoverImage(ctx, IMG.arenas[G.homeArena || 'dojo'], w, h);
        const spec = ANIM_SPECS[UI.previewAnim] || ANIM_SPECS.idle;
        if (!spec.loop && UI.previewAnim !== 'defeat' && now - UI.previewT0 > spec.dur + 180) {
          UI.previewAnim = 'idle'; UI.previewT0 = now;
        }
        drawHeroAI(ctx, w*0.5, floorY, charSize*1.12, 1, UI.previewAnim, UI.previewT0, now, wVis, style, false);
      } else if (mode === 'clicker') {
        drawCoverImage(ctx, IMG.arenas.dojo, w, h);
        if (UI.isFever && now > UI.feverEnd) { UI.isFever = false; UI.fever = 0; updateClickerDom(); }
        if (UI.combo > 0 && now - UI.lastClk > 2400) { UI.combo = 0; updateClickerDom(); }
        if (UI.dummyWobble > 0) UI.dummyWobble = Math.min(1, UI.dummyWobble + 0.045);
        if (UI.dummyWobble >= 1) UI.dummyWobble = 0;
        if (UI.clkOffX > 0) UI.clkOffX = Math.max(0, UI.clkOffX - 4.5);
        const aName = now < UI.clkEnd ? UI.clkAnim : 'idle';
        drawHeroAI(ctx, w*0.30 + UI.clkOffX, floorY, charSize, 1, aName, UI.clkT0, now, wVis, style, false);
        drawDummyAI(ctx, w*0.70, floorY, charSize*0.95, UI.dummyWobble, UI.isFever);
      } else if (mode === 'arena' && UI.battle) {
        drawCoverImage(ctx, IMG.arenas[UI.battle.arena || 'coliseum'], w, h);
        UI.leftOffX *= 0.86; UI.rightOffX *= 0.86;
        if (UI.leftFlash > 0) UI.leftFlash--;
        if (UI.rightFlash > 0) UI.rightFlash--;
        drawHeroAI(ctx, w*0.28 + UI.leftOffX, floorY, charSize, 1, UI.leftAnim, UI.leftT0, now, wVis, style, UI.leftFlash>0);
        drawRivalAI(ctx, w*0.72 + UI.rightOffX, floorY, charSize*1.04, -1, UI.battle.right.sprite, UI.rightAnim, UI.rightT0, now, UI.rightFlash>0);
      }

      // Impact particles & coins
      UI.particles = UI.particles.filter(pt => now - pt.t0 < 520);
      for (const pt of UI.particles) {
        const dt = (now - pt.t0) / 1000;
        const px = pt.x * w + pt.vx * dt;
        const py = pt.y * h + pt.vy * dt + 220 * dt * dt;
        ctx.save(); ctx.globalAlpha = 1 - (now - pt.t0)/520;
        ctx.fillStyle = pt.color; ctx.strokeStyle = '#231917'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, pt.sz, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // Floating comic popups
      UI.floats = UI.floats.filter(f => now - f.t0 < 850);
      for (const f of UI.floats) {
        const prog = (now - f.t0) / 850;
        ctx.save(); ctx.globalAlpha = 1 - prog;
        ctx.font = `900 ${f.sz}px "Arial Rounded MT Bold", sans-serif`;
        ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#231917';
        ctx.strokeText(f.text, f.x * w, f.y * h - prog * 52);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x * w, f.y * h - prog * 52);
        ctx.restore();
      }
      ctx.restore();
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function addFloat(rx, ry, text, color='#fff', sz=22) {
  UI.floats.push({ x:rx, y:ry, text, color, sz, t0: performance.now() });
}

function doClickerStrike() {
  const now = performance.now();
  const cm = clickMetrics();
  UI.combo += 1; UI.hitCount += 1; UI.lastClk = now;
  const isCrit = Math.random() < cm.clickCrit;
  if (!UI.isFever) {
    UI.fever = Math.min(100, UI.fever + (isCrit ? 10 : 6));
    if (UI.fever >= 100) { UI.isFever = true; UI.feverEnd = now + 6500; SFX.play('special'); toast('🔥 MODE FIÈVRE x2 ACTIVÉ !', 'gold'); }
  }
  const fMult = UI.isFever ? 2 : 1, cMult = isCrit ? 1.5 : 1;
  const gGain = Math.max(1, Math.round(cm.goldPerClick * fMult * cMult));
  const xGain = Math.max(1, Math.round(cm.xpPerClick * fMult));
  G.gold += gGain; G.progress.totalGoldEarned += gGain; G.progress.totalClicks += 1;
  gainXp(xGain); saveGame();

  UI.clkAnim = UI.isFever || UI.hitCount % 10 === 0 ? 'special' : (UI.hitCount % 5 === 0 ? 'heavy_attack' : 'attack');
  UI.clkT0 = now; UI.clkEnd = now + 440; UI.clkOffX = 48;
  UI.dummyWobble = 0.05; UI.shake = isCrit || UI.isFever ? 9 : 4;
  SFX.play(UI.clkAnim==='special'?'special':isCrit?'crit':'hit');
  spawnBurst(0.68, 0.56, isCrit||UI.isFever ? 10 : 5, isCrit ? '#fb923c' : '#fde047');
  addFloat(0.68 + (Math.random()-0.5)*0.08, 0.40, isCrit?`CRIT -${cm.clickDmg*2}!`:`-${cm.clickDmg}`, isCrit?'#fde047':'#fff', isCrit?28:22);
  addFloat(0.75, 0.54, `+${gGain} Or`, '#ffd152', 18);
  updateHudNumbers(); updateClickerDom();
}

function updateClickerDom() {
  const c = document.getElementById('clk-combo'); if (c) c.textContent = `Combo x${UI.combo}`;
  const f = document.getElementById('clk-fever-fill'); if (f) f.style.width = (UI.isFever ? 100 : UI.fever) + '%';
  const t = document.getElementById('clk-total'); if (t) t.textContent = G.progress.totalClicks.toLocaleString('fr-FR');
  const fl = document.getElementById('clk-fever-lbl'); if (fl) fl.textContent = UI.isFever ? '🔥 MODE FIÈVRE ACTIF (Or & XP x2) !' : `Jauge de Fièvre (${UI.fever}%)`;
}

function launchBattle(opp, isPvp=false) {
  if (G.energy <= 0) { toast('Plus d’énergie ! Monte de niveau pour recharger.', 'err'); return; }
  G.energy -= 1;
  const b = simulateBattle(opp, isPvp);
  if (UI.battleTimer) clearTimeout(UI.battleTimer);
  UI.battle = b; UI.battleIdx = 0; UI.battleDone = false; UI.battleLog = [];
  UI.battleHud = { lHp:b.left.d.maxHp, lMax:b.left.d.maxHp, lRage:15, rHp:b.right.d.maxHp, rMax:b.right.d.maxHp, rRage:15 };
  UI.leftAnim = 'idle'; UI.rightAnim = 'idle'; UI.leftT0 = performance.now(); UI.rightT0 = performance.now();
  UI.view = 'arena'; render(); stepBattle();
}

function stepBattle() {
  if (!UI.battle || UI.battleDone) return;
  const ev = UI.battle.events[UI.battleIdx];
  if (!ev) { finishBattle(); return; }
  const now = performance.now();
  UI.battleHud = { lHp:ev.leftHp, lMax:ev.leftMaxHp, lRage:ev.leftRage, rHp:ev.rightHp, rMax:ev.rightMaxHp, rRage:ev.rightRage };
  UI.battleLog.push(ev);
  if (ev.actor==='left') { UI.leftAnim = ev.aAnim; UI.leftT0 = now; UI.rightAnim = ev.tAnim; UI.rightT0 = now; }
  else { UI.rightAnim = ev.aAnim; UI.rightT0 = now; UI.leftAnim = ev.tAnim; UI.leftT0 = now; }

  if (['attack','heavy_attack','special','counter'].includes(ev.type)) {
    if (ev.actor==='left') { UI.leftOffX = 64; if (!ev.dodged) UI.rightFlash = 6; }
    else { UI.rightOffX = -64; if (!ev.dodged) UI.leftFlash = 6; }
    UI.shake = ev.type==='special'||ev.isCrit ? 12 : (ev.type==='heavy_attack'?8:4);
    SFX.play(ev.type==='special'?'special':ev.isCrit?'crit':ev.dodged?'dodge':ev.blocked?'block':ev.type==='heavy_attack'?'heavy':'hit');
    const rx = ev.target==='right' ? 0.72 : 0.28;
    if (!ev.dodged) spawnBurst(rx, 0.56, ev.isCrit||ev.type==='special'?12:6, ev.type==='special'?'#f97316':'#fde047');
    if (ev.dodged) addFloat(rx, 0.40, 'ESQUIVE !', '#38bdf8', 24);
    else if (ev.blocked) addFloat(rx, 0.40, `BLOCAGE -${ev.dmg}`, '#cbd5e1', 21);
    else addFloat(rx, 0.38, ev.isCrit?`CRIT -${ev.dmg}!`:`-${ev.dmg}`, ev.isCrit?'#fde047':'#ff784f', ev.isCrit?30:23);
    if (ev.heal > 0) addFloat(ev.actor==='left'?0.28:0.72, 0.32, `+${ev.heal} PV`, '#4ade80', 19);
  }
  updateBattleDom();
  UI.battleIdx += 1;
  if (ev.type === 'victory') { finishBattle(); return; }
  UI.battleTimer = setTimeout(stepBattle, (ev.type==='battle_start'?680:780)/(G.settings.speed||1));
}

function finishBattle() {
  if (!UI.battle || UI.battleDone) return;
  UI.battleDone = true; if (UI.battleTimer) clearTimeout(UI.battleTimer);
  const last = UI.battle.events[UI.battle.events.length - 1];
  const now = performance.now();
  if (last) {
    UI.battleHud = { lHp:last.leftHp, lMax:last.leftMaxHp, lRage:last.leftRage, rHp:last.rightHp, rMax:last.rightMaxHp, rRage:last.rightRage };
    UI.battleLog = UI.battle.events.slice();
    UI.leftAnim = UI.battle.winner==='left'?'victory':'defeat'; UI.leftT0 = now;
    UI.rightAnim = UI.battle.winner==='right'?'victory':'defeat'; UI.rightT0 = now;
  }
  SFX.play(UI.battle.winner==='left'?'win':'lose');
  render();
}

function updateBattleDom() {
  const h = UI.battleHud; if (!h) return;
  const setW = (id, pct) => { const e=document.getElementById(id); if(e) e.style.width = Math.max(0,Math.min(100,pct))+'%'; };
  const setT = (id, txt) => { const e=document.getElementById(id); if(e) e.textContent = txt; };
  setW('b-lhp', (h.lHp/Math.max(1,h.lMax))*100); setT('b-lhp-t', `${h.lHp}/${h.lMax} PV`);
  setW('b-rhp', (h.rHp/Math.max(1,h.rMax))*100); setT('b-rhp-t', `${h.rHp}/${h.rMax} PV`);
  setW('b-lr', h.lRage); setW('b-rr', h.rRage);
  const log = document.getElementById('b-log');
  if (log) {
    log.innerHTML = UI.battleLog.map(e => `<div class="log-line ${e.isCrit?'crit':e.type==='special'?'spec':e.type==='victory'?'win':''}">${e.log}</div>`).join('');
    log.scrollTop = log.scrollHeight;
  }
}

function getShopStock() {
  const seed = G.shopSeed || 1, out = [];
  for (let i=0; i<6; i++) {
    const it = EQUIPMENT_CATALOG[(seed*5 + i*3) % EQUIPMENT_CATALOG.length];
    out.push({ stockId:`${seed}_${i}`, item:it, sold:G.shopSold.includes(`${seed}_${i}`) });
  }
  return out;
}

const NAV_ITEMS = [
  { id:'home', ico:'🏠', label:'Accueil' }, { id:'arena', ico:'⚔️', label:'Arène' },
  { id:'clicker', ico:'👊', label:'Clicker Dojo' }, { id:'inventory', ico:'🎒', label:'Inventaire' },
  { id:'profile', ico:'🥋', label:'Profil' }, { id:'shop', ico:'🛒', label:'Boutique' },
  { id:'skills', ico:'✨', label:'Compétences' }, { id:'upgrades', ico:'📈', label:'Améliorations' },
  { id:'leaderboard', ico:'🏆', label:'Classements' }, { id:'missions', ico:'🎯', label:'Missions' },
  { id:'settings', ico:'⚙️', label:'Paramètres' },
];

function rarityPill(r) {
  const m = RARITY[r] || RARITY.common;
  return `<span class="pill" style="background:${m.bg};color:${m.color}">${m.label}</span>`;
}

function itemStatsTags(it) {
  const m = itemForgeMult(it), tags = [];
  if (it.bonusAtk) tags.push(`<span class="tag">⚔️ +${Math.round(it.bonusAtk*m)} ATQ</span>`);
  if (it.bonusHp) tags.push(`<span class="tag">❤️ +${Math.round(it.bonusHp*m)} PV</span>`);
  for (const [k,l] of [['str','FOR'],['def','DEF'],['agi','AGI'],['vit','VIT'],['lck','CHA']]) {
    if (it.stats && it.stats[k]) tags.push(`<span class="tag">+${Math.round(it.stats[k]*m)} ${l}</span>`);
  }
  if (it.fx) tags.push(`<span class="tag" style="background:#fff3d6;border-color:#d97706;color:#92400e">✨ ${it.fx.label}</span>`);
  return tags.join(' ');
}

function renderView() {
  const d = computeDerived(G.baseStats, G.level, G.eq, G.skills);
  const cm = clickMetrics();
  const st = getHeroStyle();

  if (UI.view === 'home') {
    return `
      <div class="col">
        <div class="between">
          <div>
            <h1 style="font-size:24px">🏠 Quartier Général — ${G.name}</h1>
            <div style="color:#766456;font-weight:700">${G.title} • Puissance ${d.power} • ${G.rating} Elo</div>
          </div>
          <div class="row">
            ${['dojo','coliseum','volcano'].map(a=>`<button class="btn btn-sm ${G.homeArena===a?'btn-primary':''}" onclick="act('homeArena','${a}')">${a==='dojo'?'🌸 Dojo':a==='coliseum'?'🏟️ Colisée':'🌋 Volcan'}</button>`).join('')}
          </div>
        </div>
        <div class="grid-2">
          <div class="col">
            <div class="stage-wrap"><canvas id="game-canvas" class="stage-canvas" data-mode="showcase"></canvas></div>
            <div class="row">
              <button class="btn btn-primary btn-lg" style="flex:1" onclick="go('arena')">⚔️ Combattre en Arène</button>
              <button class="btn btn-gold btn-lg" style="flex:1" onclick="go('clicker')">👊 Entraînement Clicker</button>
            </div>
          </div>
          <div class="col">
            <div class="card col">
              <h3>📊 Statistiques du Combattant</h3>
              <div class="row">
                <span class="tag">❤️ ${d.maxHp} PV</span>
                <span class="tag">⚔️ ${d.minDmg}–${d.maxDmg} Dégâts</span>
                <span class="tag">🛡️ ${d.defense} Défense</span>
                <span class="tag">💥 ${Math.round(d.crit*100)}% Crit</span>
                <span class="tag">💨 ${Math.round(d.dodge*100)}% Esquive</span>
                <span class="tag">⚙️ ${cm.autoGold} Or/sec</span>
              </div>
              ${G.statPoints > 0 ? `<button class="btn btn-jade" onclick="go('profile')">⬆️ ${G.statPoints} points de stats à répartir !</button>` : ''}
              ${canClaimDaily() ? `<button class="btn btn-gold" onclick="go('missions')">🎁 Récompense quotidienne prête !</button>` : ''}
            </div>
            <div class="card card-warm col">
              <h3>⚡ Accès Rapides</h3>
              <div class="row">
                <button class="btn btn-sm btn-sky" onclick="go('inventory')">🎒 Inventaire (${G.inv.length})</button>
                <button class="btn btn-sm btn-gold" onclick="go('shop')">🛒 Boutique & Coffres</button>
                <button class="btn btn-sm" onclick="go('skills')">✨ Compétences</button>
                <button class="btn btn-sm" onclick="go('leaderboard')">🏆 PvP Classement</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  if (UI.view === 'profile') {
    return `
      <div class="col">
        <div class="between">
          <div><h1 style="font-size:24px">🥋 Profil & 11 Animations IA</h1><div style="color:#766456;font-weight:700">Teste les 11 animations chibi générées par IA, répartis tes stats et choisis ton style</div></div>
          <span class="pill" style="background:#ffd152">Points dispo : ${G.statPoints}</span>
        </div>
        <div class="grid-2">
          <div class="col">
            <div class="stage-wrap"><canvas id="game-canvas" class="stage-canvas" data-mode="showcase"></canvas></div>
            <div class="card col">
              <h4>🎬 Testeur des 11 animations IA</h4>
              <div class="row">${ALL_ANIMS.map(a => `<button class="btn btn-sm ${UI.previewAnim===a?'btn-primary':''}" onclick="act('preview','${a}')">${ANIM_SPECS[a].label}</button>`).join('')}</div>
            </div>
          </div>
          <div class="col">
            <div class="card col">
              <h3>💪 Statistiques (${G.statPoints} pts)</h3>
              ${[['str','Force','Dégâts & Clic'],['def','Défense','Armure & Blocage'],['agi','Agilité','Vitesse & Esquive'],['vit','Vitalité','PV Max'],['lck','Chance','Critiques & Or']].map(([k,n,desc])=>`
                <div class="between" style="padding:7px 10px;border:2px solid #231917;border-radius:11px;background:#fdf8ec">
                  <div><strong>${n}</strong> <small style="color:#766456">(${desc})</small></div>
                  <div class="row"><strong style="font-size:16px">${d.totalStats[k]}</strong><button class="btn btn-sm btn-jade" ${G.statPoints<1?'disabled':''} onclick="act('stat','${k}')">+1</button></div>
                </div>`).join('')}
            </div>
            <div class="card col">
              <h3>🎨 Style & Identité</h3>
              <input class="input" value="${G.name}" onchange="act('rename',this.value)" placeholder="Nom du combattant" />
              <div class="row">${HERO_STYLES.map(s=>`<button class="btn btn-sm ${G.styleId===s.id?'btn-primary':''}" onclick="act('style','${s.id}')">${s.label}</button>`).join('')}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  if (UI.view === 'arena') {
    if (UI.battle) {
      const b = UI.battle, h = UI.battleHud;
      return `
        <div class="col">
          <div class="between">
            <h1 style="font-size:22px">⚔️ Combat en Arène (${b.arena.toUpperCase()})</h1>
            <div class="row">
              <button class="btn btn-sm btn-gold" onclick="act('toggleSpeed')">Vitesse ${G.settings.speed}x</button>
              ${!UI.battleDone ? `<button class="btn btn-sm btn-sky" onclick="act('skipBattle')">⏭️ Passer</button>` : `<button class="btn btn-sm btn-primary" onclick="act('exitBattle')">⬅️ Retour Arène</button>`}
            </div>
          </div>
          <div class="card" style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">
            <div>
              <div class="between"><strong>${b.left.name}</strong><small id="b-lhp-t" style="font-weight:800">${h.lHp}/${h.lMax} PV</small></div>
              <div class="meter"><div id="b-lhp" class="meter-fill fill-hp-l" style="width:${(h.lHp/Math.max(1,h.lMax))*100}%"></div></div>
              <div class="meter" style="height:8px;margin-top:4px"><div id="b-lr" class="meter-fill fill-rage" style="width:${h.lRage}%"></div></div>
            </div>
            <div class="pill" style="background:#ffd152;padding:6px 10px">VS</div>
            <div>
              <div class="between"><small id="b-rhp-t" style="font-weight:800">${h.rHp}/${h.rMax} PV</small><strong>${b.right.name}</strong></div>
              <div class="meter"><div id="b-rhp" class="meter-fill fill-hp-r" style="width:${(h.rHp/Math.max(1,h.rMax))*100}%"></div></div>
              <div class="meter" style="height:8px;margin-top:4px"><div id="b-rr" class="meter-fill fill-rage" style="width:${h.rRage}%"></div></div>
            </div>
          </div>
          <div class="stage-wrap"><canvas id="game-canvas" class="stage-canvas" data-mode="arena"></canvas></div>
          ${UI.battleDone ? `
            <div class="card" style="background:${b.winner==='left'?'#e8fbf0':'#ffeaea'}">
              <div class="between">
                <div>
                  <h2 style="font-size:20px">${b.winner==='left'?'🏆 VICTOIRE !':'💀 DÉFAITE'}</h2>
                  <div class="row" style="margin-top:6px">
                    <span class="pill" style="background:#fff7dc">🪙 +${b.rewards.gold} Or</span>
                    <span class="pill" style="background:#e5f2ff">⭐ +${b.rewards.xp} XP</span>
                    ${b.rewards.gems?`<span class="pill" style="background:#e6f6ff">💎 +${b.rewards.gems} Gemmes</span>`:''}
                    <span class="pill" style="background:#f4ead5">🏆 ${b.rewards.ratingDelta>=0?'+':''}${b.rewards.ratingDelta} Elo</span>
                  </div>
                  ${b.rewards.lootItem ? `<div class="row" style="margin-top:8px"><img class="sprite-icon" src="${getItemArt(b.rewards.lootItem)}" /><div><strong>🎁 Butin : ${b.rewards.lootItem.name}</strong> ${rarityPill(b.rewards.lootItem.rarity)}</div></div>` : ''}
                </div>
                <button class="btn btn-primary" onclick="act('exitBattle')">Continuer</button>
              </div>
            </div>` : ''}
          <div class="card">
            <h4 style="margin-bottom:8px">📜 Journal de Combat</h4>
            <div id="b-log" class="battle-log">${UI.battleLog.map(e=>`<div class="log-line ${e.isCrit?'crit':e.type==='special'?'spec':e.type==='victory'?'win':''}">${e.log}</div>`).join('')}</div>
          </div>
        </div>`;
    }
    return `
      <div class="col">
        <div class="between">
          <div><h1 style="font-size:24px">⚔️ Arène des Champions</h1><div style="color:#766456;font-weight:700">Choisis un adversaire ou un Boss (coût : 1 ⚡ Énergie)</div></div>
          <span class="chip chip-en">⚡ ${G.energy}/${G.maxEnergy}</span>
        </div>
        <div class="grid-cards">
          ${OPPONENTS.map(o => {
            const od = computeDerived(o.stats, o.lvl, o.eq, {});
            return `
              <div class="card col" style="${o.boss?'background:#fff6e5':''}">
                <div class="row" style="flex-wrap:nowrap">
                  <img class="sprite-avatar" src="${AI_ASSETS.rivals[o.sprite]}" alt="${o.name}" />
                  <div style="flex:1;min-width:0">
                    <div class="between"><strong>${o.name}</strong><span class="pill" style="background:${o.boss?'#ef5b36;color:#fff':'#ffd152'}">Niv.${o.lvl}</span></div>
                    <div style="font-size:12px;color:#766456;font-weight:700;margin-top:2px">${o.title}</div>
                    <div class="row" style="margin-top:6px"><span class="tag">⚡ ${od.power}</span><span class="tag">🪙 ${o.gold}</span><span class="tag">⭐ ${o.xp}</span></div>
                  </div>
                </div>
                <button class="btn ${o.boss?'btn-danger':'btn-primary'}" onclick="act('fightOpp','${o.id}')">⚔️ COMBATTRE !</button>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'clicker') {
    const quickUps = UPGRADES_CATALOG.filter(u => u.cat==='click'||u.cat==='auto').slice(0,4);
    return `
      <div class="col">
        <div class="between">
          <div><h1 style="font-size:24px">👊 Dojo d’Entraînement Clicker</h1><div style="color:#766456;font-weight:700">Frappe le mannequin IA pour déclencher la Fièvre x2 !</div></div>
          <span class="pill" style="background:#fff3d6">Frappes : <span id="clk-total">${G.progress.totalClicks.toLocaleString('fr-FR')}</span></span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">
          <div class="card" style="padding:9px 11px"><small style="color:#766456;font-weight:800">OR / CLIC</small><div style="font-size:17px;font-weight:900">🪙 +${cm.goldPerClick}</div></div>
          <div class="card" style="padding:9px 11px"><small style="color:#766456;font-weight:800">XP / CLIC</small><div style="font-size:17px;font-weight:900">⭐ +${cm.xpPerClick}</div></div>
          <div class="card" style="padding:9px 11px"><small style="color:#766456;font-weight:800">AUTO OR/SEC</small><div style="font-size:17px;font-weight:900">⚙️ ${cm.autoGold}/s</div></div>
          <div class="card" style="padding:9px 11px"><small style="color:#766456;font-weight:800">CRITIQUE</small><div style="font-size:17px;font-weight:900">💥 ${Math.round(cm.clickCrit*100)}%</div></div>
        </div>
        <div class="card col" style="padding:11px 14px">
          <div class="between">
            <strong id="clk-fever-lbl">${UI.isFever?'🔥 MODE FIÈVRE ACTIF (Or & XP x2) !':`Jauge de Fièvre (${UI.fever}%)`}</strong>
            <span id="clk-combo" class="pill" style="background:#ffd152">Combo x${UI.combo}</span>
          </div>
          <div class="meter"><div id="clk-fever-fill" class="meter-fill fill-fever" style="width:${UI.isFever?100:UI.fever}%"></div></div>
        </div>
        <div class="stage-wrap" style="cursor:pointer" onclick="doClickerStrike()">
          <canvas id="game-canvas" class="stage-canvas" data-mode="clicker"></canvas>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%;min-height:58px;font-size:18px" onclick="doClickerStrike()">👊 FRAPPER LE MANNEQUIN ! (+${cm.goldPerClick} Or)</button>
        <div class="card col">
          <div class="between"><h3>⚙️ Améliorations Rapides</h3><button class="btn btn-sm btn-sky" onclick="go('upgrades')">Tout voir</button></div>
          <div class="grid-cards">
            ${quickUps.map(u => {
              const lv = G.upgrades[u.id]||0, cost = Math.round(u.baseCost*Math.pow(u.mult, lv));
              return `<div class="card card-warm col" style="padding:10px">
                <div class="between"><strong>${u.ico} ${u.name}</strong><span class="pill" style="background:#fff">Niv.${lv}/${u.maxLvl}</span></div>
                <small style="color:#766456;font-weight:700">${u.label}</small>
                <button class="btn btn-sm btn-gold" ${G.gold<cost||lv>=u.maxLvl?'disabled':''} onclick="act('buyUp','${u.id}')">🪙 ${cost}</button>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }

  if (UI.view === 'inventory') {
    const list = G.inv.filter(it => UI.invFilter==='all' || it.slot===UI.invFilter);
    return `
      <div class="col">
        <div class="between"><h1 style="font-size:24px">🎒 Inventaire & Forge</h1><span class="pill" style="background:#fff">${G.inv.length} objets</span></div>
        <div class="grid-2">
          <div class="stage-wrap"><canvas id="game-canvas" class="stage-canvas" data-mode="showcase"></canvas></div>
          <div class="card col">
            <h3>🛡️ Équipement Porté (arme visible en main !)</h3>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
              ${Object.entries(SLOTS).map(([sl,meta])=>{
                const it = G.eq[sl];
                return `<div style="border:2px solid #231917;border-radius:12px;padding:8px;background:#fdf8ec">
                  <div style="font-size:11px;font-weight:900;color:#766456;text-transform:uppercase">${meta.label}</div>
                  ${it ? `<div class="row" style="flex-wrap:nowrap;margin:4px 0">
                      <img class="sprite-icon" style="width:42px;height:42px" src="${getItemArt(it)}" />
                      <div style="min-width:0"><div style="font-weight:800;font-size:12.5px">${it.name}${it.upg?` +${it.upg}`:''}</div>${rarityPill(it.rarity)}</div>
                    </div>
                    <div class="row">
                      <button class="btn btn-sm btn-gold" ${it.upg>=10||G.gold<itemForgeCost(it)?'disabled':''} onclick="act('forge','${it.uid}')">🔨 +1 (${itemForgeCost(it)})</button>
                      <button class="btn btn-sm" onclick="act('unequip','${sl}')">Retirer</button>
                    </div>` : `<div style="color:#9ca3af;font-weight:700;padding:12px 0">Vide</div>`}
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="row">
          <button class="btn btn-sm ${UI.invFilter==='all'?'btn-primary':''}" onclick="act('invF','all')">Tout (${G.inv.length})</button>
          ${Object.entries(SLOTS).map(([sl,m])=>`<button class="btn btn-sm ${UI.invFilter===sl?'btn-primary':''}" onclick="act('invF','${sl}')">${m.label}</button>`).join('')}
        </div>
        <div class="grid-cards">
          ${list.length===0 ? `<div class="card">Aucun objet dans cette catégorie. Ouvre un coffre ou combats en Arène !</div>` : list.map(it=>`
            <div class="card col" style="padding:12px">
              <div class="row" style="flex-wrap:nowrap">
                <img class="sprite-icon" src="${getItemArt(it)}" />
                <div style="flex:1;min-width:0">
                  <div class="between"><strong>${it.name}${it.upg?` +${it.upg}`:''}</strong>${rarityPill(it.rarity)}</div>
                  <div class="row" style="margin-top:5px">${itemStatsTags(it)}</div>
                </div>
              </div>
              <div class="row">
                <button class="btn btn-sm btn-jade" onclick="act('equip','${it.uid}')">Équiper</button>
                <button class="btn btn-sm btn-gold" ${it.upg>=10||G.gold<itemForgeCost(it)?'disabled':''} onclick="act('forge','${it.uid}')">🔨 Forger (${itemForgeCost(it)})</button>
                <button class="btn btn-sm btn-danger" onclick="act('sell','${it.uid}')">Vendre +${itemSellPrice(it)}</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'shop') {
    const stock = getShopStock();
    return `
      <div class="col">
        <div class="between">
          <div><h1 style="font-size:24px">🛒 Boutique & Coffres Mystère</h1><div style="color:#766456;font-weight:700">Débloque des armes et équipements illustrés rares & mythiques</div></div>
          <button class="btn btn-sm btn-sky" ${G.gold<60?'disabled':''} onclick="act('refreshShop')">🔄 Actualiser (60 Or)</button>
        </div>
        ${UI.chestReveal ? `<div class="card" style="background:#fff6d6"><div class="between">
          <div class="row"><img class="sprite-icon" style="width:64px;height:64px" src="${getItemArt(UI.chestReveal)}" /><div><strong>🎉 Coffre ouvert : ${UI.chestReveal.name} !</strong> ${rarityPill(UI.chestReveal.rarity)}<div class="row" style="margin-top:4px">${itemStatsTags(UI.chestReveal)}</div></div></div>
          <button class="btn btn-sm btn-jade" onclick="act('equip','${UI.chestReveal.uid}')">Équiper direct !</button>
        </div></div>`:''}
        <div class="grid-cards">
          ${CHESTS.map(c=>`
            <div class="card card-warm col" style="text-align:center">
              <img class="chest-art" src="${AI_ASSETS.chests[c.art]}" alt="${c.name}" />
              <h3>${c.name}</h3>
              <div style="font-size:12.5px;color:#766456;font-weight:700">${c.desc}</div>
              <button class="btn ${c.gems?'btn-sky':'btn-gold'}" ${(c.gold&&G.gold<c.gold)||(c.gems&&G.gems<c.gems)?'disabled':''} onclick="act('openChest','${c.id}')">Ouvrir (${c.gems?`💎 ${c.gems}`:`🪙 ${c.gold}`})</button>
            </div>`).join('')}
        </div>
        <h3>📦 Stock du Jour</h3>
        <div class="grid-cards">
          ${stock.map(s=>`
            <div class="card col">
              <div class="row" style="flex-wrap:nowrap">
                <img class="sprite-icon" src="${getItemArt(s.item)}" />
                <div style="flex:1;min-width:0">
                  <div class="between"><strong>${s.item.name}</strong>${rarityPill(s.item.rarity)}</div>
                  <div class="row" style="margin-top:4px">${itemStatsTags(s.item)}</div>
                </div>
              </div>
              <button class="btn btn-sm btn-primary" ${s.sold||G.gold<s.item.price?'disabled':''} onclick="act('buyShop','${s.stockId}')">${s.sold?'✅ Acheté':`Acheter (🪙 ${s.item.price})`}</button>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'skills') {
    return `
      <div class="col">
        <h1 style="font-size:24px">✨ Compétences Actives & Passives</h1>
        <div class="card card-warm">
          <strong>Loadout Actif (${G.eqSkills.length}/3 emplacements) :</strong>
          <div class="row" style="margin-top:6px">
            ${G.eqSkills.length ? G.eqSkills.map(id=>{ const sk=SKILLS_CATALOG.find(x=>x.id===id); return `<span class="pill" style="background:#ffd152">${sk.ico} ${sk.name} (Niv.${G.skills[id]})</span>`; }).join('') : '<span style="color:#766456;font-weight:700">Débloque une compétence active ci-dessous !</span>'}
          </div>
        </div>
        <div class="grid-cards">
          ${SKILLS_CATALOG.map(sk=>{
            const lv = G.skills[sk.id]||0, cost = Math.round(sk.baseCost * Math.pow(1.65, lv));
            const locked = G.level < sk.reqLvl, equipped = G.eqSkills.includes(sk.id);
            return `<div class="card col">
              <div class="between"><strong>${sk.ico} ${sk.name}</strong><span class="pill" style="background:${sk.cat==='active'?'#ffe4e6':'#e5f2ff'}">${sk.cat==='active'?'Active':'Passive'} • Niv.${lv}/${sk.maxLvl}</span></div>
              <div style="font-size:12.5px;color:#766456;font-weight:700">${sk.desc}</div>
              <div class="row">
                <button class="btn btn-sm btn-gold" ${locked||lv>=sk.maxLvl||G.gold<cost?'disabled':''} onclick="act('upSkill','${sk.id}')">${locked?`🔒 Niv.${sk.reqLvl}`:lv>=sk.maxLvl?'MAX':`${lv===0?'Débloquer':'Améliorer'} (🪙 ${cost})`}</button>
                ${sk.cat==='active'&&lv>0 ? `<button class="btn btn-sm ${equipped?'btn-danger':'btn-jade'}" onclick="act('eqSkill','${sk.id}')">${equipped?'Retirer':'Équiper'}</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'upgrades') {
    const list = UPGRADES_CATALOG.filter(u => UI.upFilter==='all' || u.cat===UI.upFilter);
    return `
      <div class="col">
        <h1 style="font-size:24px">📈 Améliorations Permanentes</h1>
        <div class="row">
          ${[['all','Toutes'],['click','👊 Clicker'],['auto','⚙️ Auto / Idle'],['dojo','🏆 Dojo']].map(([id,l])=>`<button class="btn btn-sm ${UI.upFilter===id?'btn-primary':''}" onclick="act('upF','${id}')">${l}</button>`).join('')}
        </div>
        <div class="grid-cards">
          ${list.map(u=>{
            const lv = G.upgrades[u.id]||0, cost = Math.round(u.baseCost*Math.pow(u.mult,lv));
            return `<div class="card col">
              <div class="between"><strong>${u.ico} ${u.name}</strong><span class="pill" style="background:#fff3d6">Niv.${lv}/${u.maxLvl}</span></div>
              <div style="font-size:12.5px;color:#766456;font-weight:700">${u.desc}</div>
              <span class="tag">${u.label} (Actuel : +${lv*u.perLvl})</span>
              <button class="btn btn-sm btn-gold" ${lv>=u.maxLvl||G.gold<cost?'disabled':''} onclick="act('buyUp','${u.id}')">${lv>=u.maxLvl?'MAX':`Améliorer (🪙 ${cost})`}</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'leaderboard') {
    const rows = [
      ...RIVALS.map(r => ({ ...r, isMe:false, power: computeDerived(r.stats, r.lvl, r.eq, {}).power, avatar: AI_ASSETS.rivals[r.sprite] })),
      { id:'me', name:G.name, title:G.title, lvl:G.level, rating:G.rating, wins:G.progress.arenaWins, losses:G.progress.arenaLosses, isMe:true, power:d.power, avatar: AI_ASSETS.hero.idle },
    ].sort((a,b)=>b.rating-a.rating);
    return `
      <div class="col">
        <div class="between"><h1 style="font-size:24px">🏆 Classement & Défis PvP</h1><span class="pill" style="background:#ffd152">Ton Elo : ${G.rating}</span></div>
        <div class="col">
          ${rows.map((r,idx)=>`
            <div class="card between" style="${r.isMe?'background:#fff7dc':''}">
              <div class="row">
                <div class="pill" style="width:34px;height:34px;justify-content:center;background:${idx===0?'#ffd152':idx===1?'#e2e8f0':idx===2?'#f3b584':'#fdf8ec'}">#${idx+1}</div>
                <img class="sprite-avatar" style="width:52px;height:52px;filter:${r.isMe?st.filter:'none'}" src="${r.avatar}" />
                <div>
                  <strong>${r.name} ${r.isMe?'(Toi)':''}</strong>
                  <div style="font-size:12px;color:#766456;font-weight:700">Niv.${r.lvl} • ${r.rating} Elo • ⚡ ${r.power} • ${r.wins}V / ${r.losses}D</div>
                </div>
              </div>
              ${!r.isMe ? `<button class="btn btn-sm btn-primary" onclick="act('fightPvp','${r.id}')">⚔️ Défier (PvP)</button>` : `<span class="pill" style="background:#e8fbf0">Ton Combattant</span>`}
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (UI.view === 'missions') {
    const nextDay = (G.dailyStreak % 7) + 1, ready = canClaimDaily();
    return `
      <div class="col">
        <h1 style="font-size:24px">🎯 Missions, Succès & Quotidien</h1>
        <div class="row">
          <button class="btn btn-sm ${UI.missionTab==='daily'?'btn-primary':''}" onclick="act('mTab','daily')">🎁 Quotidien ${ready?'(1)':''}</button>
          <button class="btn btn-sm ${UI.missionTab==='mission'?'btn-primary':''}" onclick="act('mTab','mission')">📜 Missions</button>
          <button class="btn btn-sm ${UI.missionTab==='achievement'?'btn-primary':''}" onclick="act('mTab','achievement')">🏅 Succès</button>
        </div>
        ${UI.missionTab==='daily' ? `
          <div class="card col">
            <div class="between"><h3>📅 Calendrier 7 Jours (Série : ${G.dailyStreak})</h3>
              <button class="btn btn-gold" ${!ready?'disabled':''} onclick="act('claimDaily')">${ready?`🎁 Réclamer Jour ${nextDay}`:'✅ Déjà réclamé aujourd’hui'}</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:9px">
              ${DAILY_REWARDS.map(dr=>{
                const claimed = dr.day <= (G.dailyStreak % 7), isToday = ready && dr.day === nextDay;
                return `<div class="card" style="text-align:center;padding:10px;background:${claimed?'#e8fbf0':isToday?'#fff5cc':'#fff'}">
                  <div style="font-size:24px">${dr.ico}</div><strong>${dr.title}</strong>
                  <div style="font-size:11.5px;font-weight:800">🪙${dr.gold} 💎${dr.gems}${dr.chest?`<br>🎁 ${RARITY[dr.chest].label}`:''}</div>
                </div>`;
              }).join('')}
            </div>
          </div>` : `
          <div class="grid-cards">
            ${MISSIONS_CATALOG.filter(m=>m.type===UI.missionTab).map(m=>{
              const cur = getMissionVal(m), done = cur >= m.target, claimed = G.claimedMissions.includes(m.id);
              return `<div class="card col">
                <div class="between"><strong>${m.ico} ${m.title}</strong><span class="pill" style="background:${claimed?'#e8fbf0':done?'#ffd152':'#f0efe9'}">${Math.min(cur,m.target)}/${m.target}</span></div>
                <div class="meter"><div class="meter-fill fill-xp" style="width:${Math.min(100,Math.round((cur/m.target)*100))}%"></div></div>
                <div class="between"><small style="font-weight:800">🪙${m.gold} • 💎${m.gems} • ⭐${m.xp}</small><button class="btn btn-sm ${done&&!claimed?'btn-jade':''}" ${!done||claimed?'disabled':''} onclick="act('claimMis','${m.id}')">${claimed?'✅ Pris':'Réclamer'}</button></div>
              </div>`;
            }).join('')}
          </div>`}
      </div>`;
  }

  return `
    <div class="col">
      <h1 style="font-size:24px">⚙️ Paramètres & Sauvegarde</h1>
      <div class="grid-cards">
        <div class="card col">
          <h3>🔊 Audio & Vitesse</h3>
          <div class="between"><span>Effets sonores (Web Audio)</span><button class="btn btn-sm ${G.settings.sound?'btn-jade':''}" onclick="act('toggleSound')">${G.settings.sound?'Activé':'Coupé'}</button></div>
          <div class="between"><span>Vitesse de combat</span><button class="btn btn-sm btn-gold" onclick="act('toggleSpeed')">${G.settings.speed}x</button></div>
          <button class="btn btn-sm btn-sky" onclick="SFX.play('win')">🎵 Tester le son</button>
        </div>
        <div class="card col">
          <h3>💾 Sauvegarde Locale</h3>
          <div style="font-size:12.5px;color:#766456;font-weight:700">Progression persistante automatique dans localStorage.</div>
          <div class="row">
            <button class="btn btn-sm btn-sky" onclick="act('exportSave')">📤 Copier JSON</button>
            <button class="btn btn-sm btn-danger" onclick="act('resetSave')">🗑️ Réinitialiser</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCreatorModal() {
  if (!UI.showCreator) return '';
  return `
    <div class="modal-bg">
      <div class="modal-box col">
        <div class="between">
          <h2>⚔️ Crée ton Combattant Chibi !</h2>
          <button class="btn btn-sm btn-gold" onclick="act('randChar')">🎲 Aléatoire</button>
        </div>
        <div class="grid-2">
          <div class="stage-wrap"><canvas id="game-canvas" class="stage-canvas" style="height:250px" data-mode="showcase"></canvas></div>
          <div class="col">
            <label style="font-weight:800;font-size:12.5px">Nom du combattant</label>
            <input class="input" value="${G.name}" oninput="G.name=this.value" placeholder="Nom de ton héros..." />
            <label style="font-weight:800;font-size:12.5px">Style visuel du combattant IA</label>
            <div class="row">${HERO_STYLES.map(s=>`<button class="btn btn-sm ${G.styleId===s.id?'btn-primary':''}" onclick="act('style','${s.id}')">${s.label}</button>`).join('')}</div>
            <label style="font-weight:800;font-size:12.5px">Tester une pose</label>
            <div class="row">${['idle','attack','heavy_attack','victory','special'].map(a=>`<button class="btn btn-sm" onclick="act('preview','${a}')">${ANIM_SPECS[a].label}</button>`).join('')}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="act('finishCreator')">🔥 Entrer dans l’Arène !</button>
      </div>
    </div>`;
}

function renderDrawer() {
  if (!UI.drawer) return '';
  return `
    <div class="modal-bg" style="align-items:flex-end;padding:0" onclick="if(event.target===this){UI.drawer=false;render();}">
      <div class="modal-box" style="border-radius:22px 22px 0 0;max-width:540px">
        <div class="between" style="margin-bottom:12px"><h3>Menu Complet</h3><button class="btn btn-sm" onclick="UI.drawer=false;render()">✕</button></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${NAV_ITEMS.filter(n=>!['home','arena','clicker','inventory'].includes(n.id)).map(n=>`<button class="btn ${UI.view===n.id?'btn-primary':''}" onclick="go('${n.id}')">${n.ico} ${n.label}</button>`).join('')}
        </div>
      </div>
    </div>`;
}

function render() {
  const mCount = claimableCount();
  const xpPct = Math.min(100, Math.round((G.xp / Math.max(1, G.xpToNext)) * 100));
  document.getElementById('app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <img class="brand-img" src="${AI_ASSETS.hero.idle}" alt="Brute Legends" />
          <div><div class="disp" style="font-size:16px">Brute Legends</div><div style="font-size:10px;font-weight:900;color:#5e3824">SPRITES CHIBI IA</div></div>
        </div>
        ${NAV_ITEMS.map(n=>`
          <button class="nav-btn ${UI.view===n.id?'active':''}" onclick="go('${n.id}')">
            <span>${n.ico}</span><span>${n.label}</span>
            ${n.id==='profile'&&G.statPoints>0?`<span class="nav-badge">+${G.statPoints}</span>`:''}
            ${n.id==='missions'&&mCount>0?`<span class="nav-badge">${mCount}</span>`:''}
          </button>`).join('')}
      </aside>
      <div class="main">
        <header class="hud">
          <div class="hud-id" onclick="go('profile')">
            <div class="lvl-pill"><small>NIV</small><strong id="hud-lvl">${G.level}</strong></div>
            <div>
              <div class="disp" style="font-size:14.5px">${G.name}</div>
              <div class="meter" style="width:110px;height:9px"><div id="hud-xp-fill" class="meter-fill fill-xp" style="width:${xpPct}%"></div></div>
            </div>
          </div>
          <div class="hud-res">
            <span class="chip chip-gold">🪙 <span id="hud-gold">${G.gold.toLocaleString('fr-FR')}</span></span>
            <span class="chip chip-gem">💎 ${G.gems}</span>
            <span class="chip chip-en hide-xs">⚡ ${G.energy}/${G.maxEnergy}</span>
          </div>
        </header>
        <main class="content">${renderView()}</main>
      </div>
    </div>
    <nav class="mobile-bar">
      ${[['home','🏠','Accueil'],['arena','⚔️','Arène'],['clicker','👊','Clicker'],['inventory','🎒','Sac']].map(([id,ico,lbl])=>`
        <button class="m-btn ${UI.view===id?'active':''}" onclick="go('${id}')"><span style="font-size:18px">${ico}</span><span>${lbl}</span></button>`).join('')}
      <button class="m-btn ${UI.drawer?'active':''}" onclick="UI.drawer=!UI.drawer;render()"><span style="font-size:18px">☰</span><span>Plus</span></button>
    </nav>
    <div id="toast-box" class="toasts"></div>
    ${renderCreatorModal()}
    ${renderDrawer()}
  `;
  renderToasts();
}

window.go = (v) => { SFX.play('click'); UI.view = v; UI.drawer = false; if (v!=='arena'&&UI.battleDone) UI.battle=null; render(); };

window.act = (type, arg) => {
  if (type==='homeArena') { G.homeArena = arg; saveGame(); render(); }
  else if (type==='preview') { UI.previewAnim = arg; UI.previewT0 = performance.now(); SFX.play(arg==='special'?'special':arg==='attack'||arg==='heavy_attack'?'hit':'click'); render(); }
  else if (type==='stat') { if (G.statPoints>0){ G.statPoints--; G.baseStats[arg]++; SFX.play('click'); saveGame(); render(); } }
  else if (type==='rename') { const v=(arg||'').trim().slice(0,18); if (v.length>=2){ G.name=v; saveGame(); render(); } }
  else if (type==='style') { G.styleId = arg; SFX.play('click'); saveGame(); render(); }
  else if (type==='randChar') {
    const r = a => a[Math.floor(Math.random()*a.length)];
    G.name = r(['Kuro','Mochi','Banzai','Tora','Piko','Neko','Riku','Kenji']) + Math.floor(10+Math.random()*89);
    G.styleId = r(HERO_STYLES).id; UI.previewAnim = 'victory'; UI.previewT0 = performance.now(); SFX.play('win'); render();
  }
  else if (type==='finishCreator') { G.isCustomized = true; UI.showCreator = false; saveGame(); SFX.play('win'); toast(`Bienvenue dans l’arène, ${G.name} !`, 'ok'); render(); }
  else if (type==='fightOpp') { const o = OPPONENTS.find(x=>x.id===arg); if (o) launchBattle(o, false); }
  else if (type==='fightPvp') { const r = RIVALS.find(x=>x.id===arg); if (r) launchBattle({ ...r, arena:'coliseum', gold:140+r.lvl*25, xp:110+r.lvl*20, loot:0.45, minR:'rare' }, true); }
  else if (type==='skipBattle') finishBattle();
  else if (type==='exitBattle') { UI.battle = null; UI.battleDone = false; render(); }
  else if (type==='toggleSpeed') { G.settings.speed = G.settings.speed===1?2:1; saveGame(); render(); }
  else if (type==='invF') { UI.invFilter = arg; render(); }
  else if (type==='equip') {
    const idx = G.inv.findIndex(x=>x.uid===arg); if (idx<0) return;
    const it = G.inv.splice(idx,1)[0]; if (G.eq[it.slot]) G.inv.unshift(G.eq[it.slot]);
    G.eq[it.slot] = it; UI.chestReveal = null; SFX.play('click'); saveGame(); toast(`${it.name} équipé !`, 'ok'); render();
  }
  else if (type==='unequip') { const it = G.eq[arg]; if (!it) return; G.eq[arg]=null; G.inv.unshift(it); saveGame(); render(); }
  else if (type==='sell') {
    const idx = G.inv.findIndex(x=>x.uid===arg); if (idx<0) return;
    const it = G.inv.splice(idx,1)[0], val = itemSellPrice(it);
    G.gold += val; G.progress.totalGoldEarned += val; SFX.play('coin'); saveGame(); toast(`Vendu pour +${val} Or !`, 'gold'); render();
  }
  else if (type==='forge') {
    let it = G.inv.find(x=>x.uid===arg) || Object.values(G.eq).find(x=>x&&x.uid===arg);
    if (!it || it.upg>=10) return;
    const cost = itemForgeCost(it); if (G.gold < cost) return;
    G.gold -= cost; it.upg = (it.upg||0)+1; SFX.play('win'); saveGame(); toast(`🔨 ${it.name} forgé +${it.upg} !`, 'gold'); render();
  }
  else if (type==='refreshShop') { if (G.gold<60) return; G.gold-=60; G.shopSeed=(G.shopSeed||1)+1; G.shopSold=[]; saveGame(); toast('Boutique actualisée !','ok'); render(); }
  else if (type==='buyShop') {
    const s = getShopStock().find(x=>x.stockId===arg); if (!s||s.sold||G.gold<s.item.price) return;
    G.gold -= s.item.price; G.shopSold.push(s.stockId); G.inv.unshift(mkItem(s.item.tid));
    SFX.play('coin'); saveGame(); toast(`${s.item.name} acheté !`, 'gold'); render();
  }
  else if (type==='openChest') {
    const c = CHESTS.find(x=>x.id===arg); if (!c) return;
    if ((c.gold&&G.gold<c.gold)||(c.gems&&G.gems<c.gems)) return;
    G.gold -= c.gold; G.gems -= c.gems;
    const it = rollLoot(c.minRarity); G.inv.unshift(it); UI.chestReveal = it;
    SFX.play('win'); saveGame(); toast(`🎁 Obtenu : ${it.name} !`, 'gold'); render();
  }
  else if (type==='upSkill') {
    const sk = SKILLS_CATALOG.find(x=>x.id===arg); if (!sk) return;
    const lv = G.skills[sk.id]||0, cost = Math.round(sk.baseCost*Math.pow(1.65,lv));
    if (G.level<sk.reqLvl||lv>=sk.maxLvl||G.gold<cost) return;
    G.gold -= cost; G.skills[sk.id] = lv+1;
    if (sk.cat==='active'&&lv===0&&G.eqSkills.length<3&&!G.eqSkills.includes(sk.id)) G.eqSkills.push(sk.id);
    SFX.play('win'); saveGame(); toast(`✨ ${sk.name} Niv.${lv+1} !`, 'ok'); render();
  }
  else if (type==='eqSkill') {
    if (G.eqSkills.includes(arg)) G.eqSkills = G.eqSkills.filter(x=>x!==arg);
    else if (G.eqSkills.length<3) G.eqSkills.push(arg);
    else { toast('Maximum 3 compétences actives !','err'); return; }
    SFX.play('click'); saveGame(); render();
  }
  else if (type==='upF') { UI.upFilter = arg; render(); }
  else if (type==='buyUp') {
    const u = UPGRADES_CATALOG.find(x=>x.id===arg); if (!u) return;
    const lv = G.upgrades[u.id]||0, cost = Math.round(u.baseCost*Math.pow(u.mult,lv));
    if (lv>=u.maxLvl||G.gold<cost) return;
    G.gold -= cost; G.upgrades[u.id] = lv+1; G.progress.upgradesBought += 1;
    SFX.play('coin'); saveGame(); toast(`${u.ico} ${u.name} Niv.${lv+1} !`, 'gold'); render();
  }
  else if (type==='mTab') { UI.missionTab = arg; render(); }
  else if (type==='claimMis') {
    const m = MISSIONS_CATALOG.find(x=>x.id===arg); if (!m||G.claimedMissions.includes(m.id)||getMissionVal(m)<m.target) return;
    G.claimedMissions.push(m.id); G.gold+=m.gold; G.gems+=m.gems; G.progress.totalGoldEarned+=m.gold; gainXp(m.xp);
    SFX.play('win'); saveGame(); toast(`Récompense : +${m.gold} Or, +${m.gems} Gemmes !`, 'gold'); render();
  }
  else if (type==='claimDaily') {
    if (!canClaimDaily()) return;
    const nextDay = (G.dailyStreak%7)+1, dr = DAILY_REWARDS[nextDay-1];
    G.dailyStreak += 1; G.lastDailyDate = todayIso();
    G.gold += dr.gold; G.gems += dr.gems; G.progress.totalGoldEarned += dr.gold; gainXp(dr.xp);
    let extra = ''; if (dr.chest) { const it = rollLoot(dr.chest); G.inv.unshift(it); extra = ` + ${it.name} !`; }
    SFX.play('win'); saveGame(); toast(`🎁 Jour ${nextDay} réclamé ! +${dr.gold} Or, +${dr.gems} Gemmes${extra}`, 'gold'); render();
  }
  else if (type==='toggleSound') { G.settings.sound = !G.settings.sound; saveGame(); render(); }
  else if (type==='exportSave') { try { navigator.clipboard.writeText(JSON.stringify(G)); toast('Sauvegarde JSON copiée !','ok'); } catch { toast('Sauvegarde active en localStorage.','ok'); } }
  else if (type==='resetSave') { if (confirm('Réinitialiser ton combattant au niveau 1 ?')) { G = createFreshFighter(); UI.showCreator = true; UI.battle = null; saveGame(); render(); } }
};

render();
startCanvasLoop();
</script>
</body>
</html>
"""

def main():
    bundle_text = BUNDLE_PATH.read_text(encoding="utf-8")
    # Validate JSON
    json.loads(bundle_text)
    out = TEMPLATE.replace("__AI_BUNDLE_JSON__", bundle_text)
    ARTIFACT_PATH.write_text(out, encoding="utf-8")
    print(f"Built AI-powered standalone playable artifact: {ARTIFACT_PATH} ({len(out)/1024:.1f} KB)")

if __name__ == "__main__":
    main()
